import { cloneDeep } from 'es-toolkit';
import { toast } from 'sonner';
import {
  createPlan,
  getActivePlan,
  useCaratStore,
  type CaratPlan,
  type CaratSettings,
  type PlannedBanner
} from '@/store/carat.store';
import { CARAT_PLAN_SNAPSHOT_VERSION, type CaratPlanSnapshot } from './types';

export function buildCaratPlanSnapshot(planId?: string): CaratPlanSnapshot {
  const state = useCaratStore.getState();
  const plan: CaratPlan =
    (planId ? state.plans.find((p) => p.id === planId) : undefined) ?? getActivePlan(state);

  return {
    version: CARAT_PLAN_SNAPSHOT_VERSION,
    timestamp: Date.now(),
    name: plan.name,
    settings: cloneDeep(plan.settings),
    plannedBanners: cloneDeep(plan.plannedBanners),
    paidPurchases: cloneDeep(plan.paidPurchases),
    selectorChoices: cloneDeep(plan.selectorChoices)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSettings(value: unknown): value is CaratSettings {
  if (!isRecord(value)) return false;
  return (
    (value.server === 'global' || value.server === 'jp') &&
    typeof value.startingFreeCarats === 'number' &&
    typeof value.startingPaidCarats === 'number' &&
    typeof value.umaTickets === 'number' &&
    typeof value.supportTickets === 'number' &&
    typeof value.monthlyCarats === 'number' &&
    typeof value.monthlyTickets === 'number' &&
    typeof value.teamTrialsClass === 'string' &&
    typeof value.clubRank === 'string' &&
    typeof value.cmPlacement === 'string' &&
    typeof value.lohRank === 'string' &&
    typeof value.dailyCaratPack === 'boolean' &&
    typeof value.trainingPass === 'string' &&
    typeof value.trackPaidCarats === 'boolean'
  );
}

function isPlannedBanner(value: unknown): value is PlannedBanner {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.plannedPulls === 'number' &&
    typeof value.startingDupes === 'number' &&
    isRecord(value.copyGoals) &&
    isRecord(value.ownedCopies) &&
    typeof value.order === 'number' &&
    (value.ticketsUsed === undefined || typeof value.ticketsUsed === 'number')
  );
}

export function parseCaratPlanSnapshotJson(raw: string): CaratPlanSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== CARAT_PLAN_SNAPSHOT_VERSION) return null;
  if (typeof parsed.timestamp !== 'number') return null;
  if (typeof parsed.name !== 'string') return null;
  if (!isSettings(parsed.settings)) return null;
  if (!Array.isArray(parsed.plannedBanners) || !parsed.plannedBanners.every(isPlannedBanner)) {
    return null;
  }
  if (!isRecord(parsed.paidPurchases)) return null;
  if (!isRecord(parsed.selectorChoices)) return null;

  return {
    version: CARAT_PLAN_SNAPSHOT_VERSION,
    timestamp: parsed.timestamp,
    name: parsed.name,
    settings: parsed.settings,
    plannedBanners: parsed.plannedBanners as PlannedBanner[],
    paidPurchases: parsed.paidPurchases as CaratPlanSnapshot['paidPurchases'],
    selectorChoices: parsed.selectorChoices as CaratPlanSnapshot['selectorChoices']
  };
}

/** Import a snapshot as a NEW plan and make it active. Returns the new plan id. */
export function importCaratPlanSnapshot(snapshot: CaratPlanSnapshot): string {
  const newPlanId = createPlan(snapshot.name);
  useCaratStore.setState((state) => ({
    plans: state.plans.map((plan) =>
      plan.id === newPlanId
        ? {
            ...plan,
            settings: cloneDeep(snapshot.settings),
            plannedBanners: cloneDeep(snapshot.plannedBanners),
            paidPurchases: cloneDeep(snapshot.paidPurchases),
            selectorChoices: cloneDeep(snapshot.selectorChoices),
            updatedAt: Date.now()
          }
        : plan
    )
  }));
  return newPlanId;
}

function shortHash(value: string): string {
  // FNV-1a 32-bit hash rendered as base36, for a compact filename suffix.
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}

export function downloadCaratPlanSnapshot(planId?: string, filename?: string): void {
  try {
    const snapshot = buildCaratPlanSnapshot(planId);
    const json = JSON.stringify(snapshot, null, 2);
    const resolvedFilename = filename ?? `torena-carat-plan-${shortHash(json)}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resolvedFilename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Pull plan exported');
  } catch {
    toast.error('Failed to export pull plan');
  }
}
