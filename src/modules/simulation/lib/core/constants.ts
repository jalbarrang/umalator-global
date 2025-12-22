export const Speed = {
  StrategyPhaseCoefficient: [
    [], // strategies start numbered at 1
    [1.0, 0.98, 0.962],
    [0.978, 0.991, 0.975],
    [0.938, 0.998, 0.994],
    [0.931, 1.0, 1.0],
    [1.063, 0.962, 0.95],
  ],
  DistanceProficiencyModifier: [1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1],
};

export const Acceleration = {
  StrategyPhaseCoefficient: [
    [],
    [1.0, 1.0, 0.996],
    [0.985, 1.0, 0.996],
    [0.975, 1.0, 1.0],
    [0.945, 1.0, 0.997],
    [1.17, 0.94, 0.956],
  ],
  GroundTypeProficiencyModifier: [1.05, 1.0, 0.9, 0.8, 0.7, 0.5, 0.3, 0.1],
  DistanceProficiencyModifier: [1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.5, 0.4],
};

export const BaseAccel = 0.0006;
export const UphillBaseAccel = 0.0004;

export const PosKeepMode = {
  None: 0,
  Approximate: 1,
  Virtual: 2,
} as const;
export type IPosKeepMode = (typeof PosKeepMode)[keyof typeof PosKeepMode];
export const PosKeepModeName = {
  [PosKeepMode.None]: 'None',
  [PosKeepMode.Approximate]: 'Approximate',
  [PosKeepMode.Virtual]: 'Virtual',
} as const;


export const PhaseDeceleration: ReadonlyArray<number> = [-1.2, -0.8, -1.0];
