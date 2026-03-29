import { create } from 'zustand';
import type { RaceEvent } from '@/lib/sunday-tools/race-sim/race-event-log';
import type { RaceSimResult } from '@/lib/sunday-tools/race-sim/run-race-sim';
import type { RaceSimCollectedRound } from '@/lib/sunday-tools/race-sim/race-sim-collector';
import { SIM_TO_DISPLAY_SECONDS, TICKS_PER_SECOND } from '@/modules/race-sim/constants';
import { formatTime } from '@/utils/time';

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function getRoundCount(results: RaceSimResult | null): number {
  if (!results) return 0;
  return Math.max(
    results.finishOrders.length,
    results.collectedData.rounds.length,
    results.eventLogs.length,
  );
}

function getRoundMaxTick(results: RaceSimResult | null, roundIndex: number): number {
  if (!results) return 0;
  const allRunnerPositions = results.collectedData.rounds[roundIndex]?.allRunnerPositions ?? {};
  const roundEvents = results.eventLogs[roundIndex] ?? [];
  let maxTick = 0;
  for (const positions of Object.values(allRunnerPositions)) {
    if (positions.length > 0) maxTick = Math.max(maxTick, positions.length - 1);
  }
  for (const event of roundEvents) {
    maxTick = Math.max(maxTick, event.tick);
  }
  return maxTick;
}

function toTimeDisplay(tick: number): string {
  return formatTime((tick / TICKS_PER_SECOND) * SIM_TO_DISPLAY_SECONDS);
}

export function getRunnerPositionsAtTick(
  results: RaceSimResult | null,
  selectedRound: number,
  currentTick: number,
): Record<number, number> {
  if (!results) return {};
  const allPositions = results.collectedData.rounds[selectedRound]?.allRunnerPositions ?? {};
  const snapshot: Record<number, number> = {};
  for (const [runnerIdStr, positions] of Object.entries(allPositions)) {
    if (positions.length === 0) continue;
    const tickIndex = clamp(currentTick, 0, positions.length - 1);
    snapshot[Number(runnerIdStr)] = positions[tickIndex];
  }
  return snapshot;
}

export function getRunnerLanesAtTick(
  results: RaceSimResult | null,
  selectedRound: number,
  currentTick: number,
): Record<number, number> {
  if (!results) return {};
  const allLanes = results.collectedData.rounds[selectedRound]?.allRunnerLanes ?? {};
  const snapshot: Record<number, number> = {};
  for (const [runnerIdStr, lanes] of Object.entries(allLanes)) {
    if (lanes.length === 0) continue;
    const tickIndex = clamp(currentTick, 0, lanes.length - 1);
    snapshot[Number(runnerIdStr)] = lanes[tickIndex];
  }
  return snapshot;
}

type PlaybackState = {
  results: RaceSimResult | null;
  selectedRound: number;
  roundCount: number;
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;

  roundData: RaceSimCollectedRound | null;
  roundEvents: RaceEvent[];
  currentTimeDisplay: string;
  totalTimeDisplay: string;
};

function deriveFromRound(
  results: RaceSimResult | null,
  selectedRound: number,
): Pick<PlaybackState, 'totalTicks' | 'totalTimeDisplay' | 'roundData' | 'roundEvents'> {
  const totalTicks = getRoundMaxTick(results, selectedRound);
  return {
    totalTicks,
    totalTimeDisplay: toTimeDisplay(totalTicks),
    roundData: results?.collectedData.rounds[selectedRound] ?? null,
    roundEvents: results?.eventLogs[selectedRound] ?? [],
  };
}

export const usePlaybackStore = create<PlaybackState>()((_) => ({
  results: null,
  selectedRound: 0,
  roundCount: 0,
  currentTick: 0,
  totalTicks: 0,
  isPlaying: false,
  speed: 1,

  roundData: null,
  roundEvents: [],
  currentTimeDisplay: toTimeDisplay(0),
  totalTimeDisplay: toTimeDisplay(0),
}));

export const SPEED_OPTIONS = PLAYBACK_SPEEDS;

