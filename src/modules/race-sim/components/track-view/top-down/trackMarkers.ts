import { RUNNER_COLORS } from '@/modules/race-sim/constants';
import {
  interpolateTrackPoint,
  outwardFromTrackPoint,
  type BuiltTrackPath,
} from '@/modules/race-sim/utils/track-path';
import { toCanvas } from './canvasMath';
import {
  MAIN_MAP_PACK_MARKER,
  type CanvasTransform,
  type MapPinMarkerSpec,
  type RunnerMarker,
} from './shared';
import { clamp } from './utils';

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

export function buildRunnerMarkers(p: BuildRunnerMarkersParams): RunnerMarker[] {
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
    const { cx, cy } = toCanvas(pt.x + lane * o.x, pt.y + lane * o.y, transform);

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

  markers.sort((a, b) => {
    const dp = a.pos - b.pos;
    return Math.abs(dp) > 0.001 ? dp : a.id - b.id;
  });
  return markers;
}

export type LinearPackViewport = {
  distMin: number;
  distMax: number;
};

export function computeLinearPackViewport(p: {
  runnerPositions: Record<number, number>;
  runnerIds: number[];
  courseWidth: number;
  courseDistance: number;
}): LinearPackViewport | null {
  const { runnerPositions, runnerIds, courseWidth, courseDistance } = p;
  let minD = Infinity;
  let maxD = -Infinity;
  for (const rid of runnerIds) {
    const pos = runnerPositions[rid];
    if (pos == null) continue;
    const d = clamp(pos, 0, courseDistance);
    minD = Math.min(minD, d);
    maxD = Math.max(maxD, d);
  }
  if (!Number.isFinite(minD)) return null;

  const minSpan = Math.max(courseWidth * 3, 30);
  const dataSpan = Math.max(maxD - minD, 1e-6);
  let distMin = minD - 0.1 * dataSpan;
  let distMax = maxD + 0.1 * dataSpan;
  if (distMax - distMin < minSpan) {
    const c = (minD + maxD) / 2;
    distMin = c - minSpan / 2;
    distMax = c + minSpan / 2;
  }
  distMin = clamp(distMin, 0, courseDistance);
  distMax = clamp(distMax, 0, courseDistance);
  if (distMax - distMin < 1e-3) {
    const c = clamp((distMin + distMax) / 2, 0, courseDistance);
    distMin = clamp(c - minSpan / 2, 0, courseDistance);
    distMax = clamp(c + minSpan / 2, 0, courseDistance);
  }
  return { distMin, distMax };
}

