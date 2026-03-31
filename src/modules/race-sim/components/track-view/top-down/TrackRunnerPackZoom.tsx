import { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import {
  getRunnerLanesAtTick,
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { PACK_CANVAS_H, PACK_CANVAS_W } from './shared';
import { paintTrackPackZoom } from './trackLayers';

type TrackRunnerPackZoomProps = {
  courseData: CourseData;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  className?: string;
};

export const TrackRunnerPackZoom = memo(function TrackRunnerPackZoom(
  props: TrackRunnerPackZoomProps,
) {
  const { courseData, runnerNames, trackedRunnerIds, className } = props;
  const courseDistance = Math.max(courseData.distance, 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: PACK_CANVAS_W, height: PACK_CANVAS_H });

  const configRef = useRef({
    courseWidth: courseData.courseWidth,
    courseDistance,
    runnerNames,
    trackedRunnerIds,
  });
  configRef.current = {
    courseWidth: courseData.courseWidth,
    courseDistance,
    runnerNames,
    trackedRunnerIds,
  };

  const repaintPack = useRef(() => {});

  const paintWithState = useRef(
    (positions: Record<number, number>, lanes: Record<number, number>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = globalThis.devicePixelRatio || 1;
      const { width, height } = sizeRef.current;
      const cfg = configRef.current;
      paintTrackPackZoom({
        ctx,
        dpr,
        measuredWidth: width,
        measuredHeight: height,
        courseWidth: cfg.courseWidth,
        courseDistance: cfg.courseDistance,
        runnerPositions: positions,
        runnerLanes: lanes,
        runnerNames: cfg.runnerNames,
        trackedRunnerIds: cfg.trackedRunnerIds,
      });
    },
  );

  repaintPack.current = () => {
    const state = usePlaybackStore.getState();
    const positions = getRunnerPositionsAtTick(
      state.results,
      state.selectedRound,
      state.currentTick,
    );
    const lanes = getRunnerLanesAtTick(state.results, state.selectedRound, state.currentTick);
    paintWithState.current(positions, lanes);
  };

  useEffect(() => {
    repaintPack.current();
  }, [courseData.courseWidth, courseDistance, runnerNames, trackedRunnerIds]);

  useEffect(() => {
    const unsub = usePlaybackStore.subscribe((state, prev) => {
      if (state.currentTick !== prev.currentTick || state.selectedRound !== prev.selectedRound) {
        repaintPack.current();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const rw = rect.width;
      const rh = rect.height;
      const aspect = PACK_CANVAS_W / PACK_CANVAS_H;
      let width: number;
      let height: number;
      if (rw / rh > aspect) {
        height = rh;
        width = rh * aspect;
      } else {
        width = rw;
        height = rw / aspect;
      }
      sizeRef.current = { width, height };
      repaintPack.current();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      repaintPack.current();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-[120px] min-h-[96px] max-h-[40vh] w-full shrink-0 items-center justify-center border-t border-border/70 bg-muted/20',
        className,
      )}
      aria-label="Pack view (magnified)"
    >
      <canvas ref={canvasRef} className="block max-h-full max-w-full" />
    </div>
  );
});
