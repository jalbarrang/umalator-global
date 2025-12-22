/**
 * Phase conditions are used to activate skills if the runner is in a specific phase of the race.
 */

import { immediate, notSupported, random } from '../helpers';
import { ImmediatePolicy } from '../policies/ImmediatePolicy';
import { StraightRandomPolicy } from '../policies/StraightRandomPolicy';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type {
  CourseData,
  IPhase,
  RaceParameters,
  RaceState,
} from '@/modules/simulation/lib/core/types';
import type { DynamicCondition } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { Region } from '@/modules/simulation/lib/utils/Region';

export const PhaseConditions = {
  phase: {
    samplePolicy: ImmediatePolicy,
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      extra: RaceParameters,
    ) {
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
    filterLt(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      if (phase <= 0) {
        throw new Error('phase == 0');
      }
      const bounds = new Region(0, CourseHelpers.phaseStart(course.distance, phase));
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const bounds = new Region(0, CourseHelpers.phaseEnd(course.distance, phase));
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGt(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
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
    filterGte(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const bounds = new Region(CourseHelpers.phaseStart(course.distance, phase), course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  },
  phase_corner_random: random({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
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
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 2);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firsthalf_random: random({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 2);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firstquarter: immediate({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 4);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_firstquarter_random: random({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region(start, start + (end - start) / 4);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_laterhalf_random: random({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsPhase(phase);
      const start = CourseHelpers.phaseStart(course.distance, phase);
      const end = CourseHelpers.phaseEnd(course.distance, phase);
      const bounds = new Region((start + end) / 2, end);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  phase_random: random({
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
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
    filterEq(
      regions: RegionList,
      phase: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
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
  is_lastspurt: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_lastspurt==1');
      }

      const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
      return [regions.rmap((r) => r.intersect(bounds)), (s: RaceState) => s.isLastSpurt] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  lastspurt: immediate({
    filterEq(
      regions: RegionList,
      case_: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      // NB. not entirely sure these are correct, based on some vague remarks made by kuromi once
      let f;
      switch (case_) {
        case 1:
          f = (s: RaceState) => s.isLastSpurt && s.lastSpurtTransition != -1;
          break;
        case 2:
          f = (s: RaceState) => s.isLastSpurt && s.lastSpurtTransition == -1;
          break;
        case 3:
          f = (s: RaceState) => !s.isLastSpurt;
          break;
        default:
          throw new Error('lastspurt case must be 1-3');
      }
      const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
      return [regions.rmap((r) => r.intersect(bounds)), f] as [RegionList, DynamicCondition];
    },
  }),
};
