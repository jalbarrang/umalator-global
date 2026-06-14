import { cloneDeep } from 'es-toolkit';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settings.store';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import type { RaceSimSnapshot } from './types';
import { RACE_SIM_SNAPSHOT_VERSION } from './types';

export function buildRaceSimSnapshot(): RaceSimSnapshot {
  const raceSim = useRaceSimStore.getState();
  const settings = useSettingsStore.getState();

  return {
    version: RACE_SIM_SNAPSHOT_VERSION,
    timestamp: Date.now(),
    runners: cloneDeep(raceSim.runners),
    courseId: settings.courseId,
    racedef: cloneDeep(settings.racedef),
    nsamples: raceSim.nsamples,
    seed: raceSim.seed,
    focusRunnerIndices: cloneDeep(raceSim.focusRunnerIndices)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRunnerState(value: unknown): value is RaceSimSnapshot['runners'][number] {
  if (!isRecord(value)) return false;
  return (
    typeof value.outfitId === 'string' &&
    typeof value.speed === 'number' &&
    typeof value.stamina === 'number' &&
    typeof value.power === 'number' &&
    typeof value.guts === 'number' &&
    typeof value.wisdom === 'number' &&
    typeof value.strategy === 'string' &&
    typeof value.distanceAptitude === 'string' &&
    typeof value.surfaceAptitude === 'string' &&
    typeof value.strategyAptitude === 'string' &&
    typeof value.mood === 'number' &&
    Array.isArray(value.skills) &&
    // Optional fields: validate only when present.
    (value.team === undefined || value.team === null || typeof value.team === 'number') &&
    (value.gate === undefined || value.gate === null || typeof value.gate === 'number')
  );
}

function isRaceConditions(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.mood === 'number' &&
    typeof value.ground === 'number' &&
    typeof value.weather === 'number' &&
    typeof value.season === 'number' &&
    typeof value.time === 'number' &&
    typeof value.grade === 'number'
  );
}

export function parseRaceSimSnapshotJson(raw: string): RaceSimSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== RACE_SIM_SNAPSHOT_VERSION) return null;
  if (typeof parsed.timestamp !== 'number') return null;
  if (!Array.isArray(parsed.runners) || parsed.runners.length === 0) return null;
  if (!parsed.runners.every(isRunnerState)) return null;
  if (typeof parsed.courseId !== 'number') return null;
  if (!isRaceConditions(parsed.racedef)) return null;
  if (typeof parsed.nsamples !== 'number') return null;
  if (parsed.seed !== null && typeof parsed.seed !== 'number') return null;
  if (
    !Array.isArray(parsed.focusRunnerIndices) ||
    !parsed.focusRunnerIndices.every((index) => typeof index === 'number')
  ) {
    return null;
  }

  return {
    version: RACE_SIM_SNAPSHOT_VERSION,
    timestamp: parsed.timestamp,
    runners: parsed.runners as RaceSimSnapshot['runners'],
    courseId: parsed.courseId,
    racedef: parsed.racedef as RaceSimSnapshot['racedef'],
    nsamples: parsed.nsamples,
    seed: parsed.seed,
    focusRunnerIndices: parsed.focusRunnerIndices as number[]
  };
}

export function importRaceSimSnapshot(data: RaceSimSnapshot): void {
  useSettingsStore.setState({
    courseId: data.courseId,
    racedef: cloneDeep(data.racedef),
    selectedPresetId: null
  });

  useRaceSimStore.setState({
    runners: cloneDeep(data.runners),
    nsamples: data.nsamples,
    seed: data.seed,
    focusRunnerIndices: cloneDeep(data.focusRunnerIndices),
    results: null,
    isStale: false
  });
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

export function downloadRaceSimSnapshot(filename?: string): void {
  try {
    const snapshot = buildRaceSimSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const resolvedFilename = filename ?? `torena-sim-race-${shortHash(json)}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resolvedFilename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Race configuration exported');
  } catch {
    toast.error('Failed to export race configuration');
  }
}
