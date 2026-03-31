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

export type FinishRankEntry = { runnerId: number; rank: number };

export function buildRunnerOrderRows(
  courseDistance: number,
  runnerNames: Record<number, string>,
  runnerPositions: Record<number, number>,
  runnerLanes: Record<number, number>,
  trackedRunnerIds: number[],
  finishRanks: FinishRankEntry[],
): RunnerOrderRow[] {
  const ids = new Set<number>();

  for (const k of Object.keys(runnerNames)) {
    ids.add(Number(k));
  }

  for (const k of Object.keys(runnerPositions)) {
    ids.add(Number(k));
  }

  for (const id of trackedRunnerIds) {
    ids.add(id);
  }

  for (let i = 0; i < 9; i++) {
    ids.add(i);
  }

  const finishRankMap = new Map<number, number>();
  for (const entry of finishRanks) {
    finishRankMap.set(entry.runnerId, entry.rank);
  }

  const base = [...ids]
    .sort((a, b) => a - b)
    .slice(0, 9)
    .map((runnerId) => {
      const position = clamp(runnerPositions[runnerId] ?? 0, 0, courseDistance);
      const finished = position >= courseDistance && finishRankMap.has(runnerId);
      return {
        runnerId,
        name: runnerNames[runnerId] ?? `Runner ${runnerId + 1}`,
        position,
        lane: runnerLanes[runnerId],
        isTracked: trackedRunnerIds.includes(runnerId),
        color: RUNNER_COLORS[runnerId % RUNNER_COLORS.length],
        finished,
      };
    });

  const finishedRunners = base
    .filter((e) => e.finished)
    .sort((a, b) => finishRankMap.get(a.runnerId)! - finishRankMap.get(b.runnerId)!);

  const racingRunners = base
    .filter((e) => !e.finished)
    .sort((a, b) => b.position - a.position);

  const ordered = [...finishedRunners, ...racingRunners];
  const leaderDistance = Math.max(...base.map((e) => e.position), 0);

  return ordered.map((entry, i) => ({
    runnerId: entry.runnerId,
    name: entry.name,
    position: entry.position,
    lane: entry.lane,
    isTracked: entry.isTracked,
    color: entry.color,
    rank: i + 1,
    gapFromLeader: Math.max(0, leaderDistance - entry.position),
  }));
}
