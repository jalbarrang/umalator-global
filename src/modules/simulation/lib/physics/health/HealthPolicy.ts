import type { RaceState } from '../../core/types';
import type { RunnerParameters } from '../../runner/types';

export interface HpPolicy {
  init: (horse: RunnerParameters) => void;
  tick: (state: RaceState, dt: number) => void;
  hasRemainingHp: () => boolean;
  hpRatioRemaining: () => number; // separate methods as the former can be much cheaper to check
  recover: (modifier: number, state?: RaceState) => void;
  getLastSpurtPair: (
    state: RaceState,
    maxSpeed: number,
    baseTargetSpeed2: number,
  ) => [number, number];
  hp: number;
  isMaxSpurt: () => boolean;
}

export const NoopHpPolicy: HpPolicy = {
  hp: 1.0,
  init(_: RunnerParameters) {},
  tick(_0: RaceState, _1: number) {},
  hasRemainingHp() {
    return true;
  },
  hpRatioRemaining() {
    return 1.0;
  },
  recover(_: number, _state?: RaceState) {},
  getLastSpurtPair(_0: RaceState, maxSpeed: number, _1: number) {
    return [-1, maxSpeed] as [number, number];
  },
  isMaxSpurt() {
    return this.hp === 1.0;
  },
};

export const HpStrategyCoefficient = [0, 0.95, 0.89, 1.0, 0.995, 0.86] as const;
export const HpConsumptionGroundModifier = [
  [],
  [0, 1.0, 1.0, 1.02, 1.02],
  [0, 1.0, 1.0, 1.01, 1.02],
] as const;
