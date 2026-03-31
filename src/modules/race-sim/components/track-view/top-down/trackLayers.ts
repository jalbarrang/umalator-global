import { OrientationName } from '@/lib/sunday-tools/course/definitions';
import type { IOrientation } from '@/lib/sunday-tools/course/definitions';
import type { BuiltTrackPath } from '@/modules/race-sim/utils/track-path';
import { outwardFromTrackPoint } from '@/modules/race-sim/utils/track-path';
import { buildVisibleTrackPoints, computeBounds, createCanvasTransform } from './canvasMath';
import {
  CANVAS_H,
  CANVAS_W,
  PACK_CANVAS_H,
  PACK_CANVAS_W,
  PACK_PAD,
  type TrackMarker,
  type TrackSceneColors,
  type TrackTopDownScene,
  type ViewportState,
} from './shared';
import {
  buildLinearRunnerMarkers,
  computeLinearPackViewport,
  paintMainMapPackIndicator,
  paintRunnerMarkersOnPackCanvas,
} from './trackMarkers';
import {
  paintPhaseColoredSegments,
  paintPhaseDividersStartFinish,
  paintTrackMarkers,
  strokeTrackOutlineAndRails,
} from './trackPrimitives';
import { clamp, formatLapTotal, resolvedColor } from './utils';

export type BuildTrackTopDownSceneParams = {
  viewport: ViewportState;
  builtTrack: BuiltTrackPath;
  courseWidth: number;
  turnSign: number;
  courseDistance: number;
  viewStart: number;
  viewEnd: number;
  runnerPositions: Record<number, number>;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  markers: ReadonlyArray<TrackMarker>;
};

type PaintTrackBaseLayerParams = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  scene: TrackTopDownScene;
  colors: TrackSceneColors;
};

type PaintTrackOverlayLayerParams = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  scene: TrackTopDownScene;
  colors: TrackSceneColors;
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
};

type PaintTrackHudLayerParams = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  scene: TrackTopDownScene;
  colors: TrackSceneColors;
  turn: IOrientation;
  runnerPositions: Record<number, number>;
};

export type PaintTrackPackZoomParams = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  courseWidth: number;
  courseDistance: number;
  runnerPositions: Record<number, number>;
  runnerLanes: Record<number, number>;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
};

function collectVisibleRunnerIds(
  runnerNames: Record<number, string>,
  runnerPositions: Record<number, number>,
  trackedRunnerIds: number[],
): number[] {
  const ids = new Set<number>();
  for (const k of Object.keys(runnerNames)) ids.add(Number(k));
  for (const k of Object.keys(runnerPositions)) ids.add(Number(k));
  for (const id of trackedRunnerIds) ids.add(id);
  for (let i = 0; i < 9; i++) ids.add(i);
  return [...ids].sort((a, b) => a - b).slice(0, 9);
}

export function resolveTrackSceneColors(): TrackSceneColors {
  return {
    muted: resolvedColor('--muted-foreground'),
    border: resolvedColor('--border'),
    primary: resolvedColor('--foreground-primary'),
    dot: resolvedColor('--foreground'),
  };
}

function setupCanvasLayer(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  measuredWidth: number,
  measuredHeight: number,
  virtualWidth: number,
  virtualHeight: number,
): void {
  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;
  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / virtualWidth), dpr * (measuredHeight / virtualHeight));
}

export function buildTrackTopDownScene(params: BuildTrackTopDownSceneParams): TrackTopDownScene {
  const {
    viewport,
    builtTrack,
    courseWidth,
    turnSign,
    courseDistance,
    viewStart,
    viewEnd,
    runnerPositions,
    runnerNames,
    trackedRunnerIds,
    markers,
  } = params;
  const inner = builtTrack.points;
  const visiblePoints = buildVisibleTrackPoints(builtTrack, courseDistance, viewStart, viewEnd);
  const bounds = computeBounds(
    visiblePoints.length > 1 ? visiblePoints : inner,
    courseWidth,
    turnSign,
  );
  const transform = createCanvasTransform(bounds, viewport);
  const innerPts: Array<{ x: number; y: number }> = [];
  const outerPts: Array<{ x: number; y: number }> = [];
  for (const p of inner) {
    const o = outwardFromTrackPoint(p, turnSign);
    innerPts.push({ x: p.x, y: p.y });
    outerPts.push({ x: p.x + courseWidth * o.x, y: p.y + courseWidth * o.y });
  }
  return {
    builtTrack,
    courseWidth,
    turnSign,
    courseDistance,
    transform,
    inner,
    innerPts,
    outerPts,
    runnerIds: collectVisibleRunnerIds(runnerNames, runnerPositions, trackedRunnerIds),
    tracked: new Set(trackedRunnerIds),
    markers,
  };
}

export function paintTrackBaseLayer(params: PaintTrackBaseLayerParams): void {
  const { ctx, dpr, measuredWidth, measuredHeight, scene, colors } = params;
  setupCanvasLayer(ctx, dpr, measuredWidth, measuredHeight, CANVAS_W, CANVAS_H);
  paintPhaseColoredSegments({
    ctx,
    inner: scene.inner,
    innerPts: scene.innerPts,
    outerPts: scene.outerPts,
    transform: scene.transform,
    builtTrack: scene.builtTrack,
    courseDistance: scene.courseDistance,
  });
  strokeTrackOutlineAndRails(
    ctx,
    scene.innerPts,
    scene.outerPts,
    scene.transform,
    colors.border,
    colors.muted,
  );
  paintPhaseDividersStartFinish({
    ctx,
    builtTrack: scene.builtTrack,
    courseWidth: scene.courseWidth,
    turnSign: scene.turnSign,
    courseDistance: scene.courseDistance,
    transform: scene.transform,
    colorMuted: colors.muted,
  });
  paintTrackMarkers({
    ctx,
    markers: scene.markers,
    builtTrack: scene.builtTrack,
    courseWidth: scene.courseWidth,
    turnSign: scene.turnSign,
    transform: scene.transform,
  });
  ctx.restore();
}

