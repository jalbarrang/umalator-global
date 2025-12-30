import { kTrue } from './conditions/utils';
import type { DynamicCondition } from '@/modules/simulation/lib/core/RaceSolver';
import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type { HorseParameters } from '@/modules/simulation/lib/runner/HorseTypes';
import type { ActivationSamplePolicy } from '@/modules/simulation/lib/skills/policies/ActivationSamplePolicy';
import { RegionList } from '@/modules/simulation/lib/utils/Region';

// ============================================================
// Base Types
// ============================================================

export interface Operator {
  samplePolicy: ActivationSamplePolicy;
  apply: (
    regions: RegionList,
    course: CourseData,
    horse: HorseParameters,
    extra: RaceParameters,
  ) => [RegionList, DynamicCondition];
}

export interface CmpOperator extends Operator {
  condition: ICondition;
  argument: number;
}

export interface ICondition {
  samplePolicy: ActivationSamplePolicy;
  filterEq: ConditionFilter;
  filterNeq: ConditionFilter;
  filterLt: ConditionFilter;
  filterLte: ConditionFilter;
  filterGt: ConditionFilter;
  filterGte: ConditionFilter;
}

export type ConditionFilter = (
  regions: RegionList,
  arg: number,
  course: CourseData,
  horse: HorseParameters,
  extra: RaceParameters,
) => RegionList | [RegionList, DynamicCondition];

// ============================================================
// Parser Configuration Types
// ============================================================

export interface OperatorsConfig<TCondition, TOperator> {
  and: new (left: TOperator, right: TOperator) => TOperator;
  or: new (left: TOperator, right: TOperator) => TOperator;
  eq: new (cond: TCondition, arg: number) => TOperator;
  neq: new (cond: TCondition, arg: number) => TOperator;
  lt: new (cond: TCondition, arg: number) => TOperator;
  lte: new (cond: TCondition, arg: number) => TOperator;
  gt: new (cond: TCondition, arg: number) => TOperator;
  gte: new (cond: TCondition, arg: number) => TOperator;
}

export type ConditionsMap<TCondition> = Record<string, TCondition>;

// ============================================================
// Parser Types - String-based API (hides internal Token type)
// ============================================================

/** AST Node - result of parsing a condition expression */
export type ParseNode<TCondition = ICondition, TOperator = Operator> =
  | { type: 'int'; value: number }
  | { type: 'cond'; cond: TCondition }
  | { type: 'op'; op: TOperator };

/** Parser instance - takes condition strings directly */
export interface Parser<TCondition, TOperator> {
  /** Parse a condition string into an operator tree (throws if not an operator) */
  parse: (conditionString: string) => TOperator;
  /** Parse a condition string into any node type */
  parseAny: (conditionString: string) => ParseNode<TCondition, TOperator>;
}

/** Default parser type alias for convenience */
export type DefaultParser = Parser<ICondition, Operator>;

// ============================================================
// Type Extraction Utilities
// ============================================================

export type InferCondition<TParser> = TParser extends Parser<infer C, unknown> ? C : never;
export type InferOperator<TParser> = TParser extends Parser<unknown, infer O> ? O : never;

// ============================================================
// Helper Functions
// ============================================================

export function withDefaultCond(r: RegionList | [RegionList, DynamicCondition]) {
  if (r instanceof RegionList) {
    return [r, kTrue] as [RegionList, DynamicCondition];
  }
  return r;
}
