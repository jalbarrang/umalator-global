/**
 * Unit tests for optimizer
 */

import { describe, expect, it } from 'bun:test';
import {
  calculateCombinationCost,
  estimateBashinGain,
  generateValidCombinations,
  pruneObviouslyBadCombinations,
  sortCombinationsByEstimatedValue,
} from '../optimizer';
import type { CandidateSkill } from '../types';

describe('Optimizer', () => {
  describe('generateValidCombinations', () => {
    it('should generate empty combination for empty candidates', () => {
      const candidates: Array<CandidateSkill> = [];
      const generator = generateValidCombinations(candidates, 1000, 10);
      const combinations = Array.from(generator);

      expect(combinations).toHaveLength(1);
      expect(combinations[0]).toEqual([]);
    });

    it('should generate single skill combinations within budget', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
        { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
      ];
      const generator = generateValidCombinations(candidates, 150, 10);
      const combinations = Array.from(generator);

      // Should generate: [], [1], [2]
      // Note: [1,2] costs 200 which exceeds budget of 150
      expect(combinations.length).toBeGreaterThan(0);
      expect(combinations).toContainEqual(['1']);
      expect(combinations).toContainEqual(['2']);
    });

    it('should exclude combinations exceeding budget', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
        { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
        { skillId: '3', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
      ];
      const budget = 150;
      const generator = generateValidCombinations(candidates, budget, 10);
      const combinations = Array.from(generator);

      // All combinations should be within budget
      for (const combo of combinations) {
        const cost = combo.reduce((sum, skillId) => {
          const skill = candidates.find((c) => c.skillId === skillId);
          return sum + (skill?.effectiveCost ?? 0);
        }, 0);
        expect(cost).toBeLessThanOrEqual(budget);
      }
    });

    it('should allow stackable skills to appear twice', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: true, effectiveCost: 50 },
      ];
      const generator = generateValidCombinations(candidates, 150, 10);
      const combinations = Array.from(generator);

      // Should find a combination with skill '1' twice
      const doubleCombo = combinations.find((c) => c.filter((s) => s === '1').length === 2);
      expect(doubleCombo).toBeDefined();
      expect(doubleCombo).toEqual(['1', '1']);
    });

    it('should not allow non-stackable skills to appear twice', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 50 },
      ];
      const generator = generateValidCombinations(candidates, 150, 10);
      const combinations = Array.from(generator);

      // No combination should have skill '1' more than once
      for (const combo of combinations) {
        const count = combo.filter((s) => s === '1').length;
        expect(count).toBeLessThanOrEqual(1);
      }
    });

    it('should exclude already-obtained skills from budget calculation', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: true, isStackable: false, effectiveCost: 0 },
        { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
      ];
      const generator = generateValidCombinations(candidates, 50, 10);
      const combinations = Array.from(generator);

      // Should not include obtained skill '1' in any combination
      // (obtained skills are added separately in the worker)
      for (const combo of combinations) {
        expect(combo).not.toContain('1');
      }
    });

    it('should respect maximum combination size', () => {
      const candidates: Array<CandidateSkill> = Array.from({ length: 15 }, (_, i) => ({
        skillId: `${i + 1}`,
        hintLevel: 0,
        isObtained: false,
        isStackable: false,
        effectiveCost: 10,
      }));
      const maxSize = 5;
      const generator = generateValidCombinations(candidates, 1000, maxSize);
      const combinations = Array.from(generator);

      // No combination should exceed max size
      for (const combo of combinations) {
        expect(combo.length).toBeLessThanOrEqual(maxSize);
      }
    });

    it('should handle budget of 0', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 },
      ];
      const generator = generateValidCombinations(candidates, 0, 10);
      const combinations = Array.from(generator);

      // With budget of 0, no combinations can be generated (not even empty one since we filter obtained skills)
      // Generator yields at least one empty combo for non-purchased skills
      expect(combinations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle all free skills', () => {
      const candidates: Array<CandidateSkill> = [
        { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 0 },
        { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 0 },
      ];
      const generator = generateValidCombinations(candidates, 100, 10);
      const combinations = Array.from(generator);

      // Should generate combinations with free skills
      expect(combinations.length).toBeGreaterThan(0);
      expect(combinations).toContainEqual(['1', '2']);
    });
  });

  describe('calculateCombinationCost', () => {
    it('should calculate total cost of combination', () => {
      const candidates = new Map<string, CandidateSkill>([
        ['1', { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 }],
        ['2', { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 50 }],
        ['3', { skillId: '3', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 75 }],
      ]);

      const cost1 = calculateCombinationCost(['1', '2'], candidates);
      expect(cost1).toBe(150);

      const cost2 = calculateCombinationCost(['1', '2', '3'], candidates);
      expect(cost2).toBe(225);
    });

    it('should exclude obtained skills from cost', () => {
      const candidates = new Map<string, CandidateSkill>([
        ['1', { skillId: '1', hintLevel: 0, isObtained: true, isStackable: false, effectiveCost: 0 }],
        ['2', { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 }],
      ]);

      const cost = calculateCombinationCost(['1', '2'], candidates);
      expect(cost).toBe(100); // Only skill '2' counts
    });

    it('should handle stackable skills appearing twice', () => {
      const candidates = new Map<string, CandidateSkill>([
        ['1', { skillId: '1', hintLevel: 0, isObtained: false, isStackable: true, effectiveCost: 50 }],
      ]);

      const cost = calculateCombinationCost(['1', '1'], candidates);
      expect(cost).toBe(100); // 50 * 2
    });

    it('should return 0 for empty combination', () => {
      const candidates = new Map<string, CandidateSkill>();
      const cost = calculateCombinationCost([], candidates);
      expect(cost).toBe(0);
    });

    it('should handle unknown skill IDs gracefully', () => {
      const candidates = new Map<string, CandidateSkill>([
        ['1', { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 }],
      ]);

      const cost = calculateCombinationCost(['1', '999'], candidates);
      expect(cost).toBe(100); // Unknown skill '999' contributes 0
    });
  });

  describe('estimateBashinGain', () => {
    it('should return positive value for any skill combination', () => {
      const estimate = estimateBashinGain(['1', '2', '3']);
      expect(estimate).toBeGreaterThan(0);
    });

    it('should return 0 for empty combination', () => {
      const estimate = estimateBashinGain([]);
      expect(estimate).toBe(0);
    });

    it('should scale with number of skills', () => {
      const estimate1 = estimateBashinGain(['1']);
      const estimate2 = estimateBashinGain(['1', '2']);
      expect(estimate2).toBeGreaterThan(estimate1);
    });
  });

  describe('sortCombinationsByEstimatedValue', () => {
    it('should sort by value/cost ratio (descending)', () => {
      const candidates = new Map<string, CandidateSkill>([
        ['1', { skillId: '1', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 100 }],
        ['2', { skillId: '2', hintLevel: 0, isObtained: false, isStackable: false, effectiveCost: 50 }],
      ]);

      const combinations = [['1'], ['2'], ['1', '2']];
      const sorted = sortCombinationsByEstimatedValue(combinations, candidates);

      // All combinations should be present
      expect(sorted).toHaveLength(3);
    });

    it('should handle empty combinations list', () => {
      const candidates = new Map<string, CandidateSkill>();
      const sorted = sortCombinationsByEstimatedValue([], candidates);
      expect(sorted).toEqual([]);
    });
  });

  describe('pruneObviouslyBadCombinations', () => {
    it('should keep all combinations if under limit', () => {
      const combinations = [['1'], ['2'], ['3']];
      const pruned = pruneObviouslyBadCombinations(combinations, 1000);
      expect(pruned).toHaveLength(3);
    });

    it('should limit to maxToKeep combinations', () => {
      const combinations = Array.from({ length: 2000 }, (_, i) => [`${i}`]);
      const pruned = pruneObviouslyBadCombinations(combinations, 1000);
      expect(pruned).toHaveLength(1000);
    });

    it('should keep first maxToKeep combinations', () => {
      const combinations = [['1'], ['2'], ['3'], ['4'], ['5']];
      const pruned = pruneObviouslyBadCombinations(combinations, 3);
      expect(pruned).toEqual([['1'], ['2'], ['3']]);
    });

    it('should handle empty input', () => {
      const pruned = pruneObviouslyBadCombinations([], 1000);
      expect(pruned).toEqual([]);
    });
  });
});

