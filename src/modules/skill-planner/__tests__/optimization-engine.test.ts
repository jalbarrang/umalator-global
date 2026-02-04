/**
 * Tests for optimization engine
 *
 * These tests verify:
 * 1. Combinations are generated correctly
 * 2. The simulator receives correct baseline vs test configurations
 * 3. Results are sorted and returned properly
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { runAdaptiveOptimization } from '../optimization-engine';
import type { CandidateSkill } from '../types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';

// Mock the simulator module
const mockRunSkillCombinationComparison = mock((_params: any) => ({
  results: [1.0],
  min: 1.0,
  max: 1.0,
  mean: 1.0,
  median: 1.0,
}));

mock.module('../simulator', () => ({
  runSkillCombinationComparison: mockRunSkillCombinationComparison,
}));

describe('Optimization Engine', () => {
  beforeEach(() => {
    mockRunSkillCombinationComparison.mockClear();
    mockRunSkillCombinationComparison.mockImplementation(() => ({
      results: [1.0],
      min: 1.0,
      max: 1.0,
      mean: 1.0,
      median: 1.0,
    }));
  });

  it('should pass obtainedSkills as baseRunner.skills, not merged with candidates', () => {
    const obtainedSkills = ['100', '101'];
    const candidateSkills: Array<CandidateSkill> = [
      {
        skillId: '200',
        hintLevel: 0,
        isStackable: false,
        isGold: false,
        effectiveCost: 100,
      },
      {
        skillId: '201',
        hintLevel: 0,
        isStackable: false,
        isGold: false,
        effectiveCost: 150,
      },
    ];

    const mockRunner = {
      skills: [],
    } as unknown as RunnerState;

    try {
      runAdaptiveOptimization({
        candidates: candidateSkills,
        obtainedSkills,
        budget: 1000,
        runner: mockRunner as RunnerState,
        course: {} as any,
        racedef: {} as any,
        options: {} as any,
      });
    } catch {
      // Optimization may fail due to incomplete mocks, but we only care about simulator calls
    }

    // Verify simulator was called
    expect(mockRunSkillCombinationComparison).toHaveBeenCalled();

    // CRITICAL TEST: Verify ALL calls have baseRunner.skills = obtainedSkills only
    const calls = mockRunSkillCombinationComparison.mock.calls as any[];
    for (const call of calls) {
      const params = call[0];
      if (!params) continue;

      const baseSkills = params.baseRunner?.skills || [];
      const testSkills = params.candidateSkills || [];

      // Base should ALWAYS only have obtained skills (not merged with candidates)
      expect(baseSkills).toEqual(obtainedSkills);

      // Candidate skills should not be in base
      for (const candidateSkill of testSkills) {
        expect(baseSkills).not.toContain(candidateSkill);
      }
    }

    // Verify at least one call tests a non-empty combination
    const nonEmptyCombinations = calls.filter((call: any) => call[0]?.candidateSkills?.length > 0);
    expect(nonEmptyCombinations.length).toBeGreaterThan(0);
  });

  it('should generate baseline, individual, pair, and triple combinations', () => {
    const candidateSkills: Array<CandidateSkill> = [
      { skillId: '200', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 100 },
      { skillId: '201', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 150 },
      { skillId: '202', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 200 },
    ];

    try {
      runAdaptiveOptimization({
        candidates: candidateSkills,
        obtainedSkills: [],
        budget: 1000,
        runner: {} as RunnerState,
        course: {} as any,
        racedef: {} as any,
        options: {} as any,
      });
    } catch {
      // May fail due to incomplete mocks
    }

    const calls = mockRunSkillCombinationComparison.mock.calls as any[];
    const testedCombinations = calls.map((call) => call[0]?.candidateSkills || []);

    // Should test baseline (empty array)
    expect(testedCombinations.some((combo: any[]) => combo.length === 0)).toBe(true);

    // Should test individual skills
    expect(testedCombinations.some((combo: any[]) => combo.length === 1)).toBe(true);

    // Should test pairs
    expect(testedCombinations.some((combo: any[]) => combo.length === 2)).toBe(true);

    // Should test triples
    expect(testedCombinations.some((combo: any[]) => combo.length === 3)).toBe(true);
  });

  it('should respect budget constraints', () => {
    const candidateSkills: Array<CandidateSkill> = [
      { skillId: '200', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 400 },
      { skillId: '201', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 400 },
      { skillId: '202', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 400 },
    ];

    try {
      runAdaptiveOptimization({
        candidates: candidateSkills,
        obtainedSkills: [],
        budget: 500, // Only enough for 1 skill
        runner: {} as RunnerState,
        course: {} as any,
        racedef: {} as any,
        options: {} as any,
      });
    } catch {
      // May fail due to incomplete mocks
    }

    const calls = mockRunSkillCombinationComparison.mock.calls as any[];
    const testedCombinations = calls.map((call) => call[0]?.candidateSkills || []);

    // Should NOT test any combinations that exceed budget
    for (const combo of testedCombinations) {
      const totalCost = combo.reduce((sum: number, skillId: string) => {
        const skill = candidateSkills.find((c) => c.skillId === skillId);
        return sum + (skill?.effectiveCost ?? 0);
      }, 0);

      expect(totalCost).toBeLessThanOrEqual(500);
    }

    // Should NOT test pairs or triples (they'd exceed budget)
    const hasOversizedCombos = testedCombinations.some((combo: any[]) => combo.length >= 2);
    expect(hasOversizedCombos).toBe(false);
  });

  it('should return results sorted by bashin gain', () => {
    const candidateSkills: Array<CandidateSkill> = [
      { skillId: '200', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 100 },
      { skillId: '201', hintLevel: 0, isStackable: false, isGold: false, effectiveCost: 100 },
    ];

    // Mock different bashin gains for different combinations
    mockRunSkillCombinationComparison.mockImplementation((params: any) => {
      const combo = params?.candidateSkills || [];
      if (combo.length === 0) {
        return { results: [0], min: 0, max: 0, mean: 0, median: 0 };
      }
      if (combo.includes('200')) {
        return { results: [5.0], min: 5.0, max: 5.0, mean: 5.0, median: 5.0 };
      }
      if (combo.includes('201')) {
        return { results: [3.0], min: 3.0, max: 3.0, mean: 3.0, median: 3.0 };
      }
      return { results: [1.0], min: 1.0, max: 1.0, mean: 1.0, median: 1.0 };
    });

    const result = runAdaptiveOptimization({
      candidates: candidateSkills,
      obtainedSkills: [],
      budget: 1000,
      runner: {} as RunnerState,
      course: {} as any,
      racedef: {} as any,
      options: {} as any,
    });

    // Result should be defined
    expect(result).toBeDefined();

    // allResults should be sorted by bashin (highest first)
    expect(result.allResults).toBeDefined();
    expect(result.allResults.length).toBeGreaterThan(0);

    for (let i = 0; i < result.allResults.length - 1; i++) {
      expect(result.allResults[i].bashin).toBeGreaterThanOrEqual(result.allResults[i + 1].bashin);
    }

    // bashinStats should exist with proper structure
    expect(result.bashinStats).toBeDefined();
    if (result.bashinStats) {
      expect(typeof result.bashinStats.mean).toBe('number');
      expect(typeof result.bashinStats.min).toBe('number');
      expect(typeof result.bashinStats.max).toBe('number');
      expect(typeof result.bashinStats.median).toBe('number');
    }
  });
});
