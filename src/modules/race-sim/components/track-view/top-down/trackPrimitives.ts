import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { PHASE_STYLES } from '@/modules/race-sim/constants';
import {
  interpolateTrackPoint,
  outwardFromTrackPoint,
  type BuiltTrackPath,
  type TrackPathPoint,
} from '@/modules/race-sim/utils/track-path';
import { toCanvas } from './canvasMath';
import type { CanvasTransform, TrackMarker } from './shared';
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

// ---------------------------------------------------------------------------
// Declarative track markers — data builder + renderer
// ---------------------------------------------------------------------------

function assignCornerLabels(courseData: CourseData): string[] {
  const sorted = [...courseData.corners].sort((a, b) => a.start - b.start);
  if (sorted.length === 0) return [];

  const turns: number[][] = [];
  let turnStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - (sorted[i - 1].start + sorted[i - 1].length);
    if (gap > 10) {
      turns.push(Array.from({ length: i - turnStart }, (_, j) => turnStart + j));
      turnStart = i;
    }
  }
  turns.push(Array.from({ length: sorted.length - turnStart }, (_, j) => turnStart + j));

  const labels: string[] = new Array(sorted.length);
  for (let t = 0; t < turns.length; t++) {
    const fromEnd = turns.length - 1 - t;
    const base = fromEnd % 2 === 0 ? 3 : 1;
    for (let j = 0; j < turns[t].length; j++) {
      labels[turns[t][j]] = `C${base + j}`;
    }
  }

  const origOrder = courseData.corners
    .map((c, i) => ({ start: c.start, origIdx: i }))
    .sort((a, b) => a.start - b.start);
  const result: string[] = new Array(courseData.corners.length);
  for (let i = 0; i < sorted.length; i++) {
    result[origOrder[i].origIdx] = labels[i];
  }
  return result;
}

