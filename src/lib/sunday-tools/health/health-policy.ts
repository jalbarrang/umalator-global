import type { IPhase } from '../course/definitions';
import type { IStrategy } from '../runner/definitions';
import type { IPositionKeepState } from '../skills/definitions';
import type { Runner } from '../common/runner';

export type RaceStateSlice = {
  phase: IPhase;
  positionKeepState: IPositionKeepState;
  isRushed?: boolean;
  isDownhillMode?: boolean;
  inSpotStruggle?: boolean;
  posKeepStrategy?: IStrategy;
  pos: number;
  currentSpeed: number;
};

export interface HpPolicy {
  currentHealth: number;
  init: (runner: Runner) => void;
  tick: (runner: Runner, dt: number) => void;
  hasRemainingHealth: () => boolean;
  healthRatioRemaining: () => number; // separate methods as the former can be much cheaper to check
  recover: (modifier: number) => void;
  getLastSpurtPair: (
    state: RaceStateSlice,
    maxSpeed: number,
    baseTargetSpeed2: number,
  ) => [number, number];
  isMaxSpurt: () => boolean;
}

export const NoopHpPolicy: HpPolicy = {
  currentHealth: 1.0,
  init(_: Runner) {},
  tick(_0: Runner, _1: number) {},
  hasRemainingHealth() {
    return true;
  },
  healthRatioRemaining() {
    return 1.0;
  },
  recover(_: number) {},
  getLastSpurtPair(_0: RaceStateSlice, maxSpeed: number, _1: number) {
    return [-1, maxSpeed] as [number, number];
  },
  isMaxSpurt() {
    return false;
  },
};
