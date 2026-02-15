import { withDefaultCond } from '../definitions';
import { kTrue } from './utils';
import type { CourseData } from '../../../course/definitions';
import type { RaceParameters } from '../../../definitions';
import type { HorseParameters } from '../../../runner/HorseTypes';
import type { RegionList } from '../../../utils/Region';
import type { ActivationSamplePolicy } from '../../policies/ActivationSamplePolicy';
import type { ICondition, Operator, OperatorsConfig } from '../definitions';
import type { DynamicCondition } from '../../../core/RaceSolver';

export class EqOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterEq(regions, this.argument, course, horse, extra));
  }
}

export class NeqOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterNeq(regions, this.argument, course, horse, extra));
  }
}

export class LtOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterLt(regions, this.argument, course, horse, extra));
  }
}

export class LteOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterLte(regions, this.argument, course, horse, extra));
  }
}

export class GtOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterGt(regions, this.argument, course, horse, extra));
  }
}

export class GteOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly condition: ICondition,
    readonly argument: number,
  ) {
    this.samplePolicy = condition.samplePolicy;
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    return withDefaultCond(this.condition.filterGte(regions, this.argument, course, horse, extra));
  }
}

export class AndOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly left: Operator,
    readonly right: Operator,
  ) {
    this.samplePolicy = left.samplePolicy.reconcile(right.samplePolicy);
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    const [leftval, leftcond] = this.left.apply(regions, course, horse, extra);
    const [rightval, rightcond] = this.right.apply(leftval, course, horse, extra);
    if (leftcond === kTrue && rightcond === kTrue) {
      // avoid allocating an unnecessary closure object in the common case of no dynamic conditions
      return [rightval, kTrue] as [RegionList, DynamicCondition];
    }
    return [rightval, (s) => leftcond(s) && rightcond(s)] as [RegionList, DynamicCondition];
  }
}

export class OrOperator {
  samplePolicy: ActivationSamplePolicy;

  constructor(
    readonly left: Operator,
    readonly right: Operator,
  ) {
    // not entirely clear what the right thing to do here is
    // but i'm pretty sure there are no skills with disjunctive conditions that
    // would have different sample policies (probably)
    this.samplePolicy = left.samplePolicy.reconcile(right.samplePolicy);
  }

  apply(regions: RegionList, course: CourseData, horse: HorseParameters, extra: RaceParameters) {
    const [leftval, leftcond] = this.left.apply(regions, course, horse, extra);
    const [rightval, rightcond] = this.right.apply(regions, course, horse, extra);

    // FIXME this is, technically, completely broken. really the correct way to do this is to tie dynamic conditions to regions
    // and propagate them during union and intersection. however, that's really annoying, and it turns out in practice that
    // dynamic conditions never actually change between branches of an or operator if the static conditions differ, in which case
    // this works out just fine. specifically, it's fine if /either/ the dynamic conditions differ or the static conditions differ
    // between branches, but not both.
    // eg, consider something like phase==0&accumulatetime>=20@phase==1&accumulatetime>=30
    // suppose phase 0 lasts 21 seconds, in which case the left branch would not trigger. the right branch then should not trigger
    // until 30 seconds, but this obviously does because it's broken. conditions like this do not currently appear on any skills.
    // unfortunately, there's not really a way here to assert that leftcond and rightcond are the same.
    // this is rather risky. i don't like it.
    // TODO actually, it's perfectly possible to just inspect the tree to make sure the above limitations are satisfied.
    return [leftval.union(rightval), (s) => leftcond(s) || rightcond(s)] as [
      RegionList,
      DynamicCondition,
    ];
  }
}

export const defaultOperators: OperatorsConfig<ICondition, Operator> = {
  and: AndOperator,
  or: OrOperator,
  eq: EqOperator,
  neq: NeqOperator,
  lt: LtOperator,
  lte: LteOperator,
  gt: GtOperator,
  gte: GteOperator,
};
