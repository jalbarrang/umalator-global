import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { PHASE_STYLES } from '@/modules/race-sim/constants';
import { slopeValueToPercentage } from '@/modules/racetrack/types';
import {
  CHART_Y_END,
  DRAW_W,
  PAD_LEFT,
  SLOPE_MAX_HEIGHT,
  type PhaseRegion,
  type SlopePoint,
} from './shared';
import { clamp } from './utils';

export function buildPhaseRegions(distance: number): PhaseRegion[] {
  const p1 = CourseHelpers.phaseStart(distance, 1);
  const p2 = CourseHelpers.phaseStart(distance, 2);
  const p3 = CourseHelpers.phaseStart(distance, 3);
  const boundaries = [0, p1, p2, p3, distance];

  return PHASE_STYLES.map((style, index) => ({
    label: style.label,
    start: boundaries[index],
    end: boundaries[index + 1],
    fill: style.fill,
    stroke: style.stroke,
  }));
}

export function buildSlopePoints(
  courseData: CourseData,
  viewStart: number,
  viewEnd: number,
): SlopePoint[] {
  const distance = Math.max(courseData.distance, 1);
  const clampedStart = clamp(viewStart, 0, distance);
  const clampedEnd = clamp(viewEnd, clampedStart + 1e-6, distance);
  const sorted = [...courseData.slopes].sort((left, right) => left.start - right.start);

  const segments: Array<{ start: number; end: number; slope: number }> = [];
  let cursor = 0;

  for (const slope of sorted) {
    const start = clamp(slope.start, 0, distance);
    const end = clamp(slope.start + slope.length, 0, distance);

    if (start > cursor) {
      segments.push({ start: cursor, end: start, slope: 0 });
    }
    if (end > start) {
      segments.push({ start, end, slope: slope.slope });
      cursor = end;
    }
  }

  if (cursor < distance) {
    segments.push({ start: cursor, end: distance, slope: 0 });
  }
  if (segments.length === 0) {
    segments.push({ start: 0, end: distance, slope: 0 });
  }

  const elevationAt = (position: number): number => {
    let elevation = 0;
    for (const segment of segments) {
      const slope = slopeValueToPercentage(segment.slope);
      if (position <= segment.start) {
        return elevation;
      }
      if (position < segment.end) {
        return elevation + slope * (position - segment.start);
      }
      elevation += slope * (segment.end - segment.start);
    }
    return elevation;
  };

  const breakpoints = new Set<number>([clampedStart, clampedEnd]);
  for (const segment of segments) {
    if (segment.start > clampedStart && segment.start < clampedEnd) {
      breakpoints.add(segment.start);
    }
    if (segment.end > clampedStart && segment.end < clampedEnd) {
      breakpoints.add(segment.end);
    }
  }

  const sortedBreakpoints = [...breakpoints].sort((left, right) => left - right);
  if (sortedBreakpoints.length < 2) {
    return [];
  }

  const elevations = sortedBreakpoints.map((point) => elevationAt(point));
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const range = Math.max(maxElevation - minElevation, 1e-6);
  const viewDistance = Math.max(clampedEnd - clampedStart, 1e-6);

  return sortedBreakpoints.map((distancePoint, index) => ({
    x: PAD_LEFT + ((distancePoint - clampedStart) / viewDistance) * DRAW_W,
    y: CHART_Y_END - ((elevations[index] - minElevation) / range) * SLOPE_MAX_HEIGHT,
    distance: distancePoint,
  }));
}

export function interpolateY(points: SlopePoint[], x: number): number {
  if (points.length === 0) return CHART_Y_END;
  if (x <= points[0].x) return points[0].y;

  for (let index = 0; index < points.length - 1; index++) {
    if (x <= points[index + 1].x) {
      const distance = Math.max(points[index + 1].x - points[index].x, 1e-6);
      const t = (x - points[index].x) / distance;
      return points[index].y + (points[index + 1].y - points[index].y) * t;
    }
  }

  return points[points.length - 1].y;
}

export function distanceToCanvasX(
  distance: number,
  viewStart: number,
  viewDistance: number,
): number {
  return PAD_LEFT + ((distance - viewStart) / viewDistance) * DRAW_W;
}

export function getTickStep(viewDistance: number): number {
  if (viewDistance <= 300) return 25;
  if (viewDistance <= 600) return 50;
  if (viewDistance <= 1200) return 100;
  if (viewDistance <= 2400) return 200;
  return 400;
}