export function buildTrackMarkers(courseData: CourseData): TrackMarker[] {
  const markers: TrackMarker[] = [];
  const dist = courseData.distance;

  const cornerLabels = assignCornerLabels(courseData);
  for (let i = 0; i < courseData.corners.length; i++) {
    const c = courseData.corners[i];
    const len = Math.min(c.start + c.length, dist) - c.start;
    if (len < 5) continue;
    markers.push({
      distance: c.start + len / 2,
      placement: 'outer',
      kind: 'corner',
      label: cornerLabels[i],
    });
  }

  for (const s of courseData.straights) {
    const len = Math.min(s.end, dist) - s.start;
    if (len < 10) continue;
    const count = Math.max(1, Math.round(len / 200));
    for (let i = 0; i < count; i++) {
      markers.push({
        distance: s.start + len * ((i + 0.5) / count),
        placement: 'outer',
        kind: 'straight',
        label: '',
      });
    }
  }

  const sortedCorners = [...courseData.corners].sort((a, b) => a.start - b.start);
  const lapPeriod =
    sortedCorners.length >= 5
      ? sortedCorners[4].start - sortedCorners[0].start
      : null;

  const sortedSlopes = [...courseData.slopes].sort((a, b) => a.start - b.start);
  const MIN_FLAT_GAP = 40;

  for (const sl of sortedSlopes) {
    const len = Math.min(sl.start + sl.length, dist) - sl.start;
    if (len < 5) continue;
    const mid = sl.start + len / 2;
    if (lapPeriod != null && mid >= lapPeriod) continue;
    markers.push({
      distance: mid,
      placement: 'surface',
      kind: sl.slope > 0 ? 'slope-up' : 'slope-down',
      label: '',
    });
  }

  for (let i = 0; i < sortedSlopes.length; i++) {
    const slopeEnd = sortedSlopes[i].start + sortedSlopes[i].length;
    const nextStart = i + 1 < sortedSlopes.length ? sortedSlopes[i + 1].start : dist;
    const flatLen = nextStart - slopeEnd;
    if (flatLen < MIN_FLAT_GAP) continue;
    const flatPos = slopeEnd + Math.min(flatLen * 0.15, 30);
    if (lapPeriod != null && flatPos >= lapPeriod) continue;
    markers.push({
      distance: flatPos,
      placement: 'surface',
      kind: 'slope-flat',
      label: '',
    });
  }

  markers.sort((a, b) => a.distance - b.distance);

  const MIN_SLOPE_SPACING = 250;
  let lastSlopeDist = -Infinity;
  return markers.filter((m) => {
    if (m.kind !== 'slope-up' && m.kind !== 'slope-down') return true;
    if (m.distance - lastSlopeDist < MIN_SLOPE_SPACING) return false;
    lastSlopeDist = m.distance;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Renderer — one icon per marker kind
// ---------------------------------------------------------------------------

const SEGMENT_COLOR = 'rgba(234, 88, 12, 0.9)';
const SLOPE_UP_COLOR = 'rgba(239, 68, 68, 0.9)';
const SLOPE_DOWN_COLOR = 'rgba(6, 182, 212, 0.9)';
const SLOPE_FLAT_COLOR = 'rgba(148, 163, 184, 0.7)';

const OUTER_OFFSET = 1.6;
const SURFACE_OFFSET = 0.5;

type IconPainter = (ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string) => void;

function slopeBackdrop(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.roundRect(cx - 8, cy - 7, 16, 14, 3);
  ctx.fill();
}

const iconPainters: Record<TrackMarker['kind'], IconPainter> = {
  corner(ctx, cx, cy, label) {
    ctx.save();
    ctx.strokeStyle = SEGMENT_COLOR;
    ctx.fillStyle = SEGMENT_COLOR;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 6);
    ctx.quadraticCurveTo(cx - 3, cy - 3, cx + 6, cy - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 6);
    ctx.lineTo(cx + 6, cy - 3);
    ctx.lineTo(cx + 3, cy);
    ctx.stroke();
    ctx.font = '700 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, cx + 1, cy + 8);
    ctx.restore();
  },

  straight(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = SEGMENT_COLOR;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const hw = 7,
      ah = 3;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx + hw, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - hw + ah, cy - ah);
    ctx.lineTo(cx - hw, cy);
    ctx.lineTo(cx - hw + ah, cy + ah);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + hw - ah, cy - ah);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw - ah, cy + ah);
    ctx.stroke();
    ctx.restore();
  },

  'slope-up'(ctx, cx, cy) {
    ctx.save();
    slopeBackdrop(ctx, cx, cy);
    ctx.strokeStyle = SLOPE_UP_COLOR;
    ctx.fillStyle = SLOPE_UP_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy + 2);
    ctx.lineTo(cx - 5, cy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  'slope-down'(ctx, cx, cy) {
    ctx.save();
    slopeBackdrop(ctx, cx, cy);
    ctx.strokeStyle = SLOPE_DOWN_COLOR;
    ctx.fillStyle = SLOPE_DOWN_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 5);
    ctx.lineTo(cx + 5, cy - 2);
    ctx.lineTo(cx - 5, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  'slope-flat'(ctx, cx, cy) {
    ctx.save();
    slopeBackdrop(ctx, cx, cy);
    ctx.strokeStyle = SLOPE_FLAT_COLOR;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (const dy of [-2, 2]) {
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + dy);
      ctx.lineTo(cx + 5, cy + dy);
      ctx.stroke();
    }
    ctx.restore();
  },
};

export function paintTrackMarkers(p: {
  ctx: CanvasRenderingContext2D;
  markers: ReadonlyArray<TrackMarker>;
  builtTrack: BuiltTrackPath;
  courseWidth: number;
  turnSign: number;
  transform: CanvasTransform;
}): void {
  const { ctx, markers, builtTrack, courseWidth, turnSign, transform } = p;

  for (const m of markers) {
    const frac = m.placement === 'outer' ? OUTER_OFFSET : SURFACE_OFFSET;
    const pt = interpolateTrackPoint(builtTrack, m.distance);
    const o = outwardFromTrackPoint(pt, turnSign);
    const { cx, cy } = toCanvas(
      pt.x + courseWidth * frac * o.x,
      pt.y + courseWidth * frac * o.y,
      transform,
    );
    iconPainters[m.kind](ctx, cx, cy, m.label);
  }
}
