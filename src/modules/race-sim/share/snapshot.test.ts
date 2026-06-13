import { describe, it, expect, beforeEach } from 'vitest';
import { Mood } from 'sunday-tools/runner/definitions';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import { createRaceConditions } from '@/utils/races';
import { useSettingsStore } from '@/store/settings.store';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import {
  buildRaceSimSnapshot,
  parseRaceSimSnapshotJson,
  importRaceSimSnapshot
} from './snapshot';
import { RACE_SIM_SNAPSHOT_VERSION } from './types';

const makeRunners = () => [
  createRunnerState({ outfitId: '100101', strategy: 'Front Runner', mood: Mood.Great }),
  createRunnerState({ outfitId: '100201', strategy: 'Pace Chaser' })
];

describe('race-sim snapshot', () => {
  beforeEach(() => {
    useRaceSimStore.setState({
      runners: makeRunners(),
      nsamples: 5,
      seed: 12345,
      focusRunnerIndices: [0],
      results: null,
      isStale: false
    });
    useSettingsStore.setState({
      courseId: 10101,
      racedef: createRaceConditions({ ground: 1 })
    });
  });

  it('round-trips through JSON', () => {
    const snapshot = buildRaceSimSnapshot();
    const json = JSON.stringify(snapshot);
    const parsed = parseRaceSimSnapshotJson(json);

    expect(parsed).not.toBeNull();
    expect(parsed).toEqual(snapshot);
    expect(parsed?.version).toBe(RACE_SIM_SNAPSHOT_VERSION);
  });

  it('importRaceSimSnapshot writes both stores and resets results/isStale', () => {
    useRaceSimStore.setState({ results: {} as never, isStale: true });

    const snapshot = buildRaceSimSnapshot();
    snapshot.courseId = 20202;
    snapshot.nsamples = 8;
    snapshot.seed = null;
    snapshot.focusRunnerIndices = [1];

    importRaceSimSnapshot(snapshot);

    const raceSim = useRaceSimStore.getState();
    const settings = useSettingsStore.getState();

    expect(settings.courseId).toBe(20202);
    expect(raceSim.nsamples).toBe(8);
    expect(raceSim.seed).toBeNull();
    expect(raceSim.focusRunnerIndices).toEqual([1]);
    expect(raceSim.runners).toHaveLength(2);
    expect(raceSim.results).toBeNull();
    expect(raceSim.isStale).toBe(false);
  });

  it('rejects invalid input', () => {
    expect(parseRaceSimSnapshotJson('not json')).toBeNull();
    expect(parseRaceSimSnapshotJson('')).toBeNull();

    const base = buildRaceSimSnapshot();

    expect(
      parseRaceSimSnapshotJson(JSON.stringify({ ...base, version: 999 }))
    ).toBeNull();
    expect(
      parseRaceSimSnapshotJson(JSON.stringify({ ...base, runners: undefined }))
    ).toBeNull();
    expect(
      parseRaceSimSnapshotJson(JSON.stringify({ ...base, runners: 'nope' }))
    ).toBeNull();
    expect(parseRaceSimSnapshotJson(JSON.stringify({ ...base, runners: [] }))).toBeNull();

    const badRunner = JSON.parse(JSON.stringify(base));
    delete badRunner.runners[0].outfitId;
    expect(parseRaceSimSnapshotJson(JSON.stringify(badRunner))).toBeNull();

    expect(
      parseRaceSimSnapshotJson(JSON.stringify({ ...base, racedef: { foo: 1 } }))
    ).toBeNull();
    expect(
      parseRaceSimSnapshotJson(JSON.stringify({ ...base, seed: 'abc' }))
    ).toBeNull();
  });
});
