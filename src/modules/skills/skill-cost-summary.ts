import { skillCollection } from '@/modules/data/skills';
import { calculateSkillCost } from '@/modules/skill-planner/cost-calculator';
import { getRepresentativePrerequisiteIds } from '@/modules/skill-planner/skill-family';
import type { HintLevel } from '@/modules/skill-planner/types';
import { isUniqueSkill } from '@/store/runners.store';

export type SkillSummaryMeta = {
  hintLevel: number;
  bought?: boolean;
};

export type SkillCostSummary = {
  baseTotal: number;
  netTotal: number;
  isObtained: boolean;
  exactDiscountPct: number;
  roundedDiscountPct: number;
};

type BuildSkillCostSummaryOptions = {
  skillId: string;
  hasFastLearner: boolean;
  getSkillMeta: (skillId: string) => SkillSummaryMeta;
};

type BuildDedupedSkillListNetTotalOptions = {
  visibleSkillIds: Array<string>;
  hasFastLearner: boolean;
  getSkillMeta: (skillId: string) => SkillSummaryMeta;
  includeUniqueSkills?: boolean;
};

export const normalizeSkillIdForCostSummary = (skillId: string): string => {
  return skillId.split('-')[0] ?? skillId;
};

const toHintLevel = (value: number | undefined): HintLevel => {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }

  return 0;
};

const hasMeaningfulMeta = (meta: SkillSummaryMeta): boolean => {
  return meta.hintLevel !== 0 || meta.bought !== undefined;
};

const resolveSelfSkillMeta = (
  requestedSkillId: string,
  normalizedSkillId: string,
  getSkillMeta: (skillId: string) => SkillSummaryMeta,
): SkillSummaryMeta => {
  const requestedMeta = getSkillMeta(requestedSkillId);

  if (requestedSkillId === normalizedSkillId || hasMeaningfulMeta(requestedMeta)) {
    return requestedMeta;
  }

  const normalizedMeta = getSkillMeta(normalizedSkillId);

  if (hasMeaningfulMeta(normalizedMeta)) {
    return normalizedMeta;
  }

  return requestedMeta;
};

const upsertCoveredSkill = (
  coveredSkillMetaById: Map<string, SkillSummaryMeta>,
  skillId: string,
  meta: SkillSummaryMeta,
) => {
  const existing = coveredSkillMetaById.get(skillId);

  if (!existing || (!hasMeaningfulMeta(existing) && hasMeaningfulMeta(meta))) {
    coveredSkillMetaById.set(skillId, meta);
  }
};

export const buildSkillCostSummary = ({
  skillId,
  hasFastLearner,
  getSkillMeta,
}: BuildSkillCostSummaryOptions): SkillCostSummary => {
  const normalizedSkillId = normalizeSkillIdForCostSummary(skillId);
  const skill = skillCollection[normalizedSkillId];

  if (!skill) {
    return {
      baseTotal: 0,
      netTotal: 0,
      isObtained: false,
      exactDiscountPct: 0,
      roundedDiscountPct: 0,
    };
  }

  const selfMeta = resolveSelfSkillMeta(skillId, normalizedSkillId, getSkillMeta);
  const isObtained = selfMeta.bought ?? false;

  let baseTotal = skill.baseCost;
  let netTotal = calculateSkillCost(
    normalizedSkillId,
    toHintLevel(selfMeta.hintLevel),
    hasFastLearner,
  );

  const representativePrereqIds = getRepresentativePrerequisiteIds(normalizedSkillId);

  for (const prereqId of representativePrereqIds) {
    const prereq = skillCollection[prereqId];
    if (!prereq) {
      continue;
    }

    const prereqMeta = getSkillMeta(prereqId);
    if (prereqMeta.bought) {
      continue;
    }

    baseTotal += prereq.baseCost;
    netTotal += calculateSkillCost(prereqId, toHintLevel(prereqMeta.hintLevel), hasFastLearner);
  }

  if (isObtained) {
    netTotal = 0;
  }

  const exactDiscountPct =
    baseTotal > 0 ? ((baseTotal - netTotal) / baseTotal) * 100 : 0;

  return {
    baseTotal,
    netTotal,
    isObtained,
    exactDiscountPct,
    roundedDiscountPct: Math.round(exactDiscountPct),
  };
};

export const buildDedupedSkillListNetTotal = ({
  visibleSkillIds,
  hasFastLearner,
  getSkillMeta,
  includeUniqueSkills = false,
}: BuildDedupedSkillListNetTotalOptions): number => {
  const coveredSkillMetaById = new Map<string, SkillSummaryMeta>();

  for (const visibleSkillId of visibleSkillIds) {
    const normalizedSkillId = normalizeSkillIdForCostSummary(visibleSkillId);
    const skill = skillCollection[normalizedSkillId];
    if (!skill) {
      continue;
    }

    if (!includeUniqueSkills && isUniqueSkill(skill.rarity)) {
      continue;
    }

    const selfMeta = resolveSelfSkillMeta(visibleSkillId, normalizedSkillId, getSkillMeta);
    if (selfMeta.bought) {
      continue;
    }

    upsertCoveredSkill(coveredSkillMetaById, normalizedSkillId, selfMeta);

    for (const prereqId of getRepresentativePrerequisiteIds(normalizedSkillId)) {
      const prereq = skillCollection[prereqId];
      if (!prereq) {
        continue;
      }

      const prereqMeta = getSkillMeta(prereqId);
      if (prereqMeta.bought) {
        continue;
      }

      upsertCoveredSkill(coveredSkillMetaById, prereqId, prereqMeta);
    }
  }

  let total = 0;

  for (const [coveredSkillId, coveredMeta] of coveredSkillMetaById.entries()) {
    total += calculateSkillCost(coveredSkillId, toHintLevel(coveredMeta.hintLevel), hasFastLearner);
  }

  return total;
};
