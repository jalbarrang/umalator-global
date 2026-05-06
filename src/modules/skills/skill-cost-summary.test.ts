import { describe, expect, it } from 'vitest';
import { dataRegistry } from '@/modules/data/registry';
import { calculateSkillCost } from '@/modules/skill-planner/cost-calculator';
import { getRepresentativePrerequisiteIds } from '@/modules/skill-planner/skill-family';
import { buildDedupedSkillListNetTotal, buildSkillCostSummary } from './skill-cost-summary';

type TestMeta = {
  hintLevel: number;
  bought?: boolean;
};

const findSkillId = (predicate: (skillId: string) => boolean, label: string): string => {
  const skillId = dataRegistry.skills.getAll().find(skill => predicate(skill.id))?.id;
  if (!skillId) {
    throw new Error(`Could not find ${label}`);
  }

  return skillId;
};

const findSkillIdByName = (name: string): string => {
  const skill = dataRegistry.skills.getAll().find(s => s.name === name);
  if (!skill) {
    throw new Error(`Could not find skill named "${name}"`);
  }
  return skill.id;
};

const plainSkillId = findSkillId(
  (skillId) => {
    const skill = dataRegistry.skills.getById(skillId);
    return getRepresentativePrerequisiteIds(skillId).length === 0 && (skill?.rarity ?? 0) < 3;
  },
  'a plain non-bundled skill',
);

const bundledSkillId = findSkillId(
  (skillId) => getRepresentativePrerequisiteIds(skillId).length > 1,
  'a skill with bundled representative prerequisites',
);

const fractionalDiscountSkillId = findSkillId((skillId) => {
  const skill = dataRegistry.skills.getById(skillId);
  if ((skill?.rarity ?? 0) >= 3) {
    return false;
  }

  const summary = buildSkillCostSummary({
    skillId,
    hasFastLearner: true,
    getSkillMeta: (targetSkillId) => {
      if (targetSkillId === skillId) {
        return { hintLevel: 1 };
      }

      return { hintLevel: 0 };
    },
  });

  return (
    summary.baseTotal > 0 &&
    Number(summary.exactDiscountPct.toFixed(1)) !== Math.round(summary.exactDiscountPct)
  );
}, 'a skill with fractional aggregate discount percent');

const uniqueSkillId = findSkillId((skillId) => {
  const skill = dataRegistry.skills.getById(skillId);
  const rarity = skill?.rarity ?? 0;
  return rarity >= 3 && rarity <= 5;
}, 'a unique skill');

const findPlainSkillIdByBaseCost = (baseCost: number, excludedSkillIds: Array<string> = []) => {
  return findSkillId(
    (skillId) => {
      const skill = dataRegistry.skills.getById(skillId);
      return !excludedSkillIds.includes(skillId) &&
        (skill?.baseCost ?? 0) === baseCost &&
        (skill?.rarity ?? 0) < 3 &&
        getRepresentativePrerequisiteIds(skillId).length === 0;
    },
    `a plain non-bundled skill with base cost ${baseCost}`,
  );
};

const createGetSkillMeta = (metaById: Record<string, TestMeta>) => {
  return (skillId: string): TestMeta => {
    return metaById[skillId] ?? { hintLevel: 0 };
  };
};

