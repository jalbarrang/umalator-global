import { CourseHelpers } from '../course/CourseData';
import { Region, RegionList } from '../utils/Region';
import { getDefaultParser } from './activation/ConditionParser';
import { Conditions } from './activation/ConditionRegistry';
import { immediate, noopRandom, random } from './activation/helpers';
import { ImmediatePolicy } from './activation/policies/ImmediatePolicy';
import { SkillPerspective, SkillTarget } from './types';
import type { ISkillPerspective, ISkillRarity, ISkillTarget, ISkillType } from './types';
import type { DynamicCondition } from './activation/ConditionRegistry';
import type { DefaultParser } from './activation/ConditionParser';
import type { RunnerParameters } from '../runner/types';
import type { CourseData, PartialRaceParameters, RaceParameters, SkillEffect } from '../core/types';
import type { Skill } from '@/modules/skills/utils';
import type { ActivationSamplePolicy } from './activation/policies/ActivationSamplePolicy';
import { skillsById } from '@/modules/skills/utils';

export type RawSkillEffect = {
  modifier: number;
  target: ISkillTarget;
  type: number;
};

export type SkillAlternative = {
  baseDuration: number;
  condition: string;
  precondition?: string;
  effects: Array<RawSkillEffect>;
};

export interface SkillData {
  skillId: string;
  perspective: ISkillPerspective;
  rarity: ISkillRarity;
  samplePolicy: ActivationSamplePolicy;
  regions: RegionList;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
}

function isTarget(self: ISkillPerspective, targetType: ISkillTarget) {
  if (targetType == SkillTarget.All) {
    return true;
  }

  if (self == SkillPerspective.Any) {
    return true;
  }

  const isSelfPerspectiveSelf = self == SkillPerspective.Self;
  const isTargetSelf = targetType == SkillPerspective.Self;

  return isSelfPerspectiveSelf == isTargetSelf;
}

function buildSkillEffects(skill: SkillAlternative, perspective: ISkillPerspective) {
  const effects: Array<SkillEffect> = [];

  for (const effect of skill.effects) {
    if (isTarget(perspective, effect.target)) {
      effects.push({
        type: effect.type as ISkillType,
        baseDuration: skill.baseDuration / 10000,
        modifier: effect.modifier / 10000,
        target: effect.target,
      });
    }
  }

  return effects;
}

export type SkillTrigger = {
  skillId: string;
  perspective: ISkillPerspective;
  // for some reason 1*/2* uniques, 1*/2* upgraded to 3*, and naturally 3* uniques all have different rarity (3, 4, 5 respectively)
  rarity: ISkillRarity;
  samplePolicy: ActivationSamplePolicy;
  regions: RegionList;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
};

