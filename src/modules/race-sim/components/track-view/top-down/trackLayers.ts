import { OrientationName } from '@/lib/sunday-tools/course/definitions';
import type { IOrientation } from '@/lib/sunday-tools/course/definitions';
import type { BuiltTrackPath } from '@/modules/race-sim/utils/track-path';
import { outwardFromTrackPoint } from '@/modules/race-sim/utils/track-path';
import {
  buildVisibleTrackPoints,
  computeBounds,
  computePackBoundsFromWorldPoints,
  createCanvasTransform,
} from './canvasMath';
import {
  CANVAS_H,
  CANVAS_W,
  PACK_CANVAS_H,
  PACK_CANVAS_W,
  PACK_PAD,
  type TrackSceneColors,
  type TrackTopDownScene,
  type ViewportState,
} from './shared';
import {
  buildRunnerMarkers,
  collectRunnerWorldPositions,
  paintMainMapPackIndicator,
  paintRunnerMarkersOnPackCanvas,
} from './trackMarkers';
import {
  paintPhaseColoredSegments,
  paintPhaseDividersStartFinish,
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

export function paintTrackPackZoom(params: PaintTrackPackZoomParams) {
  const {
    ctx,
    dpr,
    measuredWidth,
    measuredHeight,
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
  } = params;

  const inner = builtTrack.points;
  const colorMuted = resolvedColor('--muted-foreground');
  const colorBorder = resolvedColor('--border');
  const colorPrimary = resolvedColor('--primary');
  const colorBg = resolvedColor('--background');

  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;
  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / PACK_CANVAS_W), dpr * (measuredHeight / PACK_CANVAS_H));

  const visiblePoints = buildVisibleTrackPoints(builtTrack, courseDistance, viewStart, viewEnd);
  const fullBounds = computeBounds(
    visiblePoints.length > 1 ? visiblePoints : inner,
    courseWidth,
    turnSign,
  );

  const tracked = new Set(trackedRunnerIds);
  const runnerIds = collectVisibleRunnerIds(runnerNames, runnerPositions, trackedRunnerIds);
  const worldPts = collectRunnerWorldPositions({
    runnerIds,
    runnerPositions,
    runnerLanes,
    builtTrack,
    courseDistance,
    turnSign,
  });
  const packBounds =
    worldPts.length > 0 ? computePackBoundsFromWorldPoints(worldPts, courseWidth) : fullBounds;

  const viewport = { zoom: 1, panX: 0, panY: 0 };
  const transform = createCanvasTransform(packBounds, viewport, {
    canvasWidth: PACK_CANVAS_W,
    canvasHeight: PACK_CANVAS_H,
    pad: PACK_PAD,
  });

  const innerPts: Array<{ x: number; y: number }> = [];
  const outerPts: Array<{ x: number; y: number }> = [];
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
  paintRunnerMarkersOnPackCanvas(ctx, markers, colorPrimary, colorBg);

  ctx.restore();
}
