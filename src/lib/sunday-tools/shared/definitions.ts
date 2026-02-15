import { Strategy } from '../runner/definitions';
import type { IStrategy } from '../runner/definitions';

export const Acceleration = {
  StrategyPhaseCoefficient: Object.freeze(
    [
      [],
      [1.0, 1.0, 0.996],
      [0.985, 1.0, 0.996],
      [0.975, 1.0, 1.0],
      [0.945, 1.0, 0.997],
      [1.17, 0.94, 0.956],
    ].map((a) => Object.freeze(a)),
  ),
  GroundTypeProficiencyModifier: Object.freeze([1.05, 1.0, 0.9, 0.8, 0.7, 0.5, 0.3, 0.1]),
  DistanceProficiencyModifier: Object.freeze([1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.5, 0.4]),
};

export const Speed = {
  StrategyPhaseCoefficient: Object.freeze(
    [
      [], // strategies start numbered at 1
      [1.0, 0.98, 0.962],
      [0.978, 0.991, 0.975],
      [0.938, 0.998, 0.994],
      [0.931, 1.0, 1.0],
      [1.063, 0.962, 0.95],
    ].map((a) => Object.freeze(a)),
  ),
  DistanceProficiencyModifier: Object.freeze([1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1]),
};

export const PositionKeep = {
  BaseMinimumThreshold: Object.freeze([0, 0, 3.0, 6.5, 7.5]),
  BaseMaximumThreshold: Object.freeze([0, 0, 5.0, 7.0, 8.0]),

  courseFactor(distance: number) {
    return 0.0008 * (distance - 1000) + 1.0;
  },

  minThreshold(strategy: IStrategy, distance: number) {
    // senkou minimum threshold is a constant 3.0 independent of the course factor for some reason
    return (
      this.BaseMinimumThreshold[strategy] *
      (strategy == Strategy.PaceChaser ? 1.0 : this.courseFactor(distance))
    );
  },

  maxThreshold(strategy: IStrategy, distance: number) {
    return this.BaseMaximumThreshold[strategy] * this.courseFactor(distance);
  },
};

export const GroundSpeedModifier = [
  null, // ground types started at 1
  [0, 0, 0, 0, -50],
  [0, 0, 0, 0, -50],
] as const;

export const GroundPowerModifier = [
  null,
  [0, 0, -50, -50, -50],
  [0, -100, -50, -100, -100],
] as const;

export const StrategyModule = {
  /**
   * Strategy modifier is
   * | Strategy     | Strategy Modifier |
   * | :----------- | :---------------- |
   * | Front Runner | 0.02m/s           |
   * | Pace Chaser  | 0.01m/s           |
   * | Late Surger  | 0.01m/s           |
   * | End Closer   | 0.03m/s           |
   */
  forceInSpeedModifier: {
    [Strategy.FrontRunner]: 0.02,
    [Strategy.PaceChaser]: 0.01,
    [Strategy.LateSurger]: 0.01,
    [Strategy.EndCloser]: 0.03,
  } as Readonly<Record<IStrategy, number>>,
  /**
   * Aptitude modifier for Wit
   */
  aptitudeModifier: [1.1, 1.0, 0.85, 0.75, 0.6, 0.4, 0.2, 0.1] as Readonly<Array<number>>,
};
