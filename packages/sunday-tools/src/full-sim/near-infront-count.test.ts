import { describe, expect, it } from 'vitest';
import type { Runner } from '../common/runner';
import type { RunnerSnapshot } from '../common/race';
import { getDynamicCondition } from './dynamic-conditions';
import { registerProximityConditions } from './proximity-conditions';

registerProximityConditions();

type Snapshot = RunnerSnapshot;

function buildRunner(
  selfPosition: number,
  selfLane: number,
  others: Array<{ id: number; position: number; currentLane: number }>
): Runner {
  const runnerSnapshots = new Map<number, Snapshot>();
  for (const other of others) {
    runnerSnapshots.set(other.id, {
      position: other.position,
      currentLane: other.currentLane,
      currentSpeed: 20
    });
  }

  return {
    id: 0,
    position: selfPosition,
    currentLane: selfLane,
    race: {
      runnerSnapshots,
      course: { horseLane: 1 }
    }
  } as unknown as Runner;
}

describe('near_infront_count dynamic condition', () => {
  it('is registered', () => {
    expect(getDynamicCondition('near_infront_count')).toBeDefined();
  });

  it('counts only nearby runners that are ahead', () => {
    const predicate = getDynamicCondition('near_infront_count')!(1, 'gte');
    const runner = buildRunner(500, 0, [
      { id: 1, position: 502, currentLane: 0 }, // ahead + near -> counts
      { id: 2, position: 700, currentLane: 0 }, // ahead but far -> ignored
      { id: 3, position: 498, currentLane: 0 } // behind -> ignored
    ]);

    expect(predicate(runner)).toBe(true);
  });

  it('near_infront_count==0 holds when nobody is close in front', () => {
    const predicate = getDynamicCondition('near_infront_count')!(0, 'eq');
    const runner = buildRunner(500, 0, [
      { id: 1, position: 498, currentLane: 0 }, // behind
      { id: 2, position: 700, currentLane: 0 } // far ahead
    ]);

    expect(predicate(runner)).toBe(true);
  });
});