describe('buildSkillCostSummary', () => {
  it('handles a plain skill with hint-only discount', () => {
    const summary = buildSkillCostSummary({
      skillId: plainSkillId,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({ [plainSkillId]: { hintLevel: 3 } }),
    });

    const expectedNet = calculateSkillCost(plainSkillId, 3, false);
    const expectedBase = dataRegistry.skills.getById(plainSkillId)?.baseCost ?? 0;

    expect(summary.baseTotal).toBe(expectedBase);
    expect(summary.netTotal).toBe(expectedNet);
    expect(summary.isObtained).toBe(false);
    expect(summary.exactDiscountPct).toBe(((expectedBase - expectedNet) / expectedBase) * 100);
    expect(summary.roundedDiscountPct).toBe(Math.round(summary.exactDiscountPct));
  });

  it('computes prerequisite-bundled totals and excludes bought prerequisites', () => {
    const prereqIds = getRepresentativePrerequisiteIds(bundledSkillId);
    const boughtPrereqId = prereqIds[0];
    const unpaidPrereqId = prereqIds[1];

    const meta: Record<string, TestMeta> = {
      [bundledSkillId]: { hintLevel: 2 },
      [boughtPrereqId]: { hintLevel: 5, bought: true },
      [unpaidPrereqId]: { hintLevel: 1, bought: false },
    };

    const summary = buildSkillCostSummary({
      skillId: `${bundledSkillId}-suffix`,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta(meta),
    });

    const expectedBase =
      (dataRegistry.skills.getById(bundledSkillId)?.baseCost ?? 0) + (dataRegistry.skills.getById(unpaidPrereqId)?.baseCost ?? 0);
    const expectedNet =
      calculateSkillCost(bundledSkillId, 2, false) + calculateSkillCost(unpaidPrereqId, 1, false);

    expect(summary.baseTotal).toBe(expectedBase);
    expect(summary.netTotal).toBe(expectedNet);
    expect(summary.isObtained).toBe(false);
  });

  it('treats covered prerequisite tiers as already owned in aggregate totals', () => {
    const concentrationId = findSkillIdByName('Concentration');
    const focusId = findSkillIdByName('Focus');

    const summary = buildSkillCostSummary({
      skillId: concentrationId,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({
        [concentrationId]: { hintLevel: 0 },
        [focusId]: { hintLevel: 0, bought: true },
      }),
    });

    expect(summary.baseTotal).toBe(dataRegistry.skills.getById(concentrationId)?.baseCost ?? 0);
    expect(summary.netTotal).toBe(dataRegistry.skills.getById(concentrationId)?.baseCost ?? 0);
    expect(summary.isObtained).toBe(false);
  });

  it('stacks Fast Learner with hint discounts', () => {
    const withFastLearner = buildSkillCostSummary({
      skillId: plainSkillId,
      hasFastLearner: true,
      getSkillMeta: createGetSkillMeta({ [plainSkillId]: { hintLevel: 5 } }),
    });

    const withoutFastLearner = buildSkillCostSummary({
      skillId: plainSkillId,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({ [plainSkillId]: { hintLevel: 5 } }),
    });

    expect(withFastLearner.netTotal).toBe(calculateSkillCost(plainSkillId, 5, true));
    expect(withFastLearner.netTotal).toBeLessThan(withoutFastLearner.netTotal);
  });

  it('returns 0 net total for bought skills', () => {
    const summary = buildSkillCostSummary({
      skillId: bundledSkillId,
      hasFastLearner: true,
      getSkillMeta: createGetSkillMeta({
        [bundledSkillId]: { hintLevel: 0, bought: true },
      }),
    });

    expect(summary.isObtained).toBe(true);
    expect(summary.netTotal).toBe(0);
  });

  it('prefers instance-level self meta for suffixed skill ids', () => {
    const summary = buildSkillCostSummary({
      skillId: `${plainSkillId}-instance`,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({
        [`${plainSkillId}-instance`]: { hintLevel: 3 },
        [plainSkillId]: { hintLevel: 0 },
      }),
    });

    expect(summary.netTotal).toBe(calculateSkillCost(plainSkillId, 3, false));
  });

  it('uses exact percent for popover and rounded percent for row display', () => {
    const summary = buildSkillCostSummary({
      skillId: fractionalDiscountSkillId,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({ [fractionalDiscountSkillId]: { hintLevel: 1 } }),
    });

    const expectedExact =
      summary.baseTotal > 0
        ? ((summary.baseTotal - summary.netTotal) / summary.baseTotal) * 100
        : 0;

    expect(summary.exactDiscountPct).toBe(expectedExact);
    expect(summary.roundedDiscountPct).toBe(Math.round(expectedExact));
    expect(Number(summary.exactDiscountPct.toFixed(1))).not.toBe(summary.roundedDiscountPct);
  });

  it('deduplicates covered prerequisite costs across visible rows', () => {
    const prereqIds = getRepresentativePrerequisiteIds(bundledSkillId);
    const sharedPrereqId = prereqIds[0];

    const metaById: Record<string, TestMeta> = {
      [bundledSkillId]: { hintLevel: 2 },
      [sharedPrereqId]: { hintLevel: 1 },
    };

    for (const prereqId of prereqIds.slice(1)) {
      metaById[prereqId] = { hintLevel: 0, bought: true };
    }

    const total = buildDedupedSkillListNetTotal({
      visibleSkillIds: [bundledSkillId, sharedPrereqId],
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta(metaById),
    });

    const expectedTotal =
      calculateSkillCost(bundledSkillId, 2, false) + calculateSkillCost(sharedPrereqId, 1, false);

    expect(total).toBe(expectedTotal);
  });

  it('rounds deduped aggregate totals after summing raw discounted costs', () => {
    const firstSkillId = findPlainSkillIdByBaseCost(170);
    const secondSkillId = findPlainSkillIdByBaseCost(170, [firstSkillId]);

    const total = buildDedupedSkillListNetTotal({
      visibleSkillIds: [firstSkillId, secondSkillId],
      hasFastLearner: true,
      getSkillMeta: createGetSkillMeta({
        [firstSkillId]: { hintLevel: 2 },
        [secondSkillId]: { hintLevel: 3 },
      }),
    });

    // 170 * 0.8 * 0.9 + 170 * 0.7 * 0.9 = 229.5, ceil once => 230.
    // Rounding each skill first would incorrectly return 231.
    expect(total).toBe(230);
  });

  it('rounds bundled aggregate totals after summing raw discounted costs', () => {
    const speedStarId = '200581';
    const preparedToPassId = '200582';

    const summary = buildSkillCostSummary({
      skillId: speedStarId,
      hasFastLearner: false,
      getSkillMeta: createGetSkillMeta({
        [speedStarId]: { hintLevel: 3 },
        [preparedToPassId]: { hintLevel: 2 },
      }),
    });

    expect(summary.baseTotal).toBe(360);
    expect(summary.netTotal).toBe(270);
  });

  it('excludes unique skills from list totals by default', () => {
    const lookedUpSkillIds = new Set<string>();
    const getSkillMeta = (skillId: string): TestMeta => {
      lookedUpSkillIds.add(skillId);

      if (skillId === plainSkillId) {
        return { hintLevel: 1 };
      }

      if (skillId === uniqueSkillId) {
        return { hintLevel: 5 };
      }

      return { hintLevel: 0 };
    };

    const totalWithoutUnique = buildDedupedSkillListNetTotal({
      visibleSkillIds: [plainSkillId, uniqueSkillId],
      hasFastLearner: false,
      getSkillMeta,
    });

    expect(totalWithoutUnique).toBe(calculateSkillCost(plainSkillId, 1, false));
    expect(lookedUpSkillIds.has(uniqueSkillId)).toBe(false);

    lookedUpSkillIds.clear();

    buildDedupedSkillListNetTotal({
      visibleSkillIds: [plainSkillId, uniqueSkillId],
      hasFastLearner: false,
      includeUniqueSkills: true,
      getSkillMeta,
    });

    expect(lookedUpSkillIds.has(uniqueSkillId)).toBe(true);
  });
});
