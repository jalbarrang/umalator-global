import { RUNNER_COLORS } from '@/modules/race-sim/constants';
import { distanceToCanvasX, interpolateY } from './graphMath';
import type { GraphMarkerInfo, SlopePoint } from './shared';
import { clamp } from './utils';

type BuildRunnerMarkersArgs = {
  runnerPositions: Record<number, number>;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  viewStart: number;
  viewEnd: number;
  slopePoints: SlopePoint[];
};

export function buildRunnerMarkers({
  runnerPositions,
  runnerNames,
  trackedRunnerIds,
  viewStart,
  viewEnd,
  slopePoints,
}: BuildRunnerMarkersArgs): GraphMarkerInfo[] {
  const trackedSet = new Set(trackedRunnerIds);
  const viewDistance = Math.max(viewEnd - viewStart, 1e-6);
  const ids: number[] = [];
  const allKeys = new Set([
    ...Object.keys(runnerNames).map(Number),
    ...Object.keys(runnerPositions).map(Number),
    ...trackedRunnerIds,
  ]);

  for (let index = 0; index < 9; index++) {
    allKeys.add(index);
  }
  for (const id of allKeys) {
    ids.push(id);
  }

  ids.sort((left, right) => left - right);

  const occupancy = new Map<number, number>();
  const markers: GraphMarkerInfo[] = [];

  for (const runnerId of ids.slice(0, 9)) {
    const position = clamp(runnerPositions[runnerId] ?? viewStart, viewStart, viewEnd);
    const x = distanceToCanvasX(position, viewStart, viewDistance);
    const bucket = Math.round(x / 14);
    const stackIndex = occupancy.get(bucket) ?? 0;
    occupancy.set(bucket, stackIndex + 1);

    markers.push({
      id: runnerId,
      pos: position,
      x,
      y: interpolateY(slopePoints, x) - 12 - stackIndex * 16,
      color: RUNNER_COLORS[runnerId % RUNNER_COLORS.length],
      tracked: trackedSet.has(runnerId),
      name: runnerNames[runnerId] ?? `Runner ${runnerId + 1}`,
    });
  }

  markers.sort((left, right) => left.pos - right.pos);
  return markers;
}
