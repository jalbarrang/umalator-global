export const Strategy = {
  Nige: 1,
  Senkou: 2,
  Sasi: 3,
  Oikomi: 4,
  Oonige: 5,
} as const;

export type IStrategy = (typeof Strategy)[keyof typeof Strategy];

export const Aptitude = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
} as const;

export type IAptitude = (typeof Aptitude)[keyof typeof Aptitude];

export interface HorseParameters {
  readonly speed: number;
  readonly stamina: number;
  readonly power: number;
  readonly guts: number;
  readonly wisdom: number;
  readonly strategy: IStrategy;
  readonly distanceAptitude: IAptitude;
  readonly surfaceAptitude: IAptitude;
  readonly strategyAptitude: IAptitude;
  readonly rawStamina: number;
}

export class StrategyHelpers {
  static assertIsStrategy(strategy: number): asserts strategy is IStrategy {
    if (!Object.prototype.hasOwnProperty.call(Strategy, strategy)) {
      throw new Error(`Strategy ${strategy} is not a valid Strategy`);
    }
  }

  static strategyMatches(strategyA: IStrategy, strategyB: IStrategy) {
    const areSame = strategyA === strategyB;
    const aIsRunaway =
      strategyA == Strategy.Nige && strategyB == Strategy.Oonige;
    const bIsRunaway =
      strategyB == Strategy.Nige && strategyA == Strategy.Oonige;

    return areSame || aIsRunaway || bIsRunaway;
  }
}
