import {
  PHASE_COLORS,
  TERRAIN_COLOR,
  TERRAIN_LINE_COLOR,
} from '@/modules/race-sim/constants';
import { buildRunnerMarkers } from './graphScene';
import { distanceToCanvasX, getTickStep } from './graphMath';
import {
  AXIS_Y,
  CANVAS_H,
  CANVAS_W,
  CHART_PAD_TOP,
  CHART_Y_END,
  DRAW_W,
  PAD_LEFT,
  type PhaseRegion,
  type SlopePoint,
} from './shared';
import { clamp, resolvedColor } from './utils';

type PaintCanvasArgs = {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  measuredWidth: number;
  measuredHeight: number;
  phaseRegions: PhaseRegion[];
  slopePoints: SlopePoint[];
  runnerPositions: Record<number, number>;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  viewStart: number;
  viewEnd: number;
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

export function paintCanvas({
  ctx,
  dpr,
  measuredWidth,
  measuredHeight,
  phaseRegions,
  slopePoints,
  runnerPositions,
  runnerNames,
  trackedRunnerIds,
  viewStart,
  viewEnd,
}: PaintCanvasArgs) {
  const viewDistance = Math.max(viewEnd - viewStart, 1e-6);

  ctx.canvas.width = measuredWidth * dpr;
  ctx.canvas.height = measuredHeight * dpr;

  ctx.save();
  ctx.clearRect(0, 0, measuredWidth * dpr, measuredHeight * dpr);
  ctx.scale(dpr * (measuredWidth / CANVAS_W), dpr * (measuredHeight / CANVAS_H));

  const colorMuted = resolvedColor('--muted-foreground');
  const colorBorder = resolvedColor('--border');
  const colorPrimary = resolvedColor('--primary');
  const colorBackground = resolvedColor('--background');

  for (let phaseIndex = 0; phaseIndex < phaseRegions.length; phaseIndex++) {
    const phase = phaseRegions[phaseIndex];
    const phaseColor = PHASE_COLORS[phaseIndex];
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
      ctx.fillStyle = phaseColor.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, CHART_Y_END - 3, width, 3);
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
    for (const point of slopePoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(slopePoints[slopePoints.length - 1].x, CHART_Y_END);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, CHART_PAD_TOP, 0, CHART_Y_END);
    gradient.addColorStop(0, `${TERRAIN_COLOR.replace('rgb', 'rgba').replace(')', ', 0.35)')}`);
    gradient.addColorStop(1, `${TERRAIN_COLOR.replace('rgb', 'rgba').replace(')', ', 0.08)')}`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  if (slopePoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(slopePoints[0].x, slopePoints[0].y);
    for (let index = 1; index < slopePoints.length; index++) {
      ctx.lineTo(slopePoints[index].x, slopePoints[index].y);
    }
    ctx.strokeStyle = TERRAIN_LINE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const markers = buildRunnerMarkers({
    runnerPositions,
    runnerNames,
    trackedRunnerIds,
    viewStart,
    viewEnd,
    slopePoints,
  });
  const leaderDistance =
    markers.length > 0 ? Math.max(...markers.map((marker) => marker.pos)) : viewStart;
  const leaderX = distanceToCanvasX(leaderDistance, viewStart, viewDistance);

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
  const rightEdge = PAD_LEFT + DRAW_W;
  ctx.textAlign = leaderX > rightEdge - 90 ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Leader ${leaderDistance.toFixed(0)}m`,
    leaderX + (leaderX > rightEdge - 90 ? -6 : 6),
    CHART_PAD_TOP + 2,
  );

  for (const marker of markers) {
    const radius = 9;

    if (marker.tracked) {
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = colorPrimary;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = marker.color;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colorBackground;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${marker.id + 1}`, marker.x, marker.y + 0.5);
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

  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = colorMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const tick of [...ticks].sort((left, right) => left - right)) {
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
