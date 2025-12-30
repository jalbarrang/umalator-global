import type { IAptitude, IStrategy } from '@/modules/simulation/lib/runner/definitions';
import { Strategy, strategies } from '@/modules/simulation/lib/runner/definitions';

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
