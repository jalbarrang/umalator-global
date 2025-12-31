/**
 * Unit tests for cost calculator
 */

import { describe, expect, it, mock } from 'bun:test';
import { HINT_DISCOUNTS, calculateSkillCost, getBaseCost } from '../cost-calculator';

// Mock getSkillMetaById
const mockGetSkillMetaById = mock((skillId: string) => {
  const costs: Record<string, number> = {
    '200011': 110,
    '200012': 90,
    '200013': 50,
    '10071': 0, // Free skill (unique/inheritance)
    '200331': 180,
  };
  return {
    groupId: 1,
    iconId: '20013',
    baseCost: costs[skillId] ?? 100,
    order: 10,
  };
});

mock.module('@/modules/skills/utils', () => ({
  getSkillMetaById: mockGetSkillMetaById,
}));

describe('Cost Calculator', () => {
  describe('HINT_DISCOUNTS constant', () => {
    it('should have correct discount percentages', () => {
      expect(HINT_DISCOUNTS[0]).toBe(0);
      expect(HINT_DISCOUNTS[1]).toBe(0.1);
      expect(HINT_DISCOUNTS[2]).toBe(0.2);
      expect(HINT_DISCOUNTS[3]).toBe(0.3);
      expect(HINT_DISCOUNTS[4]).toBe(0.35);
      expect(HINT_DISCOUNTS[5]).toBe(0.4);
    });
  });

  describe('getBaseCost', () => {
    it('should return base cost without any discounts', () => {
      expect(getBaseCost('200011')).toBe(110);
      expect(getBaseCost('200012')).toBe(90);
      expect(getBaseCost('200013')).toBe(50);
    });

    it('should return 0 for free skills', () => {
      expect(getBaseCost('10071')).toBe(0);
    });
  });

  describe('calculateSkillCost', () => {
    describe('no discounts', () => {
      const hasFastLearner = false;

      it('should return base cost with hint level 0', () => {
        expect(calculateSkillCost('200011', 0, hasFastLearner)).toBe(110);
        expect(calculateSkillCost('200012', 0, hasFastLearner)).toBe(90);
        expect(calculateSkillCost('200013', 0, hasFastLearner)).toBe(50);
      });

      it('should return 0 for free skills', () => {
        expect(calculateSkillCost('10071', 0, hasFastLearner)).toBe(0);
      });
    });

    describe('hint level discounts', () => {
      const hasFastLearner = false;

      it('should apply 10% discount for hint level 1', () => {
        // 110 * 0.9 = 99
        expect(calculateSkillCost('200011', 1, hasFastLearner)).toBe(99);
      });

      it('should apply 20% discount for hint level 2', () => {
        // 110 * 0.8 = 88
        expect(calculateSkillCost('200011', 2, hasFastLearner)).toBe(88);
      });

      it('should apply 30% discount for hint level 3', () => {
        // 110 * 0.7 = 77
        expect(calculateSkillCost('200011', 3, hasFastLearner)).toBe(77);
      });

      it('should apply 35% discount for hint level 4', () => {
        // 110 * 0.65 = 71.5 -> floor = 71
        expect(calculateSkillCost('200011', 4, hasFastLearner)).toBe(71);
      });

      it('should apply 40% discount for hint level 5 (max)', () => {
        // 110 * 0.6 = 66
        expect(calculateSkillCost('200011', 5, hasFastLearner)).toBe(66);
      });
    });

    describe('Fast Learner discount', () => {
      const hasFastLearner = true;

      it('should apply 10% Fast Learner discount with no hint', () => {
        // 110 * 0.9 = 99
        expect(calculateSkillCost('200011', 0, hasFastLearner)).toBe(99);
      });

      it('should not affect free skills', () => {
        expect(calculateSkillCost('10071', 0, hasFastLearner)).toBe(0);
      });
    });

    describe('combined discounts', () => {
      const hasFastLearner = true;

      it('should apply both hint level 1 and Fast Learner', () => {
        // 110 * 0.9 (hint) * 0.9 (FL) = 89.1 -> floor = 89
        expect(calculateSkillCost('200011', 1, hasFastLearner)).toBe(89);
      });

      it('should apply both hint level 3 and Fast Learner', () => {
        // 110 * 0.7 (hint) * 0.9 (FL) = 69.3 -> floor = 69
        expect(calculateSkillCost('200011', 3, hasFastLearner)).toBe(69);
      });

      it('should apply maximum discount (hint 5 + FL)', () => {
        // 110 * 0.6 (hint) * 0.9 (FL) = 59.4 -> floor = 59
        expect(calculateSkillCost('200011', 5, hasFastLearner)).toBe(59);
      });

      it('should handle high base cost with max discounts', () => {
        // 180 * 0.6 * 0.9 = 97.2 -> floor = 97
        expect(calculateSkillCost('200331', 5, hasFastLearner)).toBe(97);
      });
    });

    describe('floor rounding behavior', () => {
      const hasFastLearner = true;

      it('should floor fractional costs', () => {
        // 90 * 0.65 (hint 4) * 0.9 (FL) = 52.65 -> floor = 52
        expect(calculateSkillCost('200012', 4, hasFastLearner)).toBe(52);
      });

      it('should handle costs that result in .9', () => {
        // 50 * 0.9 (hint 1) * 0.9 (FL) = 40.5 -> floor = 40
        expect(calculateSkillCost('200013', 1, hasFastLearner)).toBe(40);
      });
    });

    describe('edge cases', () => {
      it('should handle 0 cost with discounts', () => {
        const hasFastLearner = true;
        expect(calculateSkillCost('10071', 5, hasFastLearner)).toBe(0);
      });

      it('should never return negative cost', () => {
        const hasFastLearner = true;
        const cost = calculateSkillCost('200011', 5, hasFastLearner);
        expect(cost).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
