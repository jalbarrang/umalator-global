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
  type MapPinMarkerGeometry,
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
    m.cy -= stack * 8;
  }
  return markers;
}

function createMapPinPath(
  cx: number,
  cy: number,
  geometry: Pick<MapPinMarkerGeometry, 'headRadius' | 'headCenterYOffset'>,
): Path2D {
  const path = new Path2D();
  const headCy = cy - geometry.headCenterYOffset;
  path.moveTo(cx, cy);
  path.lineTo(cx - geometry.headRadius, headCy);
  path.arc(cx, headCy, geometry.headRadius, Math.PI, 0, true);
  path.lineTo(cx, cy);
  path.closePath();
  return path;
}

function createMapPinHighlightPath(
  cx: number,
  cy: number,
  geometry: Pick<
    MapPinMarkerGeometry,
    'headCenterYOffset' | 'highlightRadius' | 'highlightOffsetX' | 'highlightOffsetY'
  >,
): Path2D {
  const path = new Path2D();
  const headCy = cy - geometry.headCenterYOffset;
  path.arc(
    cx + geometry.highlightOffsetX,
    headCy + geometry.highlightOffsetY,
    geometry.highlightRadius,
    0,
    Math.PI * 2,
  );
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
  const pinPath = createMapPinPath(cx, cy, geometry);
  const highlightPath = createMapPinHighlightPath(cx, cy, geometry);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (tracked) {
    const trackedPath = createMapPinPath(cx, cy, {
      headRadius: geometry.headRadius + geometry.trackedOutlineExtra,
      headCenterYOffset: geometry.headCenterYOffset,
    });
    ctx.strokeStyle = colors.trackedStroke;
    ctx.lineWidth = geometry.trackedStrokeWidth;
    ctx.stroke(trackedPath);
  }

  ctx.fillStyle = colors.fill;
  ctx.fill(pinPath);
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = geometry.strokeWidth;
  ctx.stroke(pinPath);

  ctx.fillStyle = colors.highlight;
  ctx.fill(highlightPath);
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
  colorBg: string,
): void {
  const r = 7;
  for (const m of markers) {
    if (m.isTracked) {
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, r + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = colorPrimary;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.strokeStyle = colorBg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m.id + 1}`, m.cx, m.cy + 0.5);
  }
}