export function buildSkillData(
  horse: RunnerParameters,
  raceParams: PartialRaceParameters,
  course: CourseData,
  wholeCourse: RegionList,
  parser: DefaultParser,
  skillId: string,
  perspective: ISkillPerspective,
  ignoreNullEffects: boolean = false,
): Array<SkillTrigger> {
  const skill: Skill | undefined = skillsById.get(skillId);

  if (!skill) {
    throw new Error('bad skill ID ' + skillId);
  }

  const extra = Object.assign({ skillId }, raceParams);

  const alternatives = skill.data.alternatives;
  const triggers = [];

  for (let i = 0; i < alternatives.length; ++i) {
    const skillAlternative = alternatives[i];

    let full = new RegionList();
    wholeCourse.forEach((r) => full.push(r));

    if (skillAlternative.precondition) {
      const parsedPrecondition = parser.parse(parser.tokenize(skillAlternative.precondition));

      const preRegions = parsedPrecondition.apply(wholeCourse, course, horse, extra)[0];

      if (preRegions.length == 0) {
        continue;
      }

      const bounds = new Region(preRegions[0].start, wholeCourse[wholeCourse.length - 1].end);

      full = full.rmap((r) => r.intersect(bounds));
    }

    const conditionTokens = parser.tokenize(skillAlternative.condition);
    const parsedOperator = parser.parse(conditionTokens);

    const [regions, extraCondition] = parsedOperator.apply(full, course, horse, extra);

    if (regions.length === 0) {
      continue;
    }

    if (
      triggers.length > 0 &&
      !/is_activate_other_skill_detail|is_used_skill_id/.test(skillAlternative.condition)
    ) {
      // i don't like this at all. the problem is some skills with two triggers (for example all the is_activate_other_skill_detail ones)
      // need to place two triggers so the second effect can activate, however, some other skills with two triggers only ever activate one
      // even if they have non-mutually-exclusive conditions (for example Jungle Pocket unique). i am not currently sure what distinguishes
      // them in the game implementation. it's pretty inconsistent about whether double-trigger skills force the conditions to be mutually
      // exclusive or not even if it only wants one of them to activate; for example Daitaku Helios unique ensures the distance conditions
      // are mutually exclusive for both triggers but Jungle Pocket doesn't. for the time being we're only going to place the first trigger
      // unless the second one is explicitly is_activate_other_skill_detail or is_used_skill_id (need this for NY Ace).
      // !!! FIXME this is actually bugged for NY Ace unique since she'll get both effects if she uses oonige.
      continue;
    }

    const effects = buildSkillEffects(skillAlternative, perspective);

    if (effects.length > 0 || ignoreNullEffects) {
      const rarity = skill.data.rarity;

      triggers.push({
        skillId: skillId,
        perspective: perspective,
        // for some reason 1*/2* uniques, 1*/2* upgraded to 3*, and naturally 3* uniques all have different rarity (3, 4, 5 respectively)
        rarity: rarity >= 3 && rarity <= 5 ? 3 : rarity,
        samplePolicy: parsedOperator.samplePolicy,
        regions: regions,
        extraCondition: extraCondition,
        effects: effects,
      });
    }
  }

  if (triggers.length > 0) {
    return triggers;
  }

  // if we get here, it means that no alternatives have their conditions satisfied for this course/horse.
  // however, for purposes of summer goldship unique (Adventure of 564), we still have to add something, since
  // that could still cause them to activate. so just add the first alternative at a location after the course
  // is over with a constantly false dynamic condition so that it never activates normally.
  const effects = buildSkillEffects(alternatives[0], perspective);

  if (effects.length == 0 && !ignoreNullEffects) {
    return [];
  }

  const rarity = skill.data.rarity;
  const afterEnd = new RegionList();
  afterEnd.push(new Region(9999, 9999));

  return [
    {
      skillId: skillId,
      perspective: perspective,
      rarity: rarity >= 3 && rarity <= 5 ? 3 : rarity,
      samplePolicy: ImmediatePolicy,
      regions: afterEnd,
      extraCondition: (_) => false,
      effects: effects,
    },
  ];
}

export const conditionsWithActivateCountsAsRandom = Object.assign({}, Conditions, {
  activate_count_all: random({
    filterGte(
      regions: RegionList,
      n: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      // hard-code TM Opera O (NY) unique and Neo Universe unique to pretend they're immediate while allowing randomness for other skills
      // (conveniently the only two with n == 7)
      // ideally find a better solution
      if (n == 7) {
        const rl = new RegionList();
        // note that RandomPolicy won't sample within 10m from the end so this has to be +11
        regions.forEach((r) => rl.push(new Region(r.start, r.start + 11)));
        return rl;
      }
      /*if (extra.skillId == '110151' || extra.skillId == '910151') {
      const rl = new RegionList();
      rl.push(new Region(course.distance - 401, course.distance - 399));
      return rl;
    }*/
      // somewhat arbitrarily decide you activate about 23 skills per race and then use a region n / 23 ± 20%
      const bounds = new Region(
        Math.min(n / 23.0 - 0.2, 0.6) * course.distance,
        Math.min(n / 23.0 + 0.2, 1.0) * course.distance,
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte(
      _regions: RegionList,
      _n: number,
      _course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return new RegionList(); // tentatively, we're not really interested in the <= branch of these conditions
    },
  }),
  activate_count_end_after: random({
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, 2),
        CourseHelpers.phaseEnd(course.distance, 3),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_heal: noopRandom,
  activate_count_later_half: random({
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(course.distance / 2, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_middle: random({
    filterGte(
      regions: RegionList,
      n: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const start = CourseHelpers.phaseStart(course.distance, 1),
        end = CourseHelpers.phaseEnd(course.distance, 1);
      const bounds = new Region(start, start + (n / 10) * (end - start));
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_start: immediate({
    // for 地固め - Start of the race
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, 0),
        CourseHelpers.phaseEnd(course.distance, 0),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
});

export const defaultParser = getDefaultParser();
export const acrParser = getDefaultParser(conditionsWithActivateCountsAsRandom);
