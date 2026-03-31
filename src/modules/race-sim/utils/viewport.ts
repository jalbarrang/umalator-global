const MIN_WINDOW_METERS = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ViewportWindow = {
  viewStart: number;
  viewEnd: number;
};

export function computeViewport(
  positions: Record<number, number>,
  courseDistance: number,
  windowMeters: number,
): ViewportWindow {
  const distance = Math.max(0, courseDistance);
  if (distance <= 0) {
    return { viewStart: 0, viewEnd: 0 };
  }

  const positionValues = Object.values(positions)
    .filter((value) => Number.isFinite(value))
    .map((value) => clamp(value, 0, distance));

  if (positionValues.length === 0 || distance <= MIN_WINDOW_METERS) {
    return { viewStart: 0, viewEnd: distance };
  }

  const minPos = Math.min(...positionValues);
  const maxPos = Math.max(...positionValues);
  const center = (minPos + maxPos) / 2;
  const packSpan = maxPos - minPos;
  const halfWindow = Math.max(windowMeters, packSpan + 50) / 2;

  let viewStart = center - halfWindow;
  let viewEnd = center + halfWindow;

  if (viewStart < 0) {
    viewEnd -= viewStart;
    viewStart = 0;
  }
  if (viewEnd > distance) {
    viewStart -= viewEnd - distance;
    viewEnd = distance;
  }

  viewStart = clamp(viewStart, 0, distance);
  viewEnd = clamp(viewEnd, viewStart, distance);

  return { viewStart, viewEnd };
}
