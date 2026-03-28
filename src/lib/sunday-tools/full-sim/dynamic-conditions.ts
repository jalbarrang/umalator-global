import type { DynamicCondition } from '../skills/skill.types';
import type { ConditionFilterParams, ICondition } from '../skills/parser/definitions';

export type DynamicConditionComparator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';

export type DynamicConditionFactory = (
  arg: number,
  comparator: DynamicConditionComparator,
) => DynamicCondition;

const registry = new Map<string, DynamicConditionFactory>();

export function compare(
  value: number,
  arg: number,
  cmp: DynamicConditionComparator,
): boolean {
  switch (cmp) {
    case 'eq':
      return value === arg;
    case 'neq':
      return value !== arg;
    case 'lt':
      return value < arg;
    case 'lte':
      return value <= arg;
    case 'gt':
      return value > arg;
    case 'gte':
      return value >= arg;
  }
}

export function registerDynamicCondition(name: string, factory: DynamicConditionFactory): void {
  registry.set(name, factory);
}

export function getDynamicCondition(name: string): DynamicConditionFactory | undefined {
  return registry.get(name);
}

export function hasDynamicCondition(name: string): boolean {
  return registry.has(name);
}

function getDynamicResult(
  params: ConditionFilterParams,
  conditionName: string,
  comparator: DynamicConditionComparator,
) {
  if (params.extra.mode !== 'normal' || !hasDynamicCondition(conditionName)) {
    return undefined;
  }

  const factory = getDynamicCondition(conditionName);
  if (!factory) {
    return undefined;
  }

  return [params.regions, factory(params.arg, comparator)] as const;
}

export function dynamicOrStatic(staticCondition: ICondition, conditionName: string): ICondition {
  return {
    ...staticCondition,
    filterEq(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'eq') ?? staticCondition.filterEq(params);
    },
    filterNeq(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'neq') ?? staticCondition.filterNeq(params);
    },
    filterLt(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'lt') ?? staticCondition.filterLt(params);
    },
    filterLte(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'lte') ?? staticCondition.filterLte(params);
    },
    filterGt(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'gt') ?? staticCondition.filterGt(params);
    },
    filterGte(params: ConditionFilterParams) {
      return getDynamicResult(params, conditionName, 'gte') ?? staticCondition.filterGte(params);
    },
  };
}
