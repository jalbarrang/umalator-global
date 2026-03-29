import { memo, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import {
  PHASE_COLORS,
  PHASE_STYLES,
  RUNNER_COLORS,
  TERRAIN_COLOR,
  TERRAIN_LINE_COLOR,
} from '@/modules/race-sim/constants';
import {
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { slopeValueToPercentage } from '@/modules/racetrack/types';

type TrackGraphViewProps = {
  courseData: CourseData;
  runnerNames?: Record<number, string>;
  trackedRunnerIds?: number[];
  viewStart?: number;
  viewEnd?: number;
  className?: string;
};

type SlopePoint = { x: number; y: number; distance: number };
type PhaseRegion = { label: string; start: number; end: number; fill: string; stroke: string };

const CANVAS_W = 920;
const CANVAS_H = 300;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const CHART_PAD_TOP = 36;
const CHART_PAD_BOTTOM = 44;
const DRAW_W = CANVAS_W - PAD_LEFT - PAD_RIGHT;
const CHART_Y_END = CANVAS_H - CHART_PAD_BOTTOM;
const AXIS_Y = CHART_Y_END + 14;
const SLOPE_MAX_HEIGHT = 50;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function buildPhaseRegions(distance: number): PhaseRegion[] {
  const p1 = CourseHelpers.phaseStart(distance, 1);
  const p2 = CourseHelpers.phaseStart(distance, 2);
  const p3 = CourseHelpers.phaseStart(distance, 3);
  const boundaries = [0, p1, p2, p3, distance];
  return PHASE_STYLES.map((s, i) => ({
    label: s.label,
    start: boundaries[i],
    end: boundaries[i + 1],
    fill: s.fill,
    stroke: s.stroke,
  }));
}

function buildSlopePoints(
  courseData: CourseData,
  viewStart: number,
  viewEnd: number,
): SlopePoint[] {
  const distance = Math.max(courseData.distance, 1);
  const clampedStart = clamp(viewStart, 0, distance);
  const clampedEnd = clamp(viewEnd, clampedStart + 1e-6, distance);
  const sorted = [...courseData.slopes].sort((a, b) => a.start - b.start);

  const segs: Array<{ start: number; end: number; slope: number }> = [];
  let cur = 0;
  for (const s of sorted) {
    const start = clamp(s.start, 0, distance);
    const end = clamp(s.start + s.length, 0, distance);
    if (start > cur) {
      segs.push({ start: cur, end: start, slope: 0 });
    }
    if (end > start) {
      segs.push({ start, end, slope: s.slope });
      cur = end;
    }
  }
  if (cur < distance) {
    segs.push({ start: cur, end: distance, slope: 0 });
  }
  if (segs.length === 0) {
    segs.push({ start: 0, end: distance, slope: 0 });
  }

  const elevationAt = (position: number): number => {
    let elevation = 0;
    for (const seg of segs) {
      const slope = slopeValueToPercentage(seg.slope);
      if (position <= seg.start) {
        return elevation;
      }
      if (position < seg.end) {
        return elevation + slope * (position - seg.start);
      }
      elevation += slope * (seg.end - seg.start);
    }
    return elevation;
  };

  const breakpoints = new Set<number>([clampedStart, clampedEnd]);
  for (const seg of segs) {
    if (seg.start > clampedStart && seg.start < clampedEnd) {
      breakpoints.add(seg.start);
    }
    if (seg.end > clampedStart && seg.end < clampedEnd) {
      breakpoints.add(seg.end);
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
  const slopeBaseY = CHART_Y_END;

  return sortedBreakpoints.map((distancePoint, idx) => ({
    x: PAD_LEFT + ((distancePoint - clampedStart) / viewDistance) * DRAW_W,
    y: slopeBaseY - ((elevations[idx] - minElevation) / range) * SLOPE_MAX_HEIGHT,
    distance: distancePoint,
  }));
}

function interpolateY(pts: SlopePoint[], x: number): number {
  if (pts.length === 0) return CHART_Y_END;
  if (x <= pts[0].x) return pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x <= pts[i + 1].x) {
      const t = (x - pts[i].x) / Math.max(pts[i + 1].x - pts[i].x, 1e-6);
      return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
    }
  }
  return pts[pts.length - 1].y;
}

function resolvedColor(cssVar: string): string {
  if (typeof document === 'undefined') return '#888';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (!raw) return '#888';
  return `hsl(${raw})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function distanceToCanvasX(distance: number, viewStart: number, viewDistance: number): number {
  return PAD_LEFT + ((distance - viewStart) / viewDistance) * DRAW_W;
}

function getTickStep(viewDistance: number): number {
  if (viewDistance <= 300) return 25;
  if (viewDistance <= 600) return 50;
  if (viewDistance <= 1200) return 100;
  if (viewDistance <= 2400) return 200;
  return 400;
}

function paintCanvas(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  measuredWidth: number,
  measuredHeight: number,
  phaseRegions: PhaseRegion[],
  slopePoints: SlopePoint[],
  runnerPositions: Record<number, number>,
  runnerNames: Record<number, string>,
  trackedRunnerIds: number[],
  viewStart: number,
  viewEnd: number,
) {
  const viewDistance = Math.max(viewEnd - viewStart, 1e-6);

  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;

  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / CANVAS_W), dpr * (measuredHeight / CANVAS_H));

  const colorMuted = resolvedColor('--muted-foreground');
  const colorBorder = resolvedColor('--border');
  const colorPrimary = resolvedColor('--primary');
  const colorBg = resolvedColor('--background');

  for (let phaseIdx = 0; phaseIdx < phaseRegions.length; phaseIdx++) {
    const phase = phaseRegions[phaseIdx];
    const phaseColor = PHASE_COLORS[phaseIdx];

    const clippedStart = clamp(phase.start, viewStart, viewEnd);
    const clippedEnd = clamp(phase.end, viewStart, viewEnd);
    if (clippedEnd <= clippedStart) {
      continue;
    }

    const x = distanceToCanvasX(clippedStart, viewStart, viewDistance);
    const xEnd = distanceToCanvasX(clippedEnd, viewStart, viewDistance);
    const width = Math.max(1, xEnd - x);

    drawRoundedRect(ctx, x, CHART_PAD_TOP, width, CHART_Y_END - CHART_PAD_TOP, 4);
    ctx.fillStyle = phase.fill;
    ctx.fill();
    ctx.strokeStyle = phase.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (phaseColor) {
      const stripH = 3;
      ctx.fillStyle = phaseColor.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, CHART_Y_END - stripH, width, stripH);
      ctx.globalAlpha = 1;
    }

    if (width > 48) {
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillStyle = phaseColor ? phaseColor.accent : colorMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(phase.label, x + width / 2, CHART_PAD_TOP - 6);
    }
  }

  if (slopePoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(slopePoints[0].x, CHART_Y_END);
    for (const pt of slopePoints) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(slopePoints[slopePoints.length - 1].x, CHART_Y_END);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, CHART_PAD_TOP, 0, CHART_Y_END);
    grad.addColorStop(0, `${TERRAIN_COLOR.replace('rgb', 'rgba').replace(')', ', 0.35)')}`);
    grad.addColorStop(1, `${TERRAIN_COLOR.replace('rgb', 'rgba').replace(')', ', 0.08)')}`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (slopePoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(slopePoints[0].x, slopePoints[0].y);
    for (let i = 1; i < slopePoints.length; i++) {
      ctx.lineTo(slopePoints[i].x, slopePoints[i].y);
    }
    ctx.strokeStyle = TERRAIN_LINE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const trackedSet = new Set(trackedRunnerIds);
  const ids: number[] = [];
  const allKeys = new Set([
    ...Object.keys(runnerNames).map(Number),
    ...Object.keys(runnerPositions).map(Number),
    ...trackedRunnerIds,
  ]);
  for (let i = 0; i < 9; i++) allKeys.add(i);
  for (const id of allKeys) ids.push(id);
  ids.sort((a, b) => a - b);
  const runnerIds = ids.slice(0, 9);

  type MarkerInfo = {
    id: number;
    pos: number;
    x: number;
    y: number;
    color: string;
    tracked: boolean;
    name: string;
  };

  const occupancy = new Map<number, number>();
  const markers: MarkerInfo[] = [];

  for (const rid of runnerIds) {
    const pos = clamp(runnerPositions[rid] ?? viewStart, viewStart, viewEnd);
    const mx = distanceToCanvasX(pos, viewStart, viewDistance);
    const bucket = Math.round(mx / 14);
    const stack = occupancy.get(bucket) ?? 0;
    occupancy.set(bucket, stack + 1);
    const yBase = interpolateY(slopePoints, mx) - 12;
    markers.push({
      id: rid,
      pos,
      x: mx,
      y: yBase - stack * 16,
      color: RUNNER_COLORS[rid % RUNNER_COLORS.length],
      tracked: trackedSet.has(rid),
      name: runnerNames[rid] ?? `Runner ${rid + 1}`,
    });
  }

  markers.sort((a, b) => a.pos - b.pos);

  const leaderDist = markers.length > 0 ? Math.max(...markers.map((m) => m.pos)) : viewStart;
  const leaderX = distanceToCanvasX(leaderDist, viewStart, viewDistance);

  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = colorPrimary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leaderX, CHART_PAD_TOP);
  ctx.lineTo(leaderX, AXIS_Y);
  ctx.stroke();
  ctx.restore();

  ctx.font = '700 10px system-ui, sans-serif';
  ctx.fillStyle = colorPrimary;
  const leaderRight = PAD_LEFT + DRAW_W;
  ctx.textAlign = leaderX > leaderRight - 90 ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Leader ${leaderDist.toFixed(0)}m`,
    leaderX + (leaderX > leaderRight - 90 ? -6 : 6),
    CHART_PAD_TOP + 2,
  );

  for (const m of markers) {
    const r = 9;

    if (m.tracked) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = colorPrimary;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = colorBg;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m.id + 1}`, m.x, m.y + 0.5);
  }

  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, AXIS_Y);
  ctx.lineTo(PAD_LEFT + DRAW_W, AXIS_Y);
  ctx.strokeStyle = colorBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const tickStep = getTickStep(viewDistance);
  const firstTick = Math.ceil(viewStart / tickStep) * tickStep;
  const ticks = new Set<number>([Math.round(viewStart), Math.round(viewEnd)]);
  for (let tick = firstTick; tick <= viewEnd + 1e-6; tick += tickStep) {
    ticks.add(Math.round(tick));
  }
  const sortedTicks = [...ticks].sort((a, b) => a - b);

  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = colorMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const tick of sortedTicks) {
    const clampedTick = clamp(tick, viewStart, viewEnd);
    const tickX = distanceToCanvasX(clampedTick, viewStart, viewDistance);
    ctx.beginPath();
    ctx.moveTo(tickX, AXIS_Y);
    ctx.lineTo(tickX, AXIS_Y + 6);
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(`${Math.round(clampedTick)}m`, tickX, AXIS_Y + 9);
  }

  const rightBoundaryX = PAD_LEFT + DRAW_W;
  ctx.save();
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = colorMuted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightBoundaryX, CHART_PAD_TOP);
  ctx.lineTo(rightBoundaryX, CHART_Y_END);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export const TrackGraphView = memo<TrackGraphViewProps>(function TrackGraphView(props) {
  const {
    courseData,
    runnerNames = {},
    trackedRunnerIds = [],
    viewStart,
    viewEnd,
    className,
  } = props;
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
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = sizeRef.current;
    const cfg = configRef.current;

    paintCanvas(
      ctx,
      dpr,
      width,
      height,
      cfg.phaseRegions,
      cfg.slopePoints,
      positions,
      cfg.runnerNames,
      cfg.trackedRunnerIds,
      cfg.clampedViewStart,
      cfg.clampedViewEnd,
    );
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
    const unsub = usePlaybackStore.subscribe((state, prev) => {
      if (state.currentTick !== prev.currentTick || state.selectedRound !== prev.selectedRound) {
        const positions = getRunnerPositionsAtTick(
          state.results,
          state.selectedRound,
          state.currentTick,
        );
        paintWithPositions.current(positions);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width === 0) return;
      sizeRef.current = { width: rect.width, height: rect.width * (CANVAS_H / CANVAS_W) };
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

  return (
    <div ref={containerRef} className={cn('min-w-0 max-w-full', className)}>
      <canvas
        ref={canvasRef}
        className="block h-auto w-full"
        aria-label="Track graph playback view"
      />
    </div>
  );
});
