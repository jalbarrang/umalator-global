import {
  interpolateTrackPoint,
  outwardFromTrackPoint,
  type BuiltTrackPath,
  type TrackPathPoint,
} from '@/modules/race-sim/utils/track-path';
import {
  CANVAS_H,
  CANVAS_W,
  PAD,
  type Bounds,
  type CanvasTransform,
  type CanvasTransformOptions,
  type ViewportState,
} from './shared';
import { clamp } from './utils';

export function computeBounds(
  inner: TrackPathPoint[],
  courseWidth: number,
  turnSign: number,
): Bounds {
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

export function buildVisibleTrackPoints(
  builtTrack: BuiltTrackPath,
  courseDistance: number,
  viewStart: number,
  viewEnd: number,
): TrackPathPoint[] {
  if (builtTrack.wraps || (viewStart <= 0 && viewEnd >= courseDistance)) {
    return builtTrack.points;
  }

  const start = clamp(viewStart, 0, courseDistance);
  const end = clamp(viewEnd, start, courseDistance);
  const visible = builtTrack.points.filter(
    (point) => point.distance >= start && point.distance <= end,
  );
  const startPoint = interpolateTrackPoint(builtTrack, start);
  const endPoint = interpolateTrackPoint(builtTrack, end);

  return [
    { ...startPoint, distance: start },
    ...visible.filter((point) => point.distance > start && point.distance < end),
    { ...endPoint, distance: end },
  ];
}

export function createCanvasTransform(
  bounds: Bounds,
  viewport: ViewportState,
  options?: CanvasTransformOptions,
): CanvasTransform {
  const canvasW = options?.canvasWidth ?? CANVAS_W;
  const canvasH = options?.canvasHeight ?? CANVAS_H;
  const pad = options?.pad ?? PAD;
  const bw = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const bh = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const drawW = canvasW - pad * 2;
  const drawH = canvasH - pad * 2;
  const scale = Math.min(drawW / bw, drawH / bh);
  const contentW = bw * scale;
  const contentH = bh * scale;

  return {
    bounds,
    scale,
    offsetX: pad + (drawW - contentW) / 2,
    offsetY: pad + (drawH - contentH) / 2,
    zoom: viewport.zoom,
    panX: viewport.panX,
    panY: viewport.panY,
    canvasWidth: canvasW,
    canvasHeight: canvasH,
  };
}

export function computePackBoundsFromWorldPoints(
  points: Array<{ x: number; y: number }>,
  courseWidth: number,
): Bounds {
  const innerPad = Math.max(courseWidth * 0.4, 5);
  if (points.length === 0) {
    return { minX: 0, maxX: innerPad * 2, minY: 0, maxY: innerPad * 2 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const bw = Math.max(maxX - minX, 1e-6);
  const bh = Math.max(maxY - minY, 1e-6);
  const frac = 0.16;
  const padX = Math.max(bw * frac, innerPad);
  const padY = Math.max(bh * frac, innerPad);
  let minX2 = minX - padX;
  let maxX2 = maxX + padX;
  let minY2 = minY - padY;
  let maxY2 = maxY + padY;
  const minSpan = Math.max(courseWidth * 1.25, 8);
  if (maxX2 - minX2 < minSpan) {
    const mid = (minX2 + maxX2) / 2;
    minX2 = mid - minSpan / 2;
    maxX2 = mid + minSpan / 2;
  }
  if (maxY2 - minY2 < minSpan) {
    const mid = (minY2 + maxY2) / 2;
    minY2 = mid - minSpan / 2;
    maxY2 = mid + minSpan / 2;
  }
  return { minX: minX2, maxX: maxX2, minY: minY2, maxY: maxY2 };
}

export function toCanvas(
  x: number,
  y: number,
  transform: CanvasTransform,
): {
  cx: number;
  cy: number;
} {
  const baseX = transform.offsetX + (x - transform.bounds.minX) * transform.scale;
  const baseY = transform.offsetY + (transform.bounds.maxY - y) * transform.scale;
  const centerX = transform.canvasWidth / 2;
  const centerY = transform.canvasHeight / 2;

  return {
    cx: centerX + (baseX - centerX) * transform.zoom + transform.panX,
    cy: centerY + (baseY - centerY) * transform.zoom + transform.panY,
  };
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, 0.6, 6);
}

export function pointerToVirtualCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / Math.max(rect.width, 1)) * CANVAS_W,
    y: ((clientY - rect.top) / Math.max(rect.height, 1)) * CANVAS_H,
  };
}

export function zoomViewportAroundPoint(
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
