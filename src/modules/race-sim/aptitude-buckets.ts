import type { IRunnerState, RunnerAptitudes } from '@/modules/runners/components/runner-card/types';
import { coursesService } from '@/modules/data/services/CourseService';

export type AptitudeBucketKey = keyof RunnerAptitudes;

export const DISTANCE_BUCKETS: ReadonlyArray<{ key: AptitudeBucketKey; label: string }> = [
  { key: 'distanceShort', label: 'Sprint' },
  { key: 'distanceMile', label: 'Mile' },
  { key: 'distanceMiddle', label: 'Medium' },
  { key: 'distanceLong', label: 'Long' }
];

export const SURFACE_BUCKETS: ReadonlyArray<{ key: AptitudeBucketKey; label: string }> = [
  { key: 'turf', label: 'Turf' },
  { key: 'dirt', label: 'Dirt' }
];

export const STYLE_BUCKETS: ReadonlyArray<{ key: AptitudeBucketKey; label: string }> = [
  { key: 'nige', label: 'Front' },
  { key: 'senko', label: 'Pace' },
  { key: 'sashi', label: 'Late' },
  { key: 'oikomi', label: 'End' }
];

/** Full bucket set, falling back to the collapsed grades broadcast across each axis. */
export function bucketsFromRunner(runner: IRunnerState): RunnerAptitudes {
  if (runner.aptitudes) return runner.aptitudes;
  const d = runner.distanceAptitude;
  const s = runner.surfaceAptitude;
  const st = runner.strategyAptitude;
  return {
    distanceShort: d,
    distanceMile: d,
    distanceMiddle: d,
    distanceLong: d,
    turf: s,
    dirt: s,
    nige: st,
    senko: st,
    sashi: st,
    oikomi: st
  };
}

function distanceCategory(distance: number): 1 | 2 | 3 | 4 {
  if (distance <= 1400) return 1;
  if (distance <= 1800) return 2;
  if (distance <= 2400) return 3;
  return 4;
}

const DISTANCE_KEY_BY_CATEGORY: Record<number, AptitudeBucketKey> = {
  1: 'distanceShort',
  2: 'distanceMile',
  3: 'distanceMiddle',
  4: 'distanceLong'
};

const STYLE_KEY_BY_STRATEGY: Record<string, AptitudeBucketKey> = {
  'Front Runner': 'nige',
  Runaway: 'nige',
  'Pace Chaser': 'senko',
  'Late Surger': 'sashi',
  'End Closer': 'oikomi'
};

/**
 * Pick the three collapsed grades (engine input) that match a given course +
 * strategy from a full bucket set. Keeps the sim/coarse view consistent with the
 * per-bucket values for the race actually being run.
 */
export function collapsedForCourse(
  aptitudes: RunnerAptitudes,
  courseId: number,
  strategy: IRunnerState['strategy']
): Pick<IRunnerState, 'distanceAptitude' | 'surfaceAptitude' | 'strategyAptitude'> {
  const course = coursesService.getById(String(courseId));
  const distanceKey = course
    ? DISTANCE_KEY_BY_CATEGORY[distanceCategory(course.distance)]
    : 'distanceMiddle';
  const surfaceKey: AptitudeBucketKey = course?.surface === 2 ? 'dirt' : 'turf';
  const styleKey = STYLE_KEY_BY_STRATEGY[strategy] ?? 'nige';
  return {
    distanceAptitude: aptitudes[distanceKey],
    surfaceAptitude: aptitudes[surfaceKey],
    strategyAptitude: aptitudes[styleKey]
  };
}
