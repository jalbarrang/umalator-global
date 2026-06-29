import { beforeEach, describe, expect, it } from 'vitest';
import { createPlan, setCaratSetting, setPlannedPulls, useCaratStore } from '@/store/carat.store';
import { gzipStringToBase64 } from '@/modules/runners/share/gzip-base64';
import {
  buildCaratPlanSnapshot,
  importCaratPlanSnapshot,
  parseCaratPlanSnapshotJson
} from './snapshot';
import { encodeCaratPlanShareCode, decodeCaratPlanShareCode } from './share-code';

const hasCompressionStream =
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function resetToSinglePlan() {
  const id = createPlan('Plan 1');
  useCaratStore.setState((state) => ({
    plans: state.plans.filter((plan) => plan.id === id),
    activePlanId: id
  }));
}

describe('carat plan snapshot', () => {
  beforeEach(() => {
    resetToSinglePlan();
  });

  it('builds a snapshot of the active plan', () => {
    setCaratSetting('startingFreeCarats', 5000);
    setPlannedPulls('example-banner', 120);
    const snapshot = buildCaratPlanSnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.name).toBe('Plan 1');
    expect(snapshot.settings.startingFreeCarats).toBe(5000);
    expect(snapshot.plannedBanners.find((b) => b.id === 'example-banner')?.plannedPulls).toBe(120);
  });

  it('parseCaratPlanSnapshotJson round-trips and rejects garbage', () => {
    const snapshot = buildCaratPlanSnapshot();
    const json = JSON.stringify(snapshot);
    expect(parseCaratPlanSnapshotJson(json)).toEqual(snapshot);

    expect(parseCaratPlanSnapshotJson('not json')).toBeNull();
    expect(parseCaratPlanSnapshotJson(JSON.stringify({ hello: 'world' }))).toBeNull();
    expect(parseCaratPlanSnapshotJson(JSON.stringify({ ...snapshot, version: 99 }))).toBeNull();
  });

  it('imports a snapshot as a NEW plan without touching existing plans', () => {
    const original = useCaratStore.getState().activePlanId;
    const snapshot = buildCaratPlanSnapshot();
    const editedSnapshot = {
      ...snapshot,
      name: 'Shared',
      settings: { ...snapshot.settings, startingFreeCarats: 7777 }
    };

    const countBefore = useCaratStore.getState().plans.length;
    const newId = importCaratPlanSnapshot(editedSnapshot);
    const state = useCaratStore.getState();

    expect(state.plans).toHaveLength(countBefore + 1);
    expect(newId).not.toBe(original);
    const imported = state.plans.find((p) => p.id === newId)!;
    expect(imported.name).toBe('Shared');
    expect(imported.settings.startingFreeCarats).toBe(7777);
    // Original plan untouched.
    expect(state.plans.find((p) => p.id === original)?.settings.startingFreeCarats).not.toBe(7777);
  });
});

describe.skipIf(!hasCompressionStream)('carat plan share code', () => {
  beforeEach(() => {
    resetToSinglePlan();
  });

  it('round-trips through encode/decode', async () => {
    setCaratSetting('umaTickets', 9);
    const snapshot = buildCaratPlanSnapshot();
    const code = await encodeCaratPlanShareCode(snapshot);
    expect(code.startsWith('cp1:')).toBe(true);

    const decoded = await decodeCaratPlanShareCode(code);
    expect(decoded).toEqual(snapshot);
  });

  it('strips a leading hash/URL', async () => {
    const code = await encodeCaratPlanShareCode(buildCaratPlanSnapshot());
    const decoded = await decodeCaratPlanShareCode(`https://example.com/carat#${code}`);
    expect(decoded).not.toBeNull();
  });

  it('rejects invalid input', async () => {
    expect(await decodeCaratPlanShareCode('')).toBeNull();
    expect(await decodeCaratPlanShareCode('not-a-code')).toBeNull();
    expect(await decodeCaratPlanShareCode('cp1:!!!notbase64!!!')).toBeNull();
    // Valid base64 but not gzip.
    expect(await decodeCaratPlanShareCode('cp1:aGVsbG8')).toBeNull();
    // gzip of non-snapshot JSON.
    const badPayload = await gzipStringToBase64(JSON.stringify({ hello: 'world' }));
    expect(await decodeCaratPlanShareCode(`cp1:${badPayload}`)).toBeNull();
    // Wrong prefix.
    const goodPayload = await gzipStringToBase64(JSON.stringify(buildCaratPlanSnapshot()));
    expect(await decodeCaratPlanShareCode(`rs1:${goodPayload}`)).toBeNull();
  });
});