export function paintTrackOverlayLayer(params: PaintTrackOverlayLayerParams): void {
  const { ctx, dpr, measuredWidth, measuredHeight, scene, colors, runnerPositions, runnerLanes } =
    params;
  setupCanvasLayer(ctx, dpr, measuredWidth, measuredHeight, CANVAS_W, CANVAS_H);

  paintMainMapPackIndicator({
    ctx,
    transform: scene.transform,
    runnerIds: scene.runnerIds,
    runnerPositions,
    runnerLanes,
    tracked: scene.tracked,
    builtTrack: scene.builtTrack,
    courseDistance: scene.courseDistance,
    turnSign: scene.turnSign,
    colorPrimary: colors.primary,
    colorDot: colors.primary,
  });

  ctx.restore();
}

export function paintTrackHudLayer(params: PaintTrackHudLayerParams): void {
  const { ctx, dpr, measuredWidth, measuredHeight, scene, colors, turn, runnerPositions } = params;
  setupCanvasLayer(ctx, dpr, measuredWidth, measuredHeight, CANVAS_W, CANVAS_H);

  ctx.font = '600 10px system-ui, sans-serif';
  ctx.fillStyle = colors.primary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(OrientationName[turn as keyof typeof OrientationName] ?? '', 16, 16);

  const { lapLength, numLaps, raceStartOnTrack } = scene.builtTrack;

  if (scene.builtTrack.wraps && numLaps > 1 + 1e-6) {
    let leaderPos = 0;

    for (const v of Object.values(runnerPositions)) {
      if (v != null) leaderPos = Math.max(leaderPos, v);
    }

    leaderPos = clamp(leaderPos, 0, scene.courseDistance);
    const progressed = Math.max(0, leaderPos - raceStartOnTrack);
    const lapIdx = lapLength > 1e-9 ? Math.floor(progressed / lapLength) + 1 : 1;
    const currentLap = Math.min(Math.max(1, lapIdx), Math.max(1, Math.ceil(numLaps)));
    ctx.fillText(`Lap ${currentLap} / ${formatLapTotal(numLaps)}`, 28, 22);
  }

  ctx.restore();
}

function niceDistanceTickStep(spanMeters: number): number {
  const raw = spanMeters / 6;
  const exp = Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const f = raw / 10 ** exp;
  let nf = 10;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  return nf * 10 ** exp;
}

function paintLinearPackDistanceTicks(
  ctx: CanvasRenderingContext2D,
  distMin: number,
  distMax: number,
  colorLine: string,
  colorLabel: string,
): void {
  const span = Math.max(distMax - distMin, 1e-6);
  const step = niceDistanceTickStep(span);
  const drawW = PACK_CANVAS_W - PACK_PAD * 2;
  const baselineY = PACK_CANVAS_H - PACK_PAD - 4;
  const tickTop = baselineY - 28;

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = colorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PACK_PAD, baselineY);
  ctx.lineTo(PACK_CANVAS_W - PACK_PAD, baselineY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const first = Math.ceil(distMin / step) * step;
  const maxSteps = Math.ceil((distMax - first) / step) + 2;
  for (let i = 0; i <= maxSteps; i++) {
    const d = first + i * step;
    if (d > distMax + 1e-6) break;
    const t = (d - distMin) / span;
    const x = PACK_PAD + t * drawW;

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = colorLine;
    ctx.beginPath();
    ctx.moveTo(x, baselineY);
    ctx.lineTo(x, tickTop);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillStyle = colorLabel;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = Number.isInteger(d) ? `${d}` : `${d.toFixed(1)}`;
    ctx.fillText(`${label}m`, x, baselineY + 3);
  }
}

export function paintTrackPackZoom(params: PaintTrackPackZoomParams) {
  const {
    ctx,
    dpr,
    measuredWidth,
    measuredHeight,
    courseWidth,
    courseDistance,
    runnerPositions,
    runnerLanes,
    runnerNames,
    trackedRunnerIds,
  } = params;

  const colorFg = resolvedColor('--foreground-primary');
  const colorPrimary = resolvedColor('--primary');
  const colorBg = resolvedColor('--background');

  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;
  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / PACK_CANVAS_W), dpr * (measuredHeight / PACK_CANVAS_H));

  const tracked = new Set(trackedRunnerIds);
  const runnerIds = collectVisibleRunnerIds(runnerNames, runnerPositions, trackedRunnerIds);
  const viewport = computeLinearPackViewport({
    runnerPositions,
    runnerIds,
    courseWidth,
    courseDistance,
  });

  if (viewport) {
    paintLinearPackDistanceTicks(ctx, viewport.distMin, viewport.distMax, colorFg, colorFg);

    const runnerMarkers = buildLinearRunnerMarkers({
      runnerIds,
      runnerPositions,
      runnerLanes,
      runnerNames,
      tracked,
      courseDistance,
      viewport,
      canvasWidth: PACK_CANVAS_W,
      canvasHeight: PACK_CANVAS_H,
      pad: PACK_PAD,
    });
    paintRunnerMarkersOnPackCanvas(ctx, runnerMarkers, colorPrimary, colorBg);
  } else {
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = colorFg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No runners', PACK_CANVAS_W / 2, PACK_CANVAS_H / 2);
  }

  ctx.restore();
}
