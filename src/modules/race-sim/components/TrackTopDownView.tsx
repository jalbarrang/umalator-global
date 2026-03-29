import { memo, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData, IOrientation } from '@/lib/sunday-tools/course/definitions';
import { OrientationName } from '@/lib/sunday-tools/course/definitions';
import { PHASE_STYLES, RUNNER_COLORS } from '@/modules/race-sim/constants';
import {
  getRunnerLanesAtTick,
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import {
  buildCourseTrackPath,
  interpolateTrackPoint,
  outwardFromTrackPoint,
  type BuiltTrackPath,
  type TrackPathPoint,
} from '@/modules/race-sim/utils/track-path';
import { useShallow } from 'zustand/shallow';

type TrackTopDownViewProps = {
  courseData: CourseData;
  runnerNames?: Record<number, string>;
  trackedRunnerIds?: number[];
  viewStart?: number;
  viewEnd?: number;
  className?: string;
};

const CANVAS_W = 560;
const CANVAS_H = 380;
const PAD = 28;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvedColor(cssVar: string): string {
  if (typeof document === 'undefined') return '#888';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (!raw) return '#888';
  return `hsl(${raw})`;
}

function formatGap(distance: number): string {
  if (distance <= 0) return '--';
  return `+${distance.toFixed(1)}m`;
}

function formatLaneMeters(lane: number | undefined): string {
  if (lane == null || Number.isNaN(lane)) return '—';
  return `${lane.toFixed(2)}m`;
}

/** Map a distance along the physical loop to a race distance in [0, courseDistance] (first lap that covers that loop point). */
function representativeRaceDistanceForLoop(
  built: BuiltTrackPath,
  loopDist: number,
  courseDistance: number,
): number {
  const { lapLength, raceStartOnTrack, wraps } = built;
  if (!wraps) return clamp(loopDist, 0, courseDistance);
  if (lapLength < 1e-9) return clamp(loopDist, 0, courseDistance);
  const kMin = Math.ceil((-raceStartOnTrack - loopDist) / lapLength);
  const kMax = Math.floor((courseDistance - raceStartOnTrack - loopDist) / lapLength);
  if (kMin <= kMax) {
    return clamp(raceStartOnTrack + loopDist + kMin * lapLength, 0, courseDistance);
  }
  return clamp(raceStartOnTrack + loopDist, 0, courseDistance);
}

function phaseIndexAtRaceDistance(raceDist: number, courseDistance: number): 0 | 1 | 2 | 3 {
  const p1 = CourseHelpers.phaseStart(courseDistance, 1);
  const p2 = CourseHelpers.phaseStart(courseDistance, 2);
  const p3 = CourseHelpers.phaseStart(courseDistance, 3);
  if (raceDist < p1) return 0;
  if (raceDist < p2) return 1;
  if (raceDist < p3) return 2;
  return 3;
}

function formatLapTotal(numLaps: number): string {
  const r = Math.round(numLaps);
  if (Math.abs(numLaps - r) < 1e-6) return String(r);
  return numLaps.toFixed(1);
}

function drawCheckeredLineAcrossTrack(
  ctx: CanvasRenderingContext2D,
  inner: { cx: number; cy: number },
  outer: { cx: number; cy: number },
  squares: number,
): void {
  const dx = outer.cx - inner.cx;
  const dy = outer.cy - inner.cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const perpScale = 2.5 / len;
  const px = -dy * perpScale;
  const py = dx * perpScale;
  for (let s = 0; s < squares; s++) {
    const t0 = s / squares;
    const t1 = (s + 1) / squares;
    const x0 = inner.cx + dx * t0;
    const y0 = inner.cy + dy * t0;
    const x1 = inner.cx + dx * t1;
    const y1 = inner.cy + dy * t1;
    ctx.fillStyle = s % 2 === 0 ? 'rgba(15,23,42,0.92)' : 'rgba(248,250,252,0.95)';
    ctx.beginPath();
    ctx.moveTo(x0 + px, y0 + py);
    ctx.lineTo(x1 + px, y1 + py);
    ctx.lineTo(x1 - px, y1 - py);
    ctx.lineTo(x0 - px, y0 - py);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(15,23,42,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(inner.cx, inner.cy);
  ctx.lineTo(outer.cx, outer.cy);
  ctx.stroke();
}

function drawStartGateAcrossTrack(
  ctx: CanvasRenderingContext2D,
  inner: { cx: number; cy: number },
  outer: { cx: number; cy: number },
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(inner.cx, inner.cy);
  ctx.lineTo(outer.cx, outer.cy);
  ctx.stroke();
  ctx.restore();
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type ViewportState = { zoom: number; panX: number; panY: number };
type CanvasTransform = {
  bounds: Bounds;
  scale: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
};

function computeBounds(inner: TrackPathPoint[], courseWidth: number, turnSign: number): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of inner) {
    const o = outwardFromTrackPoint(p, turnSign);
    for (const t of [0, 1]) {
      const w = t * courseWidth;
      const x = p.x + w * o.x;
      const y = p.y + w * o.y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  return { minX, maxX, minY, maxY };
}

function buildVisibleTrackPoints(
  builtTrack: BuiltTrackPath,
  courseDistance: number,
  viewStart: number,
  viewEnd: number,
): TrackPathPoint[] {
  if (builtTrack.wraps || viewStart <= 0 && viewEnd >= courseDistance) {
    return builtTrack.points;
  }

  const start = clamp(viewStart, 0, courseDistance);
  const end = clamp(viewEnd, start, courseDistance);
  const visible = builtTrack.points.filter((point) => point.distance >= start && point.distance <= end);
  const startPoint = interpolateTrackPoint(builtTrack, start);
  const endPoint = interpolateTrackPoint(builtTrack, end);

  return [
    { ...startPoint, distance: start },
    ...visible.filter((point) => point.distance > start && point.distance < end),
    { ...endPoint, distance: end },
  ];
}

function createCanvasTransform(bounds: Bounds, viewport: ViewportState): CanvasTransform {
  const bw = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const bh = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const drawW = CANVAS_W - PAD * 2;
  const drawH = CANVAS_H - PAD * 2;
  const scale = Math.min(drawW / bw, drawH / bh);
  const contentW = bw * scale;
  const contentH = bh * scale;

  return {
    bounds,
    scale,
    offsetX: PAD + (drawW - contentW) / 2,
    offsetY: PAD + (drawH - contentH) / 2,
    zoom: viewport.zoom,
    panX: viewport.panX,
    panY: viewport.panY,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
  };
}

function toCanvas(x: number, y: number, transform: CanvasTransform): { cx: number; cy: number } {
  const baseX = transform.offsetX + (x - transform.bounds.minX) * transform.scale;
  const baseY = transform.offsetY + (transform.bounds.maxY - y) * transform.scale;
  const centerX = transform.canvasWidth / 2;
  const centerY = transform.canvasHeight / 2;

  return {
    cx: centerX + (baseX - centerX) * transform.zoom + transform.panX,
    cy: centerY + (baseY - centerY) * transform.zoom + transform.panY,
  };
}

function clampZoom(zoom: number): number {
  return clamp(zoom, 0.6, 6);
}

function pointerToVirtualCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / Math.max(rect.width, 1)) * CANVAS_W,
    y: ((clientY - rect.top) / Math.max(rect.height, 1)) * CANVAS_H,
  };
}

function zoomViewportAroundPoint(
  viewport: ViewportState,
  point: { x: number; y: number },
  factor: number,
): ViewportState {
  const nextZoom = clampZoom(viewport.zoom * factor);
  const zoomRatio = nextZoom / viewport.zoom;
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;

  return {
    zoom: nextZoom,
    panX: point.x - centerX - (point.x - centerX - viewport.panX) * zoomRatio,
    panY: point.y - centerY - (point.y - centerY - viewport.panY) * zoomRatio,
  };
}

type PhaseColoredSegmentsParams = {
  ctx: CanvasRenderingContext2D;
  inner: TrackPathPoint[];
  innerPts: Array<{ x: number; y: number }>;
  outerPts: Array<{ x: number; y: number }>;
  transform: CanvasTransform;
  builtTrack: BuiltTrackPath;
  courseDistance: number;
};

function paintPhaseColoredSegments(p: PhaseColoredSegmentsParams): void {
  const { ctx, inner, innerPts, outerPts, transform, builtTrack, courseDistance } = p;
  for (let i = 0; i < innerPts.length - 1; i++) {
    const p0 = inner[i]!;
    const p1 = inner[i + 1]!;
    const midLoop = (p0.distance + p1.distance) / 2;
    const raceD = representativeRaceDistanceForLoop(builtTrack, midLoop, courseDistance);
    const ph = phaseIndexAtRaceDistance(raceD, courseDistance);
    const fill = PHASE_STYLES[ph]?.fill ?? 'rgba(128,128,128,0.12)';
    const a = toCanvas(innerPts[i].x, innerPts[i].y, transform);
    const b = toCanvas(innerPts[i + 1].x, innerPts[i + 1].y, transform);
    const ob = toCanvas(outerPts[i + 1].x, outerPts[i + 1].y, transform);
    const oa = toCanvas(outerPts[i].x, outerPts[i].y, transform);
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.lineTo(ob.cx, ob.cy);
    ctx.lineTo(oa.cx, oa.cy);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function strokeTrackOutlineAndRails(
  ctx: CanvasRenderingContext2D,
  innerPts: Array<{ x: number; y: number }>,
  outerPts: Array<{ x: number; y: number }>,
  transform: CanvasTransform,
  colorBorder: string,
  colorMuted: string,
): void {
  const first = toCanvas(innerPts[0].x, innerPts[0].y, transform);
  ctx.beginPath();
  ctx.moveTo(first.cx, first.cy);
  for (let i = 1; i < innerPts.length; i++) {
    const c = toCanvas(innerPts[i].x, innerPts[i].y, transform);
    ctx.lineTo(c.cx, c.cy);
  }
  for (let i = outerPts.length - 1; i >= 0; i--) {
    const c = toCanvas(outerPts[i].x, outerPts[i].y, transform);
    ctx.lineTo(c.cx, c.cy);
  }
  ctx.closePath();
  ctx.strokeStyle = colorBorder;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(first.cx, first.cy);
  for (let i = 1; i < innerPts.length; i++) {
    const c = toCanvas(innerPts[i].x, innerPts[i].y, transform);
    ctx.lineTo(c.cx, c.cy);
  }
  ctx.strokeStyle = colorMuted;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  const of = toCanvas(outerPts[0].x, outerPts[0].y, transform);
  ctx.moveTo(of.cx, of.cy);
  for (let i = 1; i < outerPts.length; i++) {
    const c = toCanvas(outerPts[i].x, outerPts[i].y, transform);
    ctx.lineTo(c.cx, c.cy);
  }
  ctx.strokeStyle = colorMuted;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

type PhaseDividersSfParams = {
  ctx: CanvasRenderingContext2D;
  builtTrack: BuiltTrackPath;
  courseWidth: number;
  turnSign: number;
  courseDistance: number;
  transform: CanvasTransform;
  colorMuted: string;
};

function paintPhaseDividersStartFinish(p: PhaseDividersSfParams): void {
  const { ctx, builtTrack, courseWidth, turnSign, courseDistance, transform, colorMuted } = p;
  const phaseBoundaries = [0, 1, 2, 3].map((ph) =>
    CourseHelpers.phaseStart(courseDistance, ph as 0 | 1 | 2 | 3),
  );
  for (const db of phaseBoundaries) {
    if (db <= 0 || db >= courseDistance) continue;
    const pt = interpolateTrackPoint(builtTrack, db);
    const o = outwardFromTrackPoint(pt, turnSign);
    const c1 = toCanvas(pt.x, pt.y, transform);
    const c2 = toCanvas(pt.x + courseWidth * o.x, pt.y + courseWidth * o.y, transform);
    const ph = phaseIndexAtRaceDistance(db, courseDistance);
    const stroke = PHASE_STYLES[ph]?.stroke ?? `${colorMuted}99`;
    ctx.beginPath();
    ctx.moveTo(c1.cx, c1.cy);
    ctx.lineTo(c2.cx, c2.cy);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const pStart = interpolateTrackPoint(builtTrack, 0);
  const oStart = outwardFromTrackPoint(pStart, turnSign);
  drawStartGateAcrossTrack(
    ctx,
    toCanvas(pStart.x, pStart.y, transform),
    toCanvas(pStart.x + courseWidth * oStart.x, pStart.y + courseWidth * oStart.y, transform),
  );

  const pFinish = interpolateTrackPoint(builtTrack, courseDistance);
  const oFinish = outwardFromTrackPoint(pFinish, turnSign);
  drawCheckeredLineAcrossTrack(
    ctx,
    toCanvas(pFinish.x, pFinish.y, transform),
    toCanvas(pFinish.x + courseWidth * oFinish.x, pFinish.y + courseWidth * oFinish.y, transform),
    7,
  );
}

type RunnerMarker = {
  id: number;
  cx: number;
  cy: number;
  pos: number;
  color: string;
  name: string;
  isTracked: boolean;
};

type BuildRunnerMarkersParams = {
  runnerIds: number[];
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  runnerNames: Record<number, string>;
  tracked: Set<number>;
  builtTrack: BuiltTrackPath;
  courseDistance: number;
  turnSign: number;
  transform: CanvasTransform;
};

function buildRunnerMarkers(p: BuildRunnerMarkersParams): RunnerMarker[] {
  const {
    runnerIds,
    runnerPositions,
    runnerLanes,
    runnerNames,
    tracked,
    builtTrack,
    courseDistance,
    turnSign,
    transform,
  } = p;
  const markers: RunnerMarker[] = [];
  for (const rid of runnerIds) {
    const pos = runnerPositions[rid];
    if (pos == null) continue;
    const lane = runnerLanes[rid] ?? 0;
    const raceDist = clamp(pos, 0, courseDistance);
    const pt = interpolateTrackPoint(builtTrack, raceDist);
    const o = outwardFromTrackPoint(pt, turnSign);
    const wx = pt.x + lane * o.x;
    const wy = pt.y + lane * o.y;
    const { cx, cy } = toCanvas(wx, wy, transform);
    markers.push({
      id: rid,
      cx,
      cy,
      pos,
      color: RUNNER_COLORS[rid % RUNNER_COLORS.length],
      name: runnerNames[rid] ?? `Runner ${rid + 1}`,
      isTracked: tracked.has(rid),
    });
  }
  markers.sort((a, b) => a.pos - b.pos);
  const occupancy = new Map<string, number>();
  for (const m of markers) {
    const key = `${Math.round(m.cx / 10)}_${Math.round(m.cy / 10)}`;
    const stack = occupancy.get(key) ?? 0;
    occupancy.set(key, stack + 1);
    m.cy -= stack * 14;
  }
  return markers;
}

function paintRunnerMarkersOnCanvas(
  ctx: CanvasRenderingContext2D,
  markers: RunnerMarker[],
  colorBg: string,
  colorPrimary: string,
): void {
  for (const m of markers) {
    const r = 9;
    if (m.isTracked) {
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = colorPrimary;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = colorBg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m.id + 1}`, m.cx, m.cy + 0.5);
  }
}

type PaintTrackTopDownParams = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  viewport: ViewportState;
  builtTrack: BuiltTrackPath;
  courseWidth: number;
  turnSign: number;
  courseDistance: number;
  viewStart: number;
  viewEnd: number;
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  turn: IOrientation;
};

function paintTrackTopDown(params: PaintTrackTopDownParams) {
  const {
    ctx,
    dpr,
    measuredWidth,
    measuredHeight,
    viewport,
    builtTrack,
    courseWidth,
    turnSign,
    courseDistance,
    viewStart,
    viewEnd,
    runnerPositions,
    runnerLanes,
    runnerNames,
    trackedRunnerIds,
    turn,
  } = params;

  const inner = builtTrack.points;

  const colorMuted = resolvedColor('--muted-foreground');
  const colorBorder = resolvedColor('--border');
  const colorBg = resolvedColor('--background');
  const colorPrimary = resolvedColor('--primary');

  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;
  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / CANVAS_W), dpr * (measuredHeight / CANVAS_H));

  const visiblePoints = buildVisibleTrackPoints(builtTrack, courseDistance, viewStart, viewEnd);
  const bounds = computeBounds(visiblePoints.length > 1 ? visiblePoints : inner, courseWidth, turnSign);
  const transform = createCanvasTransform(bounds, viewport);

  const outerPts: Array<{ x: number; y: number }> = [];
  const innerPts: Array<{ x: number; y: number }> = [];
  for (const p of inner) {
    const o = outwardFromTrackPoint(p, turnSign);
    innerPts.push({ x: p.x, y: p.y });
    outerPts.push({ x: p.x + courseWidth * o.x, y: p.y + courseWidth * o.y });
  }

  paintPhaseColoredSegments({
    ctx,
    inner,
    innerPts,
    outerPts,
    transform,
    builtTrack,
    courseDistance,
  });
  strokeTrackOutlineAndRails(ctx, innerPts, outerPts, transform, colorBorder, colorMuted);
  paintPhaseDividersStartFinish({
    ctx,
    builtTrack,
    courseWidth,
    turnSign,
    courseDistance,
    transform,
    colorMuted,
  });

  const tracked = new Set(trackedRunnerIds);
  const ids = new Set<number>();
  for (const k of Object.keys(runnerNames)) ids.add(Number(k));
  for (const k of Object.keys(runnerPositions)) ids.add(Number(k));
  for (const id of trackedRunnerIds) ids.add(id);
  for (let i = 0; i < 9; i++) ids.add(i);
  const runnerIds = [...ids].sort((a, b) => a - b).slice(0, 9);

  const markers = buildRunnerMarkers({
    runnerIds,
    runnerPositions,
    runnerLanes,
    runnerNames,
    tracked,
    builtTrack,
    courseDistance,
    turnSign,
    transform,
  });
  paintRunnerMarkersOnCanvas(ctx, markers, colorBg, colorPrimary);

  ctx.font = '600 10px system-ui, sans-serif';
  ctx.fillStyle = colorMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(OrientationName[turn as keyof typeof OrientationName] ?? '', PAD, 8);

  const { lapLength, numLaps, raceStartOnTrack } = builtTrack;
  if (builtTrack.wraps && numLaps > 1 + 1e-6) {
    let leaderPos = 0;
    for (const v of Object.values(runnerPositions)) {
      if (v != null) leaderPos = Math.max(leaderPos, v);
    }
    leaderPos = clamp(leaderPos, 0, courseDistance);
    const progressed = Math.max(0, leaderPos - raceStartOnTrack);
    const lapIdx =
      lapLength > 1e-9 ? Math.floor(progressed / lapLength) + 1 : 1;
    const currentLap = Math.min(
      Math.max(1, lapIdx),
      Math.max(1, Math.ceil(numLaps)),
    );
    ctx.fillStyle = colorMuted;
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillText(
      `Lap ${currentLap} / ${formatLapTotal(numLaps)}`,
      PAD,
      22,
    );
  }

  ctx.restore();
}

const TrackTopDownLegend = memo(function TrackTopDownLegend(props: {
  courseData: CourseData;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
}) {
  const { courseData, runnerNames, trackedRunnerIds } = props;
  const { results, selectedRound, currentTick } = usePlaybackStore(
    useShallow((s) => ({
      results: s.results,
      selectedRound: s.selectedRound,
      currentTick: s.currentTick,
    })),
  );

  const runnerPositions = useMemo(
    () => getRunnerPositionsAtTick(results, selectedRound, currentTick),
    [results, selectedRound, currentTick],
  );
  const runnerLanes = useMemo(
    () => getRunnerLanesAtTick(results, selectedRound, currentTick),
    [results, selectedRound, currentTick],
  );

  const rows = useMemo(() => {
    const ids = new Set<number>();
    for (const k of Object.keys(runnerNames)) ids.add(Number(k));
    for (const k of Object.keys(runnerPositions)) ids.add(Number(k));
    for (const id of trackedRunnerIds) ids.add(id);
    for (let i = 0; i < 9; i++) ids.add(i);
    const base = [...ids]
      .sort((a, b) => a - b)
      .slice(0, 9)
      .map((runnerId) => {
        const position = clamp(runnerPositions[runnerId] ?? 0, 0, courseData.distance);
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
  }, [runnerNames, runnerPositions, runnerLanes, trackedRunnerIds, courseData.distance]);

  return (
    <div className="flex w-52 shrink-0 flex-col gap-1 border-l border-border/60 pl-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Order
      </div>
      <ul className="max-h-[320px] space-y-1 overflow-y-auto text-xs">
        {rows.map((row) => (
          <li
            key={row.runnerId}
            className={cn(
              'flex items-baseline justify-between gap-2 rounded-md px-1 py-0.5',
              row.isTracked && 'bg-primary/10',
            )}
          >
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] text-muted-foreground">{row.rank}.</span>{' '}
              <span
                className={cn('font-medium', row.isTracked ? 'text-primary' : 'text-foreground')}
              >
                {row.name}
              </span>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                inner +{formatLaneMeters(row.lane)}
              </div>
            </div>
            <div className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
              {formatGap(row.gapFromLeader)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const TrackTopDownView = memo<TrackTopDownViewProps>(function TrackTopDownView(props) {
  const {
    courseData,
    runnerNames = {},
    trackedRunnerIds = [],
    viewStart,
    viewEnd,
    className,
  } = props;

  const courseDistance = Math.max(courseData.distance, 1);
  const courseWidth = courseData.courseWidth;
  const clampedViewStart = clamp(viewStart ?? 0, 0, courseDistance);
  const clampedViewEnd = clamp(viewEnd ?? courseDistance, clampedViewStart, courseDistance);

  const builtTrack = useMemo(() => buildCourseTrackPath(courseData), [courseData]);
  const { points, turnSign } = builtTrack;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: CANVAS_W, height: CANVAS_H });
  const viewportRef = useRef<ViewportState>({ zoom: 1, panX: 0, panY: 0 });
  const dragRef = useRef<{ pointerId: number | null; x: number; y: number }>({
    pointerId: null,
    x: 0,
    y: 0,
  });

  const configRef = useRef({
    builtTrack,
    turnSign,
    courseWidth,
    courseDistance,
    viewStart: clampedViewStart,
    viewEnd: clampedViewEnd,
    runnerNames,
    trackedRunnerIds,
    turn: courseData.turn,
  });
  configRef.current = {
    builtTrack,
    turnSign,
    courseWidth,
    courseDistance,
    viewStart: clampedViewStart,
    viewEnd: clampedViewEnd,
    runnerNames,
    trackedRunnerIds,
    turn: courseData.turn,
  };

  const repaintCurrent = useRef(() => {});

  const paintWithState = useRef(
    (positions: Record<number, number>, lanes: Record<number, number>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = sizeRef.current;
      const cfg = configRef.current;
      paintTrackTopDown({
        ctx,
        dpr,
        measuredWidth: width,
        measuredHeight: height,
        viewport: viewportRef.current,
        builtTrack: cfg.builtTrack,
        courseWidth: cfg.courseWidth,
        turnSign: cfg.turnSign,
        courseDistance: cfg.courseDistance,
        viewStart: cfg.viewStart,
        viewEnd: cfg.viewEnd,
        runnerPositions: positions,
        runnerLanes: lanes,
        runnerNames: cfg.runnerNames,
        trackedRunnerIds: cfg.trackedRunnerIds,
        turn: cfg.turn,
      });
    },
  );
  repaintCurrent.current = () => {
    const state = usePlaybackStore.getState();
    const positions = getRunnerPositionsAtTick(state.results, state.selectedRound, state.currentTick);
    const lanes = getRunnerLanesAtTick(state.results, state.selectedRound, state.currentTick);
    paintWithState.current(positions, lanes);
  };

  useEffect(() => {
    viewportRef.current = { zoom: 1, panX: 0, panY: 0 };
    repaintCurrent.current();
  }, [
    points,
    turnSign,
    courseWidth,
    courseDistance,
    clampedViewStart,
    clampedViewEnd,
    runnerNames,
    trackedRunnerIds,
  ]);

  useEffect(() => {
    const unsub = usePlaybackStore.subscribe((state, prev) => {
      if (state.currentTick !== prev.currentTick || state.selectedRound !== prev.selectedRound) {
        repaintCurrent.current();
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
      repaintCurrent.current();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      repaintCurrent.current();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = pointerToVirtualCanvas(event.clientX, event.clientY, rect);
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      viewportRef.current = zoomViewportAroundPoint(viewportRef.current, point, factor);
      repaintCurrent.current();
    };

    const onPointerDown = (event: PointerEvent) => {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragRef.current.pointerId !== event.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      const dx = ((event.clientX - dragRef.current.x) / Math.max(rect.width, 1)) * CANVAS_W;
      const dy = ((event.clientY - dragRef.current.y) / Math.max(rect.height, 1)) * CANVAS_H;
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      viewportRef.current = {
        ...viewportRef.current,
        panX: viewportRef.current.panX + dx,
        panY: viewportRef.current.panY + dy,
      };
      repaintCurrent.current();
    };

    const endDrag = (event: PointerEvent) => {
      if (dragRef.current.pointerId !== event.pointerId) return;
      dragRef.current = { pointerId: null, x: 0, y: 0 };
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onDoubleClick = () => {
      viewportRef.current = { zoom: 1, panX: 0, panY: 0 };
      repaintCurrent.current();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('dblclick', onDoubleClick);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <div className="flex min-h-[320px] gap-2">
        <div ref={containerRef} className="min-w-0 flex-1">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full touch-none cursor-grab active:cursor-grabbing"
            aria-label="Top-down track view with runner positions and lanes"
          />
        </div>
        <TrackTopDownLegend
          courseData={courseData}
          runnerNames={runnerNames}
          trackedRunnerIds={trackedRunnerIds}
        />
      </div>
    </div>
  );
});
