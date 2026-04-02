import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_COURSE_ID } from '@/utils/constants';
import { createRaceConditions, racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { createRunnerState, runawaySkillId } from '../runners/components/runner-card/types';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';
import { runAdaptiveOptimization } from './optimization-engine';
import type { CandidateSkill } from './types';

const { runSkillCombinationComparisonMock } = vi.hoisted(() => ({
  runSkillCombinationComparisonMock: vi.fn(),
}));

vi.mock('./simulator', () => ({
  runSkillCombinationComparison: runSkillCombinationComparisonMock,
}));

describe('runAdaptiveOptimization', () => {
  it('uses reduced planner sampling profile and forwards stamina mode', () => {
    runSkillCombinationComparisonMock.mockImplementation(
      ({ candidateSkills }: { candidateSkills: Array<string> }) => ({
        results: [candidateSkills.length],
        min: candidateSkills.length,
        max: candidateSkills.length,
        mean: candidateSkills.length,
        median: candidateSkills.length,
      }),
    );

    const candidate: CandidateSkill = {
      skillId: runawaySkillId,
      cost: 170,
      netCost: 100,
      hintLevel: 0,
      isStackable: false,
      isGold: false,
    };

    runAdaptiveOptimization({
      candidates: [candidate],
      obtainedSkills: [],
      budget: 100,
      ignoreStaminaConsumption: false,
      runner: createRunnerState(),
      course: CourseHelpers.getCourse(DEFAULT_COURSE_ID),
      racedef: racedefToParams(createRaceConditions()),
      options: defaultSimulationOptions,
    });

    expect(runSkillCombinationComparisonMock).toHaveBeenCalledTimes(5);
    expect(runSkillCombinationComparisonMock.mock.calls.map((call) => call[0].nsamples)).toEqual([
      15, 15, 35, 35, 120,
    ]);
    expect(
      runSkillCombinationComparisonMock.mock.calls.every(
        (call) => call[0].ignoreStaminaConsumption === false,
      ),
    ).toBe(true);
  });
});
