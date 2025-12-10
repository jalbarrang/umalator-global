export const Phase = {
  EarlyRace: 0,
  MidRace: 1,
  LateRace: 2,
  LastSpurt: 3,
} as const;

export const Surface = {
  Turf: 1,
  Dirt: 2,
} as const;

export const DistanceType = {
  Short: 1,
  Mile: 2,
  Mid: 3,
  Long: 4,
} as const;

export const Orientation = {
  Clockwise: 1,
  Counterclockwise: 2,
  UnusedOrientation: 3,
  NoTurns: 4,
} as const;

export const ThresholdStat = {
  Speed: 1,
  Stamina: 2,
  Power: 3,
  Guts: 4,
  Int: 5,
} as const;

export const phases: readonly number[] = [0, 1, 2, 3];
export const thresholds: readonly number[] = [1, 2, 3, 4, 5];
export const surfaces: readonly number[] = [1, 2];
export const distances: readonly number[] = [1, 2, 3, 4];
export const orientations: readonly number[] = [1, 2, 3, 4];
