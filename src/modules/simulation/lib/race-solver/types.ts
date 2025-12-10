export const SkillType = {
  SpeedUp: 1,
  StaminaUp: 2,
  PowerUp: 3,
  GutsUp: 4,
  WisdomUp: 5,
  Recovery: 9,
  MultiplyStartDelay: 10,
  SetStartDelay: 14,
  CurrentSpeed: 21,
  CurrentSpeedWithNaturalDeceleration: 22,
  TargetSpeed: 27,
  LaneMovementSpeed: 28,
  Accel: 31,
  ChangeLane: 35,
  ActivateRandomGold: 37,
  ExtendEvolvedDuration: 42,
} as const;
export type ISkillType = (typeof SkillType)[keyof typeof SkillType];

export const SkillPerspective = {
  Self: 1,
  Other: 2,
  Any: 3,
} as const;
export type ISkillPerspective =
  (typeof SkillPerspective)[keyof typeof SkillPerspective];

export const SkillRarity = {
  White: 1,
  Gold: 2,
  Unique: 3,
  Evolution: 6,
} as const;
export type ISkillRarity = (typeof SkillRarity)[keyof typeof SkillRarity];

export const SkillTarget = {
  Self: 1,
  All: 2,
  InFov: 4,
  AheadOfPosition: 7,
  AheadOfSelf: 9,
  BehindSelf: 10,
  AllAllies: 11,
  EnemyStrategy: 18,
  KakariAhead: 19,
  KakariBehind: 20,
  KakariStrategy: 21,
  UmaId: 22,
  UsedRecovery: 23,
} as const;
export type ISkillTarget = (typeof SkillTarget)[keyof typeof SkillTarget];

export const PositionKeepState = {
  None: 0,
  PaceUp: 1,
  PaceDown: 2,
  SpeedUp: 3,
  Overtake: 4,
} as const;
export type IPositionKeepState =
  (typeof PositionKeepState)[keyof typeof PositionKeepState];

export type ISkillData = {
  rarity: ISkillRarity;
  alternatives: ISkillAlternative[];
};

export type ISkillAlternative = {
  precondition: ISkillPrecondition;
  condition: string;
  baseDuration: number;
  effects: ISkillEffect[];
};

export type RawSkillEffect = {
  type: number;
  modifier: number;
  target?: number;
};

export type ISkillEffect = RawSkillEffect & {
  baseDuration: number;
};

export const SkillPrecondition = {
  Empty: '',
  Phase2OrderRate50OvertakeTargetTime2:
    'phase>=2&order_rate<=50&overtake_target_time>=2',
} as const;

export type ISkillPrecondition =
  (typeof SkillPrecondition)[keyof typeof SkillPrecondition];