export function buildLinearRunnerMarkers(p: {
  runnerIds: number[];
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  runnerNames: Record<number, string>;
  tracked: Set<number>;
  courseDistance: number;
  viewport: LinearPackViewport;
  canvasWidth: number;
  canvasHeight: number;
  pad: number;
}): RunnerMarker[] {
  const {
    runnerIds,
    runnerPositions,
    runnerLanes,
    runnerNames,
    tracked,
    courseDistance,
    viewport,
    canvasWidth,
    canvasHeight,
    pad,
  } = p;
  const span = Math.max(viewport.distMax - viewport.distMin, 1e-6);
  const drawW = canvasWidth - pad * 2;
  const centerY = canvasHeight * 0.52;
  const laneScale = 7;
  const outerR = 7 + 2.5;
  const minCy = pad + outerR;
  const maxCy = canvasHeight - pad - outerR;

  const markers: RunnerMarker[] = [];
  for (const rid of runnerIds) {
    const pos = runnerPositions[rid];
    if (pos == null) continue;

    const lane = runnerLanes[rid] ?? 0;
    const raceDist = clamp(pos, 0, courseDistance);
    const cx = pad + ((raceDist - viewport.distMin) / span) * drawW;
    const cy = clamp(centerY - lane * laneScale, minCy, maxCy);

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

  markers.sort((a, b) => {
    const dp = a.pos - b.pos;
    return Math.abs(dp) > 0.001 ? dp : a.id - b.id;
  });
  return markers;
}

function createArrowPath(
  cx: number,
  cy: number,
  halfWidth: number,
  height: number,
  notchDepth: number,
): Path2D {
  const path = new Path2D();
  const top = cy - height;
  path.moveTo(cx, cy);
  path.lineTo(cx - halfWidth, top);
  path.lineTo(cx - halfWidth * 0.3, top + notchDepth);
  path.lineTo(cx + halfWidth * 0.3, top + notchDepth);
  path.lineTo(cx + halfWidth, top);
  path.closePath();
  return path;
}

function renderMapPinMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spec: MapPinMarkerSpec,
  tracked: boolean,
): void {
  const { geometry, colors } = spec;
  const hw = geometry.headRadius;
  const h = geometry.headCenterYOffset;
  const notch = h * 0.25;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (tracked) {
    const extra = geometry.trackedOutlineExtra;
    const outerPath = createArrowPath(cx, cy + extra * 0.5, hw + extra, h + extra, notch);
    ctx.strokeStyle = colors.trackedStroke;
    ctx.lineWidth = geometry.trackedStrokeWidth;
    ctx.stroke(outerPath);
  }

  const arrowPath = createArrowPath(cx, cy, hw, h, notch);

  ctx.fillStyle = colors.fill;
  ctx.fill(arrowPath);
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = geometry.strokeWidth;
  ctx.stroke(arrowPath);

  ctx.fillStyle = colors.highlight;
  const hlR = geometry.highlightRadius;
  const hlCy = cy - h * 0.55;
  ctx.beginPath();
  ctx.arc(cx, hlCy, hlR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function paintPackCentroidOnMainCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  colorPrimary: string,
  colorDot: string,
  anyTracked: boolean,
): void {
  renderMapPinMarker(
    ctx,
    cx,
    cy,
    {
      geometry: MAIN_MAP_PACK_MARKER,
      colors: {
        fill: colorDot,
        stroke: 'rgba(15, 23, 42, 0.5)',
        highlight: 'rgba(255, 255, 255, 0.38)',
        trackedStroke: colorPrimary,
      },
    },
    anyTracked,
  );
}

export function collectRunnerWorldPositions(p: {
  runnerIds: number[];
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  builtTrack: BuiltTrackPath;
  courseDistance: number;
  turnSign: number;
}): Array<{ x: number; y: number }> {
  const { runnerIds, runnerPositions, runnerLanes, builtTrack, courseDistance, turnSign } = p;
  const out: Array<{ x: number; y: number }> = [];

  for (const rid of runnerIds) {
    const pos = runnerPositions[rid];
    if (pos == null) continue;

    const lane = runnerLanes[rid] ?? 0;
    const raceDist = clamp(pos, 0, courseDistance);

    const pt = interpolateTrackPoint(builtTrack, raceDist);
    const o = outwardFromTrackPoint(pt, turnSign);

    out.push({ x: pt.x + lane * o.x, y: pt.y + lane * o.y });
  }

  return out;
}

export function paintMainMapPackIndicator(p: {
  ctx: CanvasRenderingContext2D;
  transform: CanvasTransform;
  runnerIds: number[];
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  tracked: Set<number>;
  builtTrack: BuiltTrackPath;
  courseDistance: number;
  turnSign: number;
  colorPrimary: string;
  colorDot: string;
}): void {
  const {
    ctx,
    transform,
    runnerIds,
    runnerPositions,
    runnerLanes,
    tracked,
    builtTrack,
    courseDistance,
    turnSign,
    colorPrimary,
    colorDot,
  } = p;

  const worldPts = collectRunnerWorldPositions({
    runnerIds,
    runnerPositions,
    runnerLanes,
    builtTrack,
    courseDistance,
    turnSign,
  });

  if (worldPts.length === 0) return;

  let sx = 0;
  let sy = 0;
  for (const w of worldPts) {
    sx += w.x;
    sy += w.y;
  }

  const n = worldPts.length;
  const { cx, cy } = toCanvas(sx / n, sy / n, transform);
  const anyTracked = [...tracked].some((id) => runnerPositions[id] != null);

  paintPackCentroidOnMainCanvas(ctx, cx, cy, colorPrimary, colorDot, anyTracked);
}

export function paintRunnerMarkersOnPackCanvas(
  ctx: CanvasRenderingContext2D,
  markers: RunnerMarker[],
  colorPrimary: string,
  _colorBg: string,
): void {
  const r = 7;
  const border = 2.5;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 10px system-ui, sans-serif';

  for (const m of markers) {
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, r + border, 0, Math.PI * 2);
    ctx.fillStyle = m.isTracked ? colorPrimary : 'rgba(15,23,42,0.55)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(m.cx, m.cy, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillText(`${m.id + 1}`, m.cx, m.cy + 0.5);
  }
}
