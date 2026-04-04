/*
	accumulatetime, activate_count_all, activate_count_end_after, activate_count_heal, activate_count_middle, activate_count_start,
	all_corner_random, always, bashin_diff_behind, bashin_diff_infront, behind_near_lane_time, behind_near_lane_time_set1, blocked_all_continuetime,
	blocked_front, blocked_front_continuetime, blocked_side_continuetime, change_order_onetime, change_order_up_end_after,
	change_order_up_finalcorner_after, compete_fight_count, corner, corner_random, distance_diff_rate, distance_diff_top, distance_rate,
	distance_rate_after_random, distance_type, down_slope_random, grade, ground_condition, ground_type, hp_per, infront_near_lane_time, is_badstart,
	is_basis_distance, is_behind_in, is_exist_chara_id, is_finalcorner, is_finalcorner_laterhalf, is_finalcorner_random, is_hp_empty_onetime,
	is_last_straight_onetime, is_lastspurt, is_move_lane, is_overtake, is_surrounded, is_temptation, lane_type, last_straight_random, near_count,
	order, order_rate, order_rate_in20_continue, order_rate_in40_continue, order_rate_out40_continue, order_rate_out50_continue,
	order_rate_out70_continue, overtake_target_no_order_up_time, overtake_target_time, phase, phase_firsthalf_random, phase_laterhalf_random,
	phase_random, popularity, post_number, random_lot, remain_distance, remain_distance_viewer_id, rotation, running_style,
	running_style_count_nige_otherself, running_style_count_oikomi_otherself, running_style_count_same, running_style_count_same_rate,
	running_style_count_sashi_otherself, running_style_count_senko_otherself, running_style_equal_popularity_one,
	running_style_temptation_count_nige, running_style_temptation_count_oikomi, running_style_temptation_count_sashi,
	running_style_temptation_count_senko, same_skill_horse_count, season, slope, straight_front_type, straight_random, temptation_count,
	temptation_count_behind, temptation_count_infront, track_id, up_slope_random, weather
*/

import {
  AllCornerRandomPolicy,
  CornerRandomPolicy,
  ImmediatePolicy,
  StraightRandomPolicy,
} from '../../policies/ActivationSamplePolicy';
import {
  erlangRandom,
  immediate,
  noopErlangRandom,
  noopImmediate,
  noopSectionRandom,
  notSupported,
  orderFilter,
  orderInFilter,
  orderOutFilter,
  random,
  shiftRegionsForwardByMinTime,
  uniformRandom,
  valueFilter,
} from './utils';
import { dynamicOrStatic } from '../../../full-sim/dynamic-conditions';
import type { Runner } from '@/lib/sunday-tools/common/runner';
import type { DynamicCondition } from '@/lib/sunday-tools/skills/skill.types';
import type { IPhase } from '@/lib/sunday-tools/course/definitions';
import type { ConditionFilterParams, ConditionsMap, ICondition } from '../definitions';
import { StrategyHelpers } from '@/lib/sunday-tools/runner/runner.types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { Region, RegionList } from '@/lib/sunday-tools/shared/region';
import { Strategy } from '@/lib/sunday-tools/runner/definitions';

function valueFilterOrNoop(
  getValue: (params: ConditionFilterParams) => number | undefined,
): ICondition {
  const applyComparison = (
    params: ConditionFilterParams,
    compare: (value: number, arg: number) => boolean,
  ) => {
    const value = getValue(params);
    if (value === undefined) {
      return params.regions;
    }

    return compare(value, params.arg) ? params.regions : new RegionList();
  };

  return immediate({
    filterEq(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value == arg);
    },
    filterNeq(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value != arg);
    },
    filterLt(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value < arg);
    },
    filterLte(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value <= arg);
    },
    filterGt(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value > arg);
    },
    filterGte(params: ConditionFilterParams) {
      return applyComparison(params, (value, arg) => value >= arg);
    },
  });
}

