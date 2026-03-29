import { Orientation, type CourseData, type ICorner, type IOrientation } from '@/lib/sunday-tools/course/definitions';
import { findReferenceCourse } from '@/modules/data/courses';

export type TrackPathPoint = {
  distance: number;
  x: number;
  y: number;
  /** Heading in radians, math coords (y up). */
  heading: number;
};

export type BuiltTrackPath = {
  points: TrackPathPoint[];
  /** -1 = clockwise, +1 = counterclockwise, 0 = straight course */
  turnSign: number;
  /** Physical lap length in meters (one full loop). */
  lapLength: number;
  /** Corners / 4; may be fractional (e.g. 1.5 for 6 corners). */
  numLaps: number;
  /** Course distance that maps to loop index 0 (see interpolateTrackPoint). */
  raceStartOnTrack: number;
};

const SAMPLE_EVERY_M = 2;
const HALF_PI = Math.PI / 2;

export function turnSignFromOrientation(turn: IOrientation): number {
  if (turn === Orientation.NoTurns) return 0;
  if (turn === Orientation.Counterclockwise) return 1;
  return -1;
}

/**
 * Unit vector pointing from the inner rail toward the outer rail (positive `currentLane`).
 */
export function outwardFromInnerRail(heading: number, turnSign: number): { x: number; y: number } {
  if (turnSign === 0) {
    return { x: -Math.sin(heading), y: Math.cos(heading) };
  }
  return { x: turnSign * Math.sin(heading), y: -turnSign * Math.cos(heading) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function positiveMod(n: number, m: number): number {
  if (m <= 1e-9) return 0;
  return ((n % m) + m) % m;
}

function unwrapAngleLerp(a0: number, a1: number, t: number): number {
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return a0 + delta * t;
}

type Corner = Pick<ICorner, 'start' | 'length'>;

function lapPeriodFromCorners(sorted: Corner[], courseDistance: number): number {
  if (sorted.length >= 5) {
    return sorted[4].start - sorted[0].start;
  }
  return courseDistance;
}

function buildSyntheticLapCourse(
  course: CourseData,
  lapCorners: Corner[],
  lapPeriod: number,
): CourseData {
  const baseStart = lapCorners[0].start;
  const corners = lapCorners.map((corner) => ({
    start: corner.start - baseStart,
    length: corner.length,
  }));

  return {
    ...course,
    distance: lapPeriod,
    corners,
    straights: [],
    slopes: [],
  };
}

function bestRefCornerIndex(refFirstFour: Corner[], currentFirstStart: number): number {
  let bestK = 0;
  let bestD = Infinity;
  for (let k = 0; k < refFirstFour.length; k++) {
    const d = Math.abs(refFirstFour[k].start - currentFirstStart);
    if (d < bestD) {
      bestD = d;
      bestK = k;
    }
  }
  return bestK;
}

/** Legacy open path: each corner = 90° arc (original behavior). */
function buildLegacyOpenTrackPath(course: CourseData, turnSign: number): BuiltTrackPath {
  const distance = Math.max(course.distance, 1);
  const corners = [...course.corners].sort((a, b) => a.start - b.start);
  type Seg =
    | { kind: 'straight'; start: number; end: number }
    | { kind: 'corner'; start: number; end: number };

  const segments: Seg[] = [];
  let pos = 0;
  for (const c of corners) {
    const cEnd = Math.min(c.start + c.length, distance);
    if (pos < c.start) {
      segments.push({ kind: 'straight', start: pos, end: c.start });
    }
    if (c.start < distance && cEnd > c.start) {
      segments.push({ kind: 'corner', start: c.start, end: cEnd });
    }
    pos = Math.max(pos, cEnd);
  }
  if (pos < distance) {
    segments.push({ kind: 'straight', start: pos, end: distance });
  }

  const points: TrackPathPoint[] = [];
  let x = 0;
  let y = 0;
  let θ = 0;
  let distAlong = 0;

  const push = (): void => {
    points.push({ distance: distAlong, x, y, heading: θ });
  };

  push();

  for (const seg of segments) {
    if (seg.kind === 'straight') {
      while (distAlong < seg.end - 1e-6) {
        const step = Math.min(SAMPLE_EVERY_M, seg.end - distAlong);
        x += step * Math.cos(θ);
        y += step * Math.sin(θ);
        distAlong += step;
        push();
      }
      continue;
    }

    const L = seg.end - seg.start;
    if (L <= 1e-9) continue;
    const R = L / HALF_PI;
    const θ0 = θ;
    const x0 = x;
    const y0 = y;
    let s = 0;
    while (s < L - 1e-9) {
      const step = Math.min(SAMPLE_EVERY_M, L - s);
      s += step;
      const th = θ0 + turnSign * (s / R);
      x = x0 + (R / turnSign) * (Math.sin(th) - Math.sin(θ0));
      y = y0 - (R / turnSign) * (Math.cos(th) - Math.cos(θ0));
      distAlong = seg.start + s;
      θ = th;
      push();
    }
  }

  return {
    points,
    turnSign,
    lapLength: distance,
    numLaps: 1,
    raceStartOnTrack: 0,
  };
}

/**
 * Build a 2D polyline for the inner-rail path: one physical lap as a closed loop when possible.
 * Two turns per lap, π radians each; lap length from corner period or course distance.
 */
export function buildCourseTrackPath(course: CourseData): BuiltTrackPath {
  const distance = Math.max(course.distance, 1);
  const turnSign = turnSignFromOrientation(course.turn);

  if (turnSign === 0) {
    const points: TrackPathPoint[] = [];
    for (let d = 0; d < distance; d += SAMPLE_EVERY_M) {
      points.push({ distance: d, x: d, y: 0, heading: 0 });
    }
    points.push({ distance, x: distance, y: 0, heading: 0 });
    return { points, turnSign: 0, lapLength: distance, numLaps: 1, raceStartOnTrack: 0 };
  }

  const sorted = [...course.corners].sort((a, b) => a.start - b.start);

  const buildFromLapCorners = (
    lapCorners: Corner[],
    lapPeriod: number,
    orientationSource: IOrientation,
    raceStartOnTrack: number,
  ): BuiltTrackPath => {
    const ts = turnSignFromOrientation(orientationSource);
    const syntheticLapCourse = buildSyntheticLapCourse(course, lapCorners, lapPeriod);
    const points = buildLegacyOpenTrackPath(syntheticLapCourse, ts).points;
    const numLaps = distance / lapPeriod;
    return {
      points,
      turnSign: ts,
      lapLength: lapPeriod,
      numLaps,
      raceStartOnTrack,
    };
  };

  if (sorted.length >= 4) {
    const lapCorners = sorted.slice(0, 4);
    const lapPeriod = lapPeriodFromCorners(sorted, distance);
    const start1 = lapCorners[0].start;
    return buildFromLapCorners(lapCorners, lapPeriod, course.turn, start1);
  }

  const ref = findReferenceCourse(course.raceTrackId, course.surface);
  if (ref) {
    const refSorted = [...ref.corners].sort((a, b) => a.start - b.start);
    const refLap = refSorted.slice(0, 4);
    const lapPeriod = lapPeriodFromCorners(refSorted, Math.max(ref.distance, 1));
    const k = bestRefCornerIndex(refLap, sorted[0]?.start ?? 0);
    const ref0 = refLap[0].start;
    const refK = refLap[k].start;
    const cur0 = sorted[0]?.start ?? 0;
    const raceStartOnTrack = cur0 + ref0 - refK;
    return buildFromLapCorners(refLap, lapPeriod, ref.turn as IOrientation, raceStartOnTrack);
  }

  return buildLegacyOpenTrackPath(course, turnSign);
}

export function interpolateTrackPoint(
  built: BuiltTrackPath,
  raceDistance: number,
): { x: number; y: number; heading: number } {
  const { points, lapLength, raceStartOnTrack } = built;
  if (points.length === 0) return { x: 0, y: 0, heading: 0 };

  const loopDist = positiveMod(raceDistance - raceStartOnTrack, lapLength);
  const lastPoint = points.at(-1);
  if (!lastPoint) {
    return { x: 0, y: 0, heading: 0 };
  }
  const d = clamp(loopDist, points[0].distance, lastPoint.distance);

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].distance <= d) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  if (Math.abs(b.distance - a.distance) < 1e-9) {
    return { x: a.x, y: a.y, heading: a.heading };
  }
  const t = (d - a.distance) / (b.distance - a.distance);
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    heading: unwrapAngleLerp(a.heading, b.heading, t),
  };
}
