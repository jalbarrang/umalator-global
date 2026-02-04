import type { IRaceState } from '../../core/RaceSolver';
import type { HorseParameters } from '../HorseTypes';

export interface HpPolicy {
  hp: number;
  init: (horse: HorseParameters) => void;
  tick: (state: IRaceState, dt: number) => void;
  hasRemainingHp: () => boolean;
  hpRatioRemaining: () => number; // separate methods as the former can be much cheaper to check
  recover: (modifier: number) => void;
  getLastSpurtPair: (
    state: IRaceState,
    maxSpeed: number,
    baseTargetSpeed2: number,
  ) => [number, number];
  isMaxSpurt: () => boolean;
}

export const NoopHpPolicy: HpPolicy = {
  hp: 1.0,
  init(_: HorseParameters) {},
  tick(_0: IRaceState, _1: number) {},
  hasRemainingHp() {
    return true;
  },
  hpRatioRemaining() {
    return 1.0;
  },
  recover(_: number) {},
  getLastSpurtPair(_0: IRaceState, maxSpeed: number, _1: number) {
    return [-1, maxSpeed] as [number, number];
  },
  isMaxSpurt() {
    return false;
  },
};
