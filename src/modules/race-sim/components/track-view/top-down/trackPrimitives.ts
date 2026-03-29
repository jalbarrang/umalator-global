import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { PHASE_STYLES } from '@/modules/race-sim/constants';
import {
  interpolateTrackPoint,
  outwardFromTrackPoint,
  type BuiltTrackPath,
  type TrackPathPoint,
} from '@/modules/race-sim/utils/track-path';
import { toCanvas } from './canvasMath';
import type { CanvasTransform } from './shared';
import { clamp } from './utils';

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

type PhaseColoredSegmentsParams = {
  ctx: CanvasRenderingContext2D;
  inner: TrackPathPoint[];
  innerPts: Array<{ x: number; y: number }>;
  outerPts: Array<{ x: number; y: number }>;
  transform: CanvasTransform;
  builtTrack: BuiltTrackPath;
  courseDistance: number;
};

export function paintPhaseColoredSegments(p: PhaseColoredSegmentsParams): void {
  const { ctx, inner, innerPts, outerPts, transform, builtTrack, courseDistance } = p;

  for (let i = 0; i < innerPts.length - 1; i++) {
    const p0 = inner[i];
    const p1 = inner[i + 1];

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

export function strokeTrackOutlineAndRails(
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

export function paintPhaseDividersStartFinish(p: PhaseDividersSfParams): void {
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
