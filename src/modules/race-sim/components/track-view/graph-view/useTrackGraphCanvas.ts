import { useEffect, useMemo, useRef } from 'react';
import {
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { buildPhaseRegions, buildSlopePoints } from './graphMath';
import { paintCanvas } from './paintCanvas';
import { CANVAS_H, CANVAS_W, type TrackGraphViewProps } from './shared';
import { clamp } from './utils';

type UseTrackGraphCanvasArgs = Omit<TrackGraphViewProps, 'className'>;

export function useTrackGraphCanvas({
  courseData,
  runnerNames = {},
  trackedRunnerIds = [],
  viewStart,
  viewEnd,
}: UseTrackGraphCanvasArgs) {
  const courseDistance = Math.max(courseData.distance, 1);
  const clampedViewStart = clamp(viewStart ?? 0, 0, courseDistance);
  const clampedViewEnd = clamp(viewEnd ?? courseDistance, clampedViewStart + 1, courseDistance);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: CANVAS_W, height: CANVAS_H });

  const phaseRegions = useMemo(() => buildPhaseRegions(courseDistance), [courseDistance]);
  const slopePoints = useMemo(
    () => buildSlopePoints(courseData, clampedViewStart, clampedViewEnd),
    [courseData, clampedViewStart, clampedViewEnd],
  );

  const configRef = useRef({
    phaseRegions,
    slopePoints,
    runnerNames,
    trackedRunnerIds,
    clampedViewStart,
    clampedViewEnd,
  });

  configRef.current = {
    phaseRegions,
    slopePoints,
    runnerNames,
    trackedRunnerIds,
    clampedViewStart,
    clampedViewEnd,
  };

  const paintWithPositions = useRef((positions: Record<number, number>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = globalThis.devicePixelRatio || 1;
    const { width, height } = sizeRef.current;
    const config = configRef.current;

    paintCanvas({
      ctx,
      dpr,
      measuredWidth: width,
      measuredHeight: height,
      phaseRegions: config.phaseRegions,
      slopePoints: config.slopePoints,
      runnerPositions: positions,
      runnerNames: config.runnerNames,
      trackedRunnerIds: config.trackedRunnerIds,
      viewStart: config.clampedViewStart,
      viewEnd: config.clampedViewEnd,
    });
  });

  useEffect(() => {
    const state = usePlaybackStore.getState();
    const positions = getRunnerPositionsAtTick(
      state.results,
      state.selectedRound,
      state.currentTick,
    );

    paintWithPositions.current(positions);
  }, [phaseRegions, slopePoints, runnerNames, trackedRunnerIds, clampedViewStart, clampedViewEnd]);

  useEffect(() => {
    const unsubscribe = usePlaybackStore.subscribe((state, previousState) => {
      if (
        state.currentTick !== previousState.currentTick ||
        state.selectedRound !== previousState.selectedRound
      ) {
        const positions = getRunnerPositionsAtTick(
          state.results,
          state.selectedRound,
          state.currentTick,
        );
        paintWithPositions.current(positions);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width === 0) return;

      sizeRef.current = {
        width: rect.width,
        height: rect.width * (CANVAS_H / CANVAS_W),
      };

      const state = usePlaybackStore.getState();
      const positions = getRunnerPositionsAtTick(
        state.results,
        state.selectedRound,
        state.currentTick,
      );
      paintWithPositions.current(positions);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const state = usePlaybackStore.getState();
      const positions = getRunnerPositionsAtTick(
        state.results,
        state.selectedRound,
        state.currentTick,
      );
      paintWithPositions.current(positions);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });

    return () => observer.disconnect();
  }, []);

  return { containerRef, canvasRef };
}
