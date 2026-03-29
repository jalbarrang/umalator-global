import type { CourseData } from '@/lib/sunday-tools/course/definitions';

export type TrackGraphViewProps = {
  courseData: CourseData;
  runnerNames?: Record<number, string>;
  trackedRunnerIds?: number[];
  viewStart?: number;
  viewEnd?: number;
  className?: string;
};

export type SlopePoint = { x: number; y: number; distance: number };

export type PhaseRegion = {
  label: string;
  start: number;
  end: number;
  fill: string;
  stroke: string;
};

export type GraphMarkerInfo = {
  id: number;
  pos: number;
  x: number;
  y: number;
  color: string;
  tracked: boolean;
  name: string;
};

export const CANVAS_W = 920;
export const CANVAS_H = 300;
export const PAD_LEFT = 12;
export const PAD_RIGHT = 12;
export const CHART_PAD_TOP = 36;
export const CHART_PAD_BOTTOM = 44;
export const DRAW_W = CANVAS_W - PAD_LEFT - PAD_RIGHT;
export const CHART_Y_END = CANVAS_H - CHART_PAD_BOTTOM;
export const AXIS_Y = CHART_Y_END + 14;
export const SLOPE_MAX_HEIGHT = 50;
