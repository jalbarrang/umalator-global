import type { BuiltTrackPath, TrackPathPoint } from '@/modules/race-sim/utils/track-path';

export const CANVAS_W = 560;
export const CANVAS_H = 380;
export const PAD = 28;

export const PACK_CANVAS_W = 560;
export const PACK_CANVAS_H = 120;
export const PACK_PAD = 12;

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
export type ViewportState = { zoom: number; panX: number; panY: number };

export type CanvasTransform = {
  bounds: Bounds;
  scale: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
};

export type CanvasTransformOptions = {
  canvasWidth?: number;
  canvasHeight?: number;
  pad?: number;
};

export type RunnerOrderRow = {
  runnerId: number;
  name: string;
  position: number;
  lane: number | undefined;
  isTracked: boolean;
  color: string;
  rank: number;
  gapFromLeader: number;
};

export type RunnerMarker = {
  id: number;
  cx: number;
  cy: number;
  pos: number;
  color: string;
  name: string;
  isTracked: boolean;
};

export type MapPinMarkerGeometry = {
  headRadius: number;
  headCenterYOffset: number;
  trackedOutlineExtra: number;
  strokeWidth: number;
  trackedStrokeWidth: number;
  highlightRadius: number;
  highlightOffsetX: number;
  highlightOffsetY: number;
};

export type MapPinMarkerColors = {
  fill: string;
  stroke: string;
  highlight: string;
  trackedStroke: string;
};

export type MapPinMarkerSpec = {
  geometry: MapPinMarkerGeometry;
  colors: MapPinMarkerColors;
};

export const MAIN_MAP_PACK_MARKER: MapPinMarkerGeometry = {
  headRadius: 7,
  headCenterYOffset: 11,
  trackedOutlineExtra: 2.5,
  strokeWidth: 1.25,
  trackedStrokeWidth: 2.5,
  highlightRadius: 2.2,
  highlightOffsetX: 0, // Centered for downward arrow
  highlightOffsetY: 8.5, // Move highlight below the head, for downward direction
};

export type MainTrackLayerId = 'track' | 'overlay' | 'hud';

export type TrackSceneColors = {
  muted: string;
  border: string;
  primary: string;
  dot: string;
};

export type TrackTopDownScene = {
  builtTrack: BuiltTrackPath;
  courseWidth: number;
  turnSign: number;
  courseDistance: number;
  transform: CanvasTransform;
  inner: TrackPathPoint[];
  innerPts: Array<{ x: number; y: number }>;
  outerPts: Array<{ x: number; y: number }>;
  runnerIds: number[];
  tracked: Set<number>;
};
