import { RUNNER_COLORS } from '@/modules/race-sim/constants';
import type { RunnerOrderRow } from './shared';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolvedColor(cssVar: string): string {
  if (typeof document === 'undefined') return '#888';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (!raw) return '#888';
  return `hsl(${raw})`;
}

export function formatGap(distance: number): string {
  if (distance <= 0) return '--';
  return `+${distance.toFixed(1)}m`;
}

export function formatLaneMeters(lane: number | undefined): string {
  if (lane == null || Number.isNaN(lane)) return '—';
  return `${lane.toFixed(2)}m`;
}

export function formatLapTotal(numLaps: number): string {
  const r = Math.round(numLaps);
  if (Math.abs(numLaps - r) < 1e-6) return String(r);
  return numLaps.toFixed(1);
}

export function buildRunnerOrderRows(
  courseDistance: number,
  runnerNames: Record<number, string>,
  runnerPositions: Record<number, number>,
  runnerLanes: Record<number, number>,
  trackedRunnerIds: number[],
): RunnerOrderRow[] {
  const ids = new Set<number>();
  for (const k of Object.keys(runnerNames)) ids.add(Number(k));
  for (const k of Object.keys(runnerPositions)) ids.add(Number(k));
  for (const id of trackedRunnerIds) ids.add(id);
  for (let i = 0; i < 9; i++) ids.add(i);

  const base = [...ids]
    .sort((a, b) => a - b)
    .slice(0, 9)
    .map((runnerId) => {
      const position = clamp(runnerPositions[runnerId] ?? 0, 0, courseDistance);
      return {
        runnerId,
        name: runnerNames[runnerId] ?? `Runner ${runnerId + 1}`,
        position,
        lane: runnerLanes[runnerId],
        isTracked: trackedRunnerIds.includes(runnerId),
        color: RUNNER_COLORS[runnerId % RUNNER_COLORS.length],
      };
    });

  const leaderDistance = Math.max(...base.map((e) => e.position), 0);
  const sorted = [...base].sort((a, b) => b.position - a.position);
  const rankMap = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    rankMap.set(sorted[i].runnerId, i + 1);
  }

  return base.map((entry) => ({
    ...entry,
    rank: rankMap.get(entry.runnerId) ?? entry.runnerId + 1,
    gapFromLeader: Math.max(0, leaderDistance - entry.position),
  }));
}
