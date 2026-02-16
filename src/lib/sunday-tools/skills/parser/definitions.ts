import { kTrue } from './conditions/utils';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { ActivationSamplePolicy } from '@/lib/sunday-tools/skills/policies/ActivationSamplePolicy';
import type { Runner } from '@/lib/sunday-tools/common/runner';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { DynamicCondition } from '@/lib/sunday-tools/skills/skill.types';
import { RegionList } from '@/lib/sunday-tools/shared/region';

// ============================================================
// Base Types
// ============================================================

export interface Operator {
  samplePolicy: ActivationSamplePolicy;
  apply: (
    regions: RegionList,
    course: CourseData,
    runner: Runner,
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
  runner: Runner,
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
