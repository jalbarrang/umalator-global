import { Strategy, strategies } from './definitions';
import type { IStrategy } from './definitions';

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