export const defaultConditions: ConditionsMap<ICondition> = {
  accumulatetime: immediate({
    filterGte({ regions, arg: t }: ConditionFilterParams) {
      return [regions, (r: Runner) => r.accumulateTime.t >= t] as [RegionList, DynamicCondition];
    },
  }),
  activate_count_all: immediate({
    filterLte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (r: Runner) => r.skillsActivatedCount <= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
    filterGte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (r: Runner) => r.skillsActivatedCount >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_end_after: immediate({
    filterGte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.skillsActivatedPhaseMap[2] >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_heal: immediate({
    filterGte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.healsActivatedCount >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_middle: immediate({
    filterGte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.skillsActivatedPhaseMap[1] >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_start: immediate({
    filterGte({ regions, arg: n }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.skillsActivatedPhaseMap[0] >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  all_corner_random: {
    samplePolicy: AllCornerRandomPolicy,
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be all_corner_random==1');
      }

      const corners = course.corners.map((c) => new Region(c.start, c.start + c.length));
      return regions.rmap((r) => corners.map((c) => r.intersect(c)));
    },
    filterNeq: notSupported,
    filterLt: notSupported,
    filterLte: notSupported,
    filterGt: notSupported,
    filterGte: notSupported,
  },
  always: noopImmediate,

  // NB. since skill conditions are processed before any skill activations, stats here are base stats (i.e. greens are not included)
  base_power: valueFilter(({ runner }) => runner.baseStats.power),
  base_speed: valueFilter(({ runner }) => runner.baseStats.speed),
  base_stamina: valueFilter(({ runner }) => runner.baseStats.stamina),
  base_guts: valueFilter(({ runner }) => runner.baseStats.guts),
  base_wiz: valueFilter(({ runner }) => runner.baseStats.wit),

  // Bashin diff conditions
  bashin_diff_behind: dynamicOrStatic(noopErlangRandom(3, 2.0), 'bashin_diff_behind'),
  bashin_diff_infront: dynamicOrStatic(noopErlangRandom(3, 2.0), 'bashin_diff_infront'),
  behind_near_lane_time: dynamicOrStatic(noopErlangRandom(3, 2.0), 'behind_near_lane_time'),
  // NB. at least in theory _set1 should have a slightly more early-biased distribution since it's technically easier to activate, but I don't
  // really think it makes much of a difference. Same with blocked_front vs blocked_front_continuetime I suppose.
  behind_near_lane_time_set1: dynamicOrStatic(
    noopErlangRandom(3, 2.0),
    'behind_near_lane_time_set1',
  ),
  blocked_all_continuetime: dynamicOrStatic(noopErlangRandom(3, 2.0), 'blocked_all_continuetime'),
  blocked_front: dynamicOrStatic(noopErlangRandom(3, 2.0), 'blocked_front'),
  blocked_front_continuetime: dynamicOrStatic(
    erlangRandom(3, 2.0, {
      filterGte: shiftRegionsForwardByMinTime,
    }),
    'blocked_front_continuetime',
  ),
  blocked_side_continuetime: dynamicOrStatic(
    erlangRandom(3, 2.0, {
      filterGte: shiftRegionsForwardByMinTime,
    }),
    'blocked_side_continuetime',
  ),
  change_order_onetime: dynamicOrStatic(noopErlangRandom(3, 2.0), 'change_order_onetime'),
  change_order_up_end_after: dynamicOrStatic(
    erlangRandom(3, 2.0, {
      filterGte({ regions, course }: ConditionFilterParams) {
        const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
        return regions.rmap((r) => r.intersect(bounds));
      },
    }),
    'change_order_up_end_after',
  ),
  change_order_up_finalcorner_after: dynamicOrStatic(
    erlangRandom(3, 2.0, {
      filterGte({ regions, course }: ConditionFilterParams) {
        if (!CourseHelpers.isSortedByStart(course.corners)) {
          throw new Error('course corners must be sorted by start');
        }

        if (course.corners.length == 0) {
          return new RegionList();
        }
        const finalCornerStart = course.corners[course.corners.length - 1].start;
        const bounds = new Region(finalCornerStart, course.distance);
        return regions.rmap((r) => r.intersect(bounds));
      },
    }),
    'change_order_up_finalcorner_after',
  ),
  change_order_up_middle: dynamicOrStatic(
    erlangRandom(3, 2.0, {
      filterGte({ regions, course }: ConditionFilterParams) {
        const bounds = new Region(
          CourseHelpers.phaseStart(course.distance, 1),
          CourseHelpers.phaseEnd(course.distance, 1),
        );
        return regions.rmap((r) => r.intersect(bounds));
      },
    }),
    'change_order_up_middle',
  ),
  compete_fight_count: dynamicOrStatic(
    uniformRandom({
      filterGt({ regions, course }: ConditionFilterParams) {
        if (!CourseHelpers.isSortedByStart(course.straights)) {
          throw new Error('course straights must be sorted by start');
        }

        const lastStraight = course.straights[course.straights.length - 1];
        return regions.rmap((r) => r.intersect(lastStraight));
      },
    }),
    'compete_fight_count',
  ),
  corner: immediate({
    filterEq({ regions, arg: cornerNum, course }: ConditionFilterParams) {
      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (cornerNum == 0) {
        // can't simply use straights here as there may be parts of a course which are neither corners nor straights
        let lastEnd = 0;
        const nonCorners = course.corners.map((c) => {
          const r = new Region(lastEnd, c.start);
          lastEnd = c.start + c.length;
          return r;
        });
        if (lastEnd != course.distance) {
          nonCorners.push(new Region(lastEnd, course.distance));
        }
        return regions.rmap((r) => nonCorners.map((s) => r.intersect(s)));
      } else if (course.corners.length + cornerNum >= 5) {
        const corners: Array<Region> = [];

        for (
          let cornerIdx = course.corners.length + cornerNum - 5;
          cornerIdx >= 0;
          cornerIdx -= 4
        ) {
          const corner = course.corners[cornerIdx];
          corners.push(new Region(corner.start, corner.start + corner.length));
        }

        corners.reverse();

        return regions.rmap((r) => corners.map((c) => r.intersect(c)));
      } else {
        return new RegionList();
      }
    },
    filterNeq({ regions, arg: cornerNum, course }: ConditionFilterParams) {
      if (cornerNum !== 0) {
        throw new Error('only supports corner!=0');
      }
      const corners = course.corners.map((c) => new Region(c.start, c.start + c.length));
      return regions.rmap((r) => corners.map((c) => r.intersect(c)));
    },
  }),
  corner_count: valueFilter(({ course }) => course.corners.length),
  corner_random: random({
    // Keep this policy distinct from generic RandomPolicy so OrOperator can preserve
    // branch priority for patterns like corner_random==1@corner_random==2.
    samplePolicy: CornerRandomPolicy,
    filterEq({ regions, arg: cornerNum, course }: ConditionFilterParams) {
      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length + cornerNum >= 5) {
        const corner = course.corners[course.corners.length + cornerNum - 5];
        const cornerBounds = new Region(corner.start, corner.start + corner.length);
        return regions.rmap((r) => r.intersect(cornerBounds));
      }

      return new RegionList();
    },
  }),
  course_distance: valueFilter(({ course }) => course.distance),
  distance_diff_rate: dynamicOrStatic(noopImmediate, 'distance_diff_rate'),
  distance_diff_top: dynamicOrStatic(noopImmediate, 'distance_diff_top'),
  distance_diff_top_float: dynamicOrStatic(noopImmediate, 'distance_diff_top_float'),
  distance_rate: immediate({
    filterLte({ regions, arg: rate, course }: ConditionFilterParams) {
      const bounds = new Region(0, (course.distance * rate) / 100);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGte({ regions, arg: rate, course }: ConditionFilterParams) {
      const bounds = new Region((course.distance * rate) / 100, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  distance_rate_after_random: random({
    filterEq({ regions, arg: rate, course }: ConditionFilterParams) {
      const bounds = new Region((course.distance * rate) / 100, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  distance_type: immediate({
    filterEq({ regions, arg: distanceType, course }: ConditionFilterParams) {
      CourseHelpers.assertIsDistanceType(distanceType);

      if (course.distanceType == distanceType) {
        return regions;
      }

      return new RegionList();
    },
    filterNeq({ regions, arg: distanceType, course }: ConditionFilterParams) {
      CourseHelpers.assertIsDistanceType(distanceType);

      if (course.distanceType != distanceType) {
        return regions;
      }

      return new RegionList();
    },
  }),
  down_slope_random: random({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be down_slope_random==1');
      }

      const slopes = course.slopes
        .filter((s) => s.slope < 0)
        .map((s) => new Region(s.start, s.start + s.length));

      return regions.rmap((r) => slopes.map((s) => r.intersect(s)));
    },
  }),
  grade: valueFilter(({ extra }) => extra.grade),
  ground_condition: valueFilter(({ extra }) => extra.ground),
  ground_type: valueFilter(({ course }) => course.surface),
  hp_per: immediate({
    filterLte({ regions, arg: hpPer }: ConditionFilterParams) {
      hpPer /= 100;
      return [regions, (runner: Runner) => runner.healthPolicy.healthRatioRemaining() <= hpPer] as [
        RegionList,
        DynamicCondition,
      ];
    },
    filterGte({ regions, arg: hpPer }: ConditionFilterParams) {
      hpPer /= 100;
      return [regions, (runner: Runner) => runner.healthPolicy.healthRatioRemaining() >= hpPer] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  infront_near_lane_time: dynamicOrStatic(noopErlangRandom(3, 2.0), 'infront_near_lane_time'),
  is_activate_other_skill_detail: immediate({
    filterEq({ regions, arg: one, extra }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_activate_other_skill_detail==1');
      }

      return [regions, (runner: Runner) => runner.usedSkills.has(extra.skillId)] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  is_basis_distance: immediate({
    filterEq({ regions, arg: flag, course }: ConditionFilterParams) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_basis_distance==0 or is_basis_distance==1');
      }

      return Math.min(course.distance % 400, 1) != flag ? regions : new RegionList();
    },
  }),
  is_badstart: immediate({
    filterEq({ regions, arg: flag }: ConditionFilterParams) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_badstart==0 or is_badstart==1');
      }

      const filterFunc = flag
        ? (runner: Runner) => runner.startDelay > 0.08
        : (runner: Runner) => runner.startDelay <= 0.08;

      return [regions, filterFunc] as [RegionList, DynamicCondition];
    },
  }),
  is_behind_in: dynamicOrStatic(noopImmediate, 'is_behind_in'),
  is_dirtgrade: immediate({
    filterEq({ regions, arg: flag, course }: ConditionFilterParams) {
      if (flag !== 1) {
        throw new Error('must be is_dirtgrade==1');
      }

      return [10101, 10103, 10104, 10105].indexOf(course.raceTrackId) > -1
        ? regions
        : new RegionList();
    },
    filterNeq({ regions, arg: flag, course }: ConditionFilterParams) {
      if (flag !== 1) {
        throw new Error('must be is_dirtgrade!=1');
      }

      return [10101, 10103, 10104, 10105].indexOf(course.raceTrackId) == -1
        ? regions
        : new RegionList();
    },
  }),
  is_finalcorner: immediate({
    filterEq({ regions, arg: flag, course }: ConditionFilterParams) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_finalcorner==0 or is_finalcorner==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }
      const finalCornerStart = course.corners[course.corners.length - 1].start;
      const bounds = flag
        ? new Region(finalCornerStart, course.distance)
        : new Region(0, finalCornerStart);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  is_finalcorner_laterhalf: immediate({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_finalcorner_laterhalf==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }

      const fc = course.corners[course.corners.length - 1];
      const bounds = new Region((fc.start + fc.start + fc.length) / 2, fc.start + fc.length);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  is_finalcorner_random: random({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_finalcorner_random==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }
      const fc = course.corners[course.corners.length - 1];
      const bounds = new Region(fc.start, fc.start + fc.length);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  is_hp_empty_onetime: immediate({
    filterEq({ regions, arg: one }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_hp_empty_onetime==1');
      }

      return [regions, (runner: Runner) => !runner.healthPolicy.hasRemainingHealth()] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  is_lastspurt: immediate({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_lastspurt==1');
      }

      const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
      return [regions.rmap((r) => r.intersect(bounds)), (runner: Runner) => runner.isLastSpurt] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  is_last_straight: immediate({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_last_straight_onetime==1');
      }
      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }
      const lastStraight = course.straights[course.straights.length - 1];
      return regions.rmap((r) => r.intersect(lastStraight));
    },
  }),
  is_last_straight_onetime: immediate({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be is_last_straight_onetime==1');
      }

      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }

      const lastStraightStart = course.straights[course.straights.length - 1].start;

      // TODO ask kuromi about this or something
      const trigger = new Region(lastStraightStart, lastStraightStart + 10);

      return regions.rmap((r) => r.intersect(trigger));
    },
  }),
  /**
   * Picks a random point on the last straight.
   */
  last_straight_random: immediate({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be last_straight_random==1');
      }

      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }

      return regions.rmap((r) => course.straights.map((s) => r.intersect(s)));
    },
  }),
  is_move_lane: dynamicOrStatic(noopErlangRandom(5, 1.0), 'is_move_lane'),
  is_overtake: dynamicOrStatic(noopErlangRandom(1, 2.0), 'is_overtake'),
  is_surrounded: dynamicOrStatic(noopErlangRandom(3, 2.0), 'is_surrounded'),
  is_temptation: dynamicOrStatic(noopImmediate, 'is_temptation'),
  is_used_skill_id: immediate({
    filterEq({ regions, arg: skillId }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.usedSkills.has('' + skillId)] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  lane_type: noopImmediate,
  lastspurt: immediate({
    filterEq({ regions, arg: case_, course }: ConditionFilterParams) {
      // NB. not entirely sure these are correct, based on some vague remarks made by kuromi once
      let f;
      switch (case_) {
        case 1:
          f = (runner: Runner) => runner.isLastSpurt && runner.lastSpurtTransition != -1;
          break;
        case 2:
          f = (runner: Runner) => runner.isLastSpurt && runner.lastSpurtTransition == -1;
          break;
        case 3:
          f = (runner: Runner) => !runner.isLastSpurt;
          break;
        default:
          throw new Error('lastspurt case must be 1-3');
      }
      const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
      return [regions.rmap((r) => r.intersect(bounds)), f] as [RegionList, DynamicCondition];
    },
  }),
  motivation: valueFilter(({ runner }) => runner.mood + 3), // go from -2 to 2 to 1-5 scale
  near_count: dynamicOrStatic(noopErlangRandom(3, 2.0), 'near_count'),
  order: dynamicOrStatic(
    orderFilter((pos: number, _: number) => pos),
    'order',
  ),
  order_rate: dynamicOrStatic(
    orderFilter((rate: number, numUmas: number) => Math.round(numUmas * (rate / 100.0))),
    'order_rate',
  ),
  order_rate_in20_continue: dynamicOrStatic(orderInFilter(0.2), 'order_rate_in20_continue'),
  order_rate_in40_continue: dynamicOrStatic(orderInFilter(0.4), 'order_rate_in40_continue'),
  order_rate_in50_continue: dynamicOrStatic(orderInFilter(0.5), 'order_rate_in50_continue'),
  order_rate_in80_continue: dynamicOrStatic(orderInFilter(0.8), 'order_rate_in80_continue'),
  order_rate_out20_continue: dynamicOrStatic(orderOutFilter(0.2), 'order_rate_out20_continue'),
  order_rate_out40_continue: dynamicOrStatic(orderOutFilter(0.4), 'order_rate_out40_continue'),
  order_rate_out50_continue: dynamicOrStatic(orderOutFilter(0.5), 'order_rate_out50_continue'),
  order_rate_out70_continue: dynamicOrStatic(orderOutFilter(0.7), 'order_rate_out70_continue'),
  overtake_target_no_order_up_time: dynamicOrStatic(
    noopErlangRandom(3, 2.0),
    'overtake_target_no_order_up_time',
  ),
  overtake_target_time: dynamicOrStatic(noopErlangRandom(3, 2.0), 'overtake_target_time'),
  phase: {
    samplePolicy: ImmediatePolicy,
    filterEq(params: ConditionFilterParams) {
      const { regions, arg: phase, course, extra } = params;

      CourseHelpers.assertIsPhase(phase);
      // add a little bit to the end to account for the fact that phase check happens later than skill activations
      // this is mainly relevant for skills with phase condition + a corner condition (e.g. kanata) because corner check
      // occurs before skill activations so when the start of a corner exactly coincides with the end of a phase (e.g.,
      // chuukyou 1800 dirt) these skills can activate on the first frame of what would be the next phase
      // obviously hard coding the skills we want to fudge this for is not really ideal, but it's not clear that it's
      // safe to do in all cases. technically to fix this `phase` should probably be a dynamic condition that actually
      // checks the phase to match in-game mechanics
      const fudge =
        [
          '100591',
          '900591',
          '110261',
          '910261',
          '110191',
          '910191',
          '120451',
          '920451',
          '101502121',
        ].indexOf(extra.skillId) > -1
          ? 10
          : 0;
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, phase),
        CourseHelpers.phaseEnd(course.distance, phase) + fudge,
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterNeq: notSupported,
    filterLt({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      if (phase <= 0) {
        throw new Error('phase == 0');
      }
      const bounds = new Region(0, CourseHelpers.phaseStart(course.distance, phase));
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const bounds = new Region(0, CourseHelpers.phaseEnd(course.distance, phase));
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGt({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      if (phase >= 3) {
        throw new Error('phase > 2');
      }
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, (phase + 1) as IPhase),
        course.distance,
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGte({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const bounds = new Region(CourseHelpers.phaseStart(course.distance, phase), course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  },
  phase_corner_random: random({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const phaseStart = CourseHelpers.phaseStart(course.distance, phase);
      const phaseEnd = CourseHelpers.phaseEnd(course.distance, phase);
      const corners = course.corners
        .filter(
          (c) =>
            (c.start >= phaseStart && c.start < phaseEnd) ||
            (c.start + c.length >= phaseStart && c.start + c.length < phaseEnd),
        )
        .map(
          (c) => new Region(Math.max(c.start, phaseStart), Math.min(c.start + c.length, phaseEnd)),
        );
      return regions.rmap((r) => corners.map((c) => r.intersect(c)));
    },
  }),
  phase_firsthalf: immediate({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 2);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firsthalf_random: random({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 2);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firstquarter: immediate({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 4);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firstquarter_random: random({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 4);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_laterhalf_random: random({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region((start + end) / 2, end);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_random: random({
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, phase),
        CourseHelpers.phaseEnd(course.distance, phase),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_straight_random: {
    samplePolicy: StraightRandomPolicy,
    filterEq({ regions, arg: phase, course }: ConditionFilterParams) {
      CourseHelpers.assertIsPhase(phase);

      const phaseBounds = new Region(
        CourseHelpers.phaseStart(course.distance, phase),
        CourseHelpers.phaseEnd(course.distance, phase),
      );

      return regions
        .rmap((r) => course.straights.map((s) => r.intersect(s)))
        .rmap((r) => r.intersect(phaseBounds));
    },
    filterNeq: notSupported,
    filterLt: notSupported,
    filterLte: notSupported,
    filterGt: notSupported,
    filterGte: notSupported,
  },
  popularity: noopImmediate,
  post_number: (function () {
    function gateBlock(runner: Runner) {
      const gateNumber = runner.gate; // modulo result guaranteed to be uniformly distributed due to the properties of runner.gateRoll

      if (gateNumber < 9) return gateNumber;

      return 1 + ((24 - gateNumber) % 8);
    }

    return immediate({
      filterEq({ regions, arg: post }: ConditionFilterParams) {
        return [regions, (runner: Runner) => gateBlock(runner) == post] as [
          RegionList,
          DynamicCondition,
        ];
      },
      filterLte({ regions, arg: post }: ConditionFilterParams) {
        return [regions, (runner: Runner) => gateBlock(runner) <= post] as [
          RegionList,
          DynamicCondition,
        ];
      },
      filterGte({ regions, arg: post }: ConditionFilterParams) {
        return [regions, (runner: Runner) => gateBlock(runner) >= post] as [
          RegionList,
          DynamicCondition,
        ];
      },
    });
  })(),
  random_lot: immediate({
    filterEq({ regions, arg: lot }: ConditionFilterParams) {
      return [regions, (runner: Runner) => runner.randomLot < lot] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  remain_distance: immediate({
    filterEq({ regions, arg: remain, course }: ConditionFilterParams) {
      const bounds = new Region(course.distance - remain, course.distance - remain + 1);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte({ regions, arg: remain, course }: ConditionFilterParams) {
      const bounds = new Region(course.distance - remain, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGte({ regions, arg: remain, course }: ConditionFilterParams) {
      const bounds = new Region(0, course.distance - remain);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  rotation: valueFilter(({ course }) => course.turn),
  running_style: immediate({
    filterEq({ regions, arg: strategy, runner }: ConditionFilterParams) {
      StrategyHelpers.assertIsStrategy(strategy);

      if (StrategyHelpers.strategyMatches(runner.strategy, strategy)) {
        return regions;
      }

      return new RegionList();
    },
  }),
  running_style_count_same: valueFilterOrNoop(({ runner, extra }) => {
    if (!extra.strategyCounts) {
      return undefined;
    }

    return extra.strategyCounts.get(runner.strategy) ?? 0;
  }),
  running_style_count_same_rate: valueFilterOrNoop(({ runner, extra }) => {
    if (!extra.strategyCounts || !extra.numUmas) {
      return undefined;
    }

    const sameStyleCount = extra.strategyCounts.get(runner.strategy) ?? 0;
    return sameStyleCount / extra.numUmas;
  }),
  // these are used exclusively on debuffs, in which case they only get added to /us/ from the "other" perspective, in which case
  // we actually want them to active if /our/ strategy matches the condition
  // NB. this seems kind of questionable in general. perhaps a perspective member should be added to RaceParameters.
  // also, abusing valueFilter like this only works because these conditions are used like running_style_count_nige_otherself>=1
  running_style_count_nige_otherself: valueFilter(
    ({ runner }) => +StrategyHelpers.strategyMatches(runner.strategy, Strategy.FrontRunner),
  ),
  running_style_count_senko_otherself: valueFilter(
    ({ runner }) => +StrategyHelpers.strategyMatches(runner.strategy, Strategy.PaceChaser),
  ),
  running_style_count_sashi_otherself: valueFilter(
    ({ runner }) => +StrategyHelpers.strategyMatches(runner.strategy, Strategy.LateSurger),
  ),
  running_style_count_oikomi_otherself: valueFilter(
    ({ runner }) => +StrategyHelpers.strategyMatches(runner.strategy, Strategy.EndCloser),
  ),
  running_style_equal_popularity_one: dynamicOrStatic(
    noopImmediate,
    'running_style_equal_popularity_one',
  ),
  running_style_temptation_count_nige: dynamicOrStatic(
    noopSectionRandom(2, 9),
    'running_style_temptation_count_nige',
  ),
  running_style_temptation_count_senko: dynamicOrStatic(
    noopSectionRandom(2, 9),
    'running_style_temptation_count_senko',
  ),
  running_style_temptation_count_sashi: dynamicOrStatic(
    noopSectionRandom(2, 9),
    'running_style_temptation_count_sashi',
  ),
  running_style_temptation_count_oikomi: dynamicOrStatic(
    noopSectionRandom(2, 9),
    'running_style_temptation_count_oikomi',
  ),
  same_skill_horse_count: valueFilterOrNoop(({ extra }) => {
    if (!extra.commonSkills) {
      return undefined;
    }

    const skillId = extra.skillId;
    if (typeof skillId !== 'string') {
      return 0;
    }

    return extra.commonSkills.get(skillId) ?? 0;
  }),
  season: valueFilter(({ extra }) => extra.season),
  slope: immediate({
    filterEq({ regions, arg: slopeType, course }: ConditionFilterParams) {
      if (slopeType !== 0 && slopeType !== 1 && slopeType !== 2) {
        throw new Error('slopeType must be 0, 1, or 2');
      }

      // Requires course.slopes is sorted by slope start— this is not always the case, since in course_data.json they are
      // (sometimes?) sorted first by uphill/downhill and then by start. They should be sorted when the course is loaded.
      if (!CourseHelpers.isSortedByStart(course.slopes)) {
        throw new Error('course slopes must be sorted by slope start');
      }

      let lastEnd = 0;
      const slopes = course.slopes.filter(
        (s) => (slopeType != 2 && s.slope > 0) || (slopeType != 1 && s.slope < 0),
      );
      const slopeR =
        slopeType == 0
          ? slopes.map((s) => {
              const r = new Region(lastEnd, s.start);
              lastEnd = s.start + s.length;
              return r;
            })
          : slopes.map((s) => new Region(s.start, s.start + s.length));
      if (slopeType == 0 && lastEnd != course.distance) {
        slopeR.push(new Region(lastEnd, course.distance));
      }
      return regions.rmap((r) => slopeR.map((s) => r.intersect(s)));
    },
  }),
  straight_front_type: immediate({
    filterEq({ regions, arg: frontType, course }: ConditionFilterParams) {
      if (!(frontType == 1 || frontType == 2)) {
        throw new Error('frontType must be 1 or 2');
      }

      const straights = course.straights.filter((s) => s.frontType == frontType);
      return regions.rmap((r) => straights.map((s) => r.intersect(s)));
    },
  }),
  straight_random: {
    samplePolicy: StraightRandomPolicy,
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be straight_random==1');
      }
      return regions.rmap((r) => course.straights.map((s) => r.intersect(s)));
    },
    filterNeq: notSupported,
    filterLt: notSupported,
    filterLte: notSupported,
    filterGt: notSupported,
    filterGte: notSupported,
  },
  temptation_count: dynamicOrStatic(noopImmediate, 'temptation_count'),
  temptation_count_behind: dynamicOrStatic(noopSectionRandom(2, 9), 'temptation_count_behind'),
  temptation_count_infront: dynamicOrStatic(noopSectionRandom(2, 9), 'temptation_count_infront'),
  time: valueFilter(({ extra }) => extra.timeOfDay),
  track_id: valueFilter(({ course }) => course.raceTrackId),
  up_slope_random: random({
    filterEq({ regions, arg: one, course }: ConditionFilterParams) {
      if (one !== 1) {
        throw new Error('must be up_slope_random==1');
      }
      const slopes = course.slopes
        .filter((s) => s.slope > 0)
        .map((s) => new Region(s.start, s.start + s.length));
      return regions.rmap((r) => slopes.map((s) => r.intersect(s)));
    },
  }),
  visiblehorse: dynamicOrStatic(noopImmediate, 'visiblehorse'),
  weather: valueFilter(({ extra }) => extra.weather),

  is_exist_chara_id: noopImmediate,
  remain_distance_viewer_id: noopImmediate,
};