export function loadResults(results: RaceSimResult | null) {
  const roundCount = getRoundCount(results);
  const selectedRound = 0;
  const roundDerived = deriveFromRound(results, selectedRound);

  usePlaybackStore.setState({
    results,
    roundCount,
    selectedRound,
    currentTick: 0,
    isPlaying: false,
    currentTimeDisplay: toTimeDisplay(0),
    ...roundDerived,
  });
}

export function setRound(roundIndex: number) {
  const { results, roundCount } = usePlaybackStore.getState();
  const maxRound = Math.max(0, roundCount - 1);
  const nextRound = clamp(Math.round(roundIndex), 0, maxRound);
  const roundDerived = deriveFromRound(results, nextRound);

  usePlaybackStore.setState({
    selectedRound: nextRound,
    currentTick: 0,
    isPlaying: false,
    currentTimeDisplay: toTimeDisplay(0),
    ...roundDerived,
  });
}

export function play() {
  const { totalTicks, currentTick } = usePlaybackStore.getState();
  if (totalTicks <= 0 || currentTick >= totalTicks) return;
  usePlaybackStore.setState({ isPlaying: true });
}

export function pause() {
  usePlaybackStore.setState({ isPlaying: false });
}

export function stepForward() {
  const { totalTicks, currentTick } = usePlaybackStore.getState();
  const next = clamp(currentTick + 1, 0, totalTicks);
  usePlaybackStore.setState({
    isPlaying: false,
    currentTick: next,
    currentTimeDisplay: toTimeDisplay(next),
  });
}

export function stepBack() {
  const { totalTicks, currentTick } = usePlaybackStore.getState();
  const next = clamp(currentTick - 1, 0, totalTicks);
  usePlaybackStore.setState({
    isPlaying: false,
    currentTick: next,
    currentTimeDisplay: toTimeDisplay(next),
  });
}

export function seekTo(targetTick: number) {
  const { totalTicks } = usePlaybackStore.getState();
  const next = clamp(Math.round(targetTick), 0, totalTicks);

  usePlaybackStore.setState({
    isPlaying: false,
    currentTick: next,
    currentTimeDisplay: toTimeDisplay(next),
  });
}

export function setSpeed(speed: PlaybackSpeed) {
  if (!(PLAYBACK_SPEEDS as readonly number[]).includes(speed)) return;
  usePlaybackStore.setState({ speed });
}

export function tick(nextTick: number) {
  usePlaybackStore.setState({
    currentTick: nextTick,
    currentTimeDisplay: toTimeDisplay(nextTick),
  });
}

export function stopPlaying() {
  usePlaybackStore.setState({ isPlaying: false });
}

let rafId: number | null = null;
let lastFrameTime: number | null = null;
let carryTick = 0;

function animateLoop(time: number) {
  const state = usePlaybackStore.getState();
  if (!state.isPlaying) {
    cleanup();
    return;
  }

  if (lastFrameTime === null) {
    lastFrameTime = time;
    rafId = requestAnimationFrame(animateLoop);
    return;
  }

  const elapsed = (time - lastFrameTime) / 1000;
  lastFrameTime = time;

  const tickDelta = elapsed * TICKS_PER_SECOND * state.speed + carryTick;
  const wholeTicks = Math.floor(tickDelta);
  carryTick = tickDelta - wholeTicks;

  if (wholeTicks > 0) {
    const nextTick = clamp(state.currentTick + wholeTicks, 0, state.totalTicks);
    tick(nextTick);

    if (nextTick >= state.totalTicks) {
      stopPlaying();
      cleanup();
      return;
    }
  }

  rafId = requestAnimationFrame(animateLoop);
}

function cleanup() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameTime = null;
  carryTick = 0;
}

usePlaybackStore.subscribe((state, prevState) => {
  if (state.isPlaying && !prevState.isPlaying) {
    cleanup();
    rafId = requestAnimationFrame(animateLoop);
  } else if (!state.isPlaying && prevState.isPlaying) {
    cleanup();
  }
});
