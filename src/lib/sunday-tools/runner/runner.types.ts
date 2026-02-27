import { Aptitude, Strategy, strategies } from './definitions';
import type { IAptitude, IStrategy } from './definitions';

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

export function parseAptitudeName(value: string): IAptitude {
  const key = value.toUpperCase();

  switch (key) {
    case 'S':
      return Aptitude.S;
    case 'A':
      return Aptitude.A;
    case 'B':
      return Aptitude.B;
    case 'C':
      return Aptitude.C;
    case 'D':
      return Aptitude.D;
    case 'E':
      return Aptitude.E;
    case 'F':
      return Aptitude.F;
    case 'G':
      return Aptitude.G;
    default:
      throw new Error(`Invalid aptitude value: "${value}"`);
  }
}

export function parseStrategyName(value: string): IStrategy {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'runaway':
      return Strategy.Runaway;
    case 'front runner':
      return Strategy.FrontRunner;
    case 'pace chaser':
      return Strategy.PaceChaser;
    case 'late surger':
      return Strategy.LateSurger;
    case 'end closer':
      return Strategy.EndCloser;
    default:
      throw new Error(`Invalid strategy value: "${value}"`);
  }
}
