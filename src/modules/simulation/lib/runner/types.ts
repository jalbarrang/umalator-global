export const Strategy = {
  FrontRunner: 1,
  PaceChaser: 2,
  LateSurger: 3,
  EndCloser: 4,
  Runaway: 5,
} as const;
export const strategies: ReadonlyArray<IStrategy> = Object.values(Strategy);
export type IStrategy = (typeof Strategy)[keyof typeof Strategy];

export const StrategyName = {
  [Strategy.FrontRunner]: 'Front Runner',
  [Strategy.PaceChaser]: 'Pace Chaser',
  [Strategy.LateSurger]: 'Late Surger',
  [Strategy.EndCloser]: 'End Closer',
  [Strategy.Runaway]: 'Runaway',
} as const;
export type IStrategyName = (typeof StrategyName)[keyof typeof StrategyName];

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
export const aptitudes: ReadonlyArray<IAptitude> = Object.values(Aptitude);
export type IAptitude = (typeof Aptitude)[keyof typeof Aptitude];
export const AptitudeName = {
  [Aptitude.S]: 'S',
  [Aptitude.A]: 'A',
  [Aptitude.B]: 'B',
  [Aptitude.C]: 'C',
  [Aptitude.D]: 'D',
  [Aptitude.E]: 'E',
  [Aptitude.F]: 'F',
  [Aptitude.G]: 'G',
} as const;

export type RunnerParameters = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategy;
  distanceAptitude: IAptitude;
  surfaceAptitude: IAptitude;
  strategyAptitude: IAptitude;
  rawStamina: number;
};

export class StrategyHelpers {
  static assertIsStrategy(strategy: number): asserts strategy is IStrategy {
    if (!strategies.includes(strategy as IStrategy)) {
      throw new Error(`Strategy ${strategy} is not a valid Strategy`);
    }
  }

  static strategyMatches(strategyA: IStrategy, strategyB: IStrategy) {
    const areSame = strategyA === strategyB;
    const aIsRunaway = strategyA == Strategy.FrontRunner && strategyB == Strategy.Runaway;
    const bIsRunaway = strategyB == Strategy.FrontRunner && strategyA == Strategy.Runaway;

    return areSame || aIsRunaway || bIsRunaway;
  }
}
