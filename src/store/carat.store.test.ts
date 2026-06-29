import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPlannedBanner,
  createPlan,
  deletePlan,
  duplicatePlan,
  getActivePlan,
  migratePersisted,
  renamePlan,
  setActivePlan,
  setCaratSetting,
  setPlannedPulls,
  useCaratStore
} from '@/store/carat.store';

function resetStore() {
  // Re-seed a single fresh plan so each test starts from a known baseline.
  const id = createPlan('Plan 1');
  useCaratStore.setState((state) => ({
    plans: state.plans.filter((plan) => plan.id === id),
    activePlanId: id
  }));
}

describe('carat.store migration', () => {
  it('wraps a legacy flat state into a single "Plan 1"', () => {
    const legacy = {
      settings: { startingFreeCarats: 999, server: 'jp' },
      plannedBanners: [
        { id: 'b1', plannedPulls: 50, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 0 }
      ],
      paidPurchases: { anniv: { foo: 1 } },
      selectorChoices: { anniv: { uma: 'x' } }
    };

    const state = migratePersisted(legacy);

    expect(state.plans).toHaveLength(1);
    expect(state.activePlanId).toBe(state.plans[0].id);
    const plan = state.plans[0];
    expect(plan.name).toBe('Plan 1');
    expect(plan.settings.startingFreeCarats).toBe(999);
    expect(plan.settings.server).toBe('jp');
    // Defaults backfilled for missing settings keys.
    expect(plan.settings.monthlyCarats).toBe(15000);
    expect(plan.plannedBanners).toHaveLength(1);
    expect(plan.plannedBanners[0].id).toBe('b1');
    expect(plan.paidPurchases).toEqual({ anniv: { foo: 1 } });
    expect(plan.selectorChoices).toEqual({ anniv: { uma: 'x' } });
  });

  it('passes through the new multi-plan shape and repairs a stale activePlanId', () => {
    const now = Date.now();
    const planA = {
      id: 'a',
      name: 'A',
      createdAt: now,
      updatedAt: now,
      settings: {},
      plannedBanners: [],
      paidPurchases: {},
      selectorChoices: {}
    };
    const state = migratePersisted({ plans: [planA], activePlanId: 'missing' });
    expect(state.plans).toHaveLength(1);
    expect(state.activePlanId).toBe('a');
  });

  it('produces a default single plan for empty/garbage input', () => {
    const state = migratePersisted(undefined);
    expect(state.plans).toHaveLength(1);
    expect(state.activePlanId).toBe(state.plans[0].id);
    expect(state.plans[0].plannedBanners.length).toBeGreaterThan(0);
  });
});

describe('carat.store active-plan mutations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('mutators only affect the active plan', () => {
    const first = useCaratStore.getState().activePlanId;
    const second = createPlan('Plan 2');

    setCaratSetting('startingFreeCarats', 12345);
    addPlannedBanner('new-banner');

    const secondPlan = useCaratStore.getState().plans.find((p) => p.id === second)!;
    const firstPlan = useCaratStore.getState().plans.find((p) => p.id === first)!;

    expect(secondPlan.settings.startingFreeCarats).toBe(12345);
    expect(secondPlan.plannedBanners.some((b) => b.id === 'new-banner')).toBe(true);
    // First plan untouched.
    expect(firstPlan.settings.startingFreeCarats).not.toBe(12345);
    expect(firstPlan.plannedBanners.some((b) => b.id === 'new-banner')).toBe(false);
  });

  it('switching plans changes the active target', () => {
    const first = useCaratStore.getState().activePlanId;
    const second = createPlan('Plan 2');

    setActivePlan(first);
    setPlannedPulls('example-banner', 77);

    const firstPlan = useCaratStore.getState().plans.find((p) => p.id === first)!;
    const secondPlan = useCaratStore.getState().plans.find((p) => p.id === second)!;
    expect(firstPlan.plannedBanners.find((b) => b.id === 'example-banner')?.plannedPulls).toBe(77);
    expect(secondPlan.plannedBanners.find((b) => b.id === 'example-banner')?.plannedPulls).not.toBe(
      77
    );
  });

  it('bumps updatedAt on mutation', () => {
    const before = getActivePlan(useCaratStore.getState()).updatedAt;
    setCaratSetting('umaTickets', 5);
    const after = getActivePlan(useCaratStore.getState()).updatedAt;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe('carat.store CRUD', () => {
  beforeEach(() => {
    resetStore();
  });

  it('createPlan appends and activates', () => {
    const countBefore = useCaratStore.getState().plans.length;
    const id = createPlan('Fresh');
    const state = useCaratStore.getState();
    expect(state.plans).toHaveLength(countBefore + 1);
    expect(state.activePlanId).toBe(id);
    expect(state.plans.at(-1)?.name).toBe('Fresh');
  });

  it('duplicatePlan deep-clones into a "… copy" and activates it', () => {
    const sourceId = useCaratStore.getState().activePlanId;
    setCaratSetting('startingFreeCarats', 4242);
    const copyId = duplicatePlan(sourceId)!;

    const copy = useCaratStore.getState().plans.find((p) => p.id === copyId)!;
    expect(useCaratStore.getState().activePlanId).toBe(copyId);
    expect(copy.name).toBe('Plan 1 copy');
    expect(copy.settings.startingFreeCarats).toBe(4242);

    // Mutating the copy must not touch the source (deep clone).
    setCaratSetting('startingFreeCarats', 1);
    const source = useCaratStore.getState().plans.find((p) => p.id === sourceId)!;
    expect(source.settings.startingFreeCarats).toBe(4242);
  });

  it('renamePlan ignores blank names', () => {
    const id = useCaratStore.getState().activePlanId;
    renamePlan(id, '  Renamed  ');
    expect(useCaratStore.getState().plans.find((p) => p.id === id)?.name).toBe('Renamed');
    renamePlan(id, ' '.repeat(3));
    expect(useCaratStore.getState().plans.find((p) => p.id === id)?.name).toBe('Renamed');
  });

  it('deletePlan recreates a default when the last plan is removed', () => {
    const id = useCaratStore.getState().activePlanId;
    deletePlan(id);
    const state = useCaratStore.getState();
    expect(state.plans).toHaveLength(1);
    expect(state.plans[0].id).not.toBe(id);
    expect(state.activePlanId).toBe(state.plans[0].id);
  });

  it('deletePlan moves active to the first remaining plan', () => {
    const first = useCaratStore.getState().activePlanId;
    const second = createPlan('Plan 2');
    expect(useCaratStore.getState().activePlanId).toBe(second);
    deletePlan(second);
    expect(useCaratStore.getState().activePlanId).toBe(first);
  });
});
