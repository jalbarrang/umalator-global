import { parseSkillCondition, tokenizedConditions } from './conditions';
import type { UmaAltId } from '@/modules/runners/utils';
import { SkillRarity } from '@/lib/sunday-tools/skills/definitions';
import { getSkills, skillCollection, SkillsMap } from '@/modules/data/skills';

// ===== Utils =====

import { treeMatch } from '@/lib/sunday-tools/skills/parser/ConditionMatcher';

// Types

// Methods

export const getBaseSkillId = (id: string): string => {
  const [skillId] = id.split('-');

  if (!skillId) {
    throw new Error(`Invalid skill ID: ${id}`);
  }

  return skillId;
};

export const getSkillNameById = (id: string): string => {
  const baseId = getBaseSkillId(id);
  const skill = skillCollection[baseId];
  if (skill?.name) {
    return skill.name;
  }

  // Master data doesn't always include inherited aliases. Resolve those from their original unique.
  if (baseId.startsWith('9')) {
    const originalId = `1${baseId.slice(1)}`;
    const originalSkill = skillCollection[originalId];
    if (originalSkill?.name) {
      return `${originalSkill.name} (inherited)`;
    }
  }

  throw new Error(`Skill name not found for ID: ${id}`);
};

export function getUniqueSkillForByUmaId(outfitId: UmaAltId): string {
  const umaId = +outfitId.slice(1, -2);
  const altId = +outfitId.slice(-2);

  const skillId = (100000 + 10000 * (altId - 1) + umaId * 10 + 1).toString();

  return skillId;
}

/**
 * Skills that are never acquired through training, so we don't need to test them.
 */
const nonMeasurableSkills = ['300051', '300061'];

export const getBaseSkillsToTest = () => {
  const skillIds = Object.keys(skillCollection);
  const skillsToTest = [];

  for (const id of skillIds) {
    if (nonMeasurableSkills.includes(id)) continue;

    const skillData = skillCollection[id];

    if (!skillData) continue;

    const firstAlternative = skillData.alternatives[0];
    if (!firstAlternative) continue;

    // Only test skills that are not unique or evolved and have a condition
    if (skillData.rarity < 3 && firstAlternative.condition !== '') {
      skillsToTest.push(id);
    }
  }

  return skillsToTest;
};

export const getSelectableSkillsForUma = (umaId: UmaAltId) => {
  const ids: Array<string> = [];

  // White, Gold, Upgraded Unique (2* Umas), Unique (3* Umas)
  const allowedRarities = [1, 2, 4, 5];

  for (const skill of getSkills()) {
    if (!allowedRarities.includes(skill.rarity)) continue;

    if (
      ![1, 2].includes(skill.rarity) &&
      skill.character?.length === 1 &&
      skill.character?.includes(parseInt(umaId))
    )
      continue;

    if (skill.gene_version?.id) {
      ids.push(`${skill.gene_version.id}`);
      continue;
    }

    ids.push(`${skill.id}`);
  }

  return ids;
};

export const matchRarity = (skillId: string, rarityB: string) => {
  const skill = skillCollection[skillId];
  if (!skill) return false;

  const rarity = skill.rarity;

  switch (rarityB) {
    case 'white':
      return rarity === SkillRarity.White && !skillId.startsWith('9');
    case 'gold':
      return rarity === SkillRarity.Gold;
    case 'pink':
      return rarity === SkillRarity.Evolution;
    case 'unique':
      return rarity > SkillRarity.Gold && rarity < SkillRarity.Evolution;
    case 'inherit':
      return skillId.startsWith('9');
    default:
      return true;
  }
};

export const conditionFilterMap = {
  nige: [parseSkillCondition('running_style==1')],
  senkou: [parseSkillCondition('running_style==2')],
  sasi: [parseSkillCondition('running_style==3')],
  oikomi: [parseSkillCondition('running_style==4')],
  short: [parseSkillCondition('distance_type==1')],
  mile: [parseSkillCondition('distance_type==2')],
  medium: [parseSkillCondition('distance_type==3')],
  long: [parseSkillCondition('distance_type==4')],
  turf: [parseSkillCondition('ground_type==1')],
  dirt: [parseSkillCondition('ground_type==2')],
  phase0: [
    parseSkillCondition('phase==0'),
    parseSkillCondition('phase_random==0'),
    parseSkillCondition('phase_firsthalf_random==0'),
    parseSkillCondition('phase_laterhalf_random==0'),
  ],
  phase1: [
    parseSkillCondition('phase==1'),
    parseSkillCondition('phase>=1'),
    parseSkillCondition('phase_random==1'),
    parseSkillCondition('phase_firsthalf_random==1'),
    parseSkillCondition('phase_laterhalf_random==1'),
  ],
  phase2: [
    parseSkillCondition('phase==2'),
    parseSkillCondition('phase>=2'),
    parseSkillCondition('phase_random==2'),
    parseSkillCondition('phase_firsthalf_random==2'),
    parseSkillCondition('phase_laterhalf_random==2'),
    parseSkillCondition('phase_firstquarter_random==2'),
    parseSkillCondition('is_lastspurt==1'),
  ],
  phase3: [
    parseSkillCondition('phase==3'),
    parseSkillCondition('phase_random==3'),
    parseSkillCondition('phase_firsthalf_random==3'),
    parseSkillCondition('phase_laterhalf_random==3'),
  ],
  finalcorner: [
    parseSkillCondition('is_finalcorner==1'),
    parseSkillCondition('is_finalcorner_laterhalf==1'),
    parseSkillCondition('is_finalcorner_random==1'),
  ],
  finalstraight: [
    parseSkillCondition('is_last_straight==1'),
    parseSkillCondition('is_last_straight_onetime==1'),
  ],
};

export const generateSkillFilterLookUp = (skillsToMatch: SkillsMap) => {
  const filterLookup: Record<string, Set<string>> = {};
  const filterMapEntries = Object.entries(conditionFilterMap);

  for (const [filterKey, ops] of filterMapEntries) {
    filterLookup[filterKey] = new Set();

    for (const id of Object.keys(skillsToMatch)) {
      const conditions = tokenizedConditions[id];
      if (!conditions) continue;

      const matches = ops.some((op) => conditions.some((alt) => treeMatch(op, alt)));

      if (matches) {
        filterLookup[filterKey].add(id);
      }
    }
  }

  return filterLookup;
};

export let skillFilterLookUp: Record<string, Set<string>> = {};

/**
 * Estimate skill activation phase from skill condition
 * Returns phase number (0-3) or null if undeterminable
 *
 * Phase boundaries per race mechanics:
 * - Phase 0 (Early-race): Sections 1-4 (0% to ~16.7% of course)
 * - Phase 1 (Mid-race): Sections 5-16 (~16.7% to ~66.7% of course)
 * - Phase 2 (Late-race): Sections 17-20 (~66.7% to ~83.3% of course)
 * - Phase 3 (Last Spurt): Sections 21-24 (~83.3% to 100%)
 */
export function estimateSkillActivationPhase(skillId: string): number | null {
  const data = skillCollection[skillId];
  if (!data?.alternatives?.[0]?.condition) return null;

  const condition = data.alternatives[0].condition;

  // Check for phase conditions in order of specificity
  // phase==X is most specific
  const phaseMatch = condition.match(/phase==(\d)/);
  if (phaseMatch?.[1]) {
    return parseInt(phaseMatch[1], 10);
  }

  // phase>=X means X or later
  const phaseGteMatch = condition.match(/phase>=(\d)/);
  if (phaseGteMatch?.[1]) {
    return parseInt(phaseGteMatch[1], 10);
  }

  // phase_random==X
  const phaseRandomMatch = condition.match(/phase_random==(\d)/);
  if (phaseRandomMatch?.[1]) {
    return parseInt(phaseRandomMatch[1], 10);
  }

  // is_lastspurt==1 means phase 2 or 3, estimate as phase 2
  if (condition.includes('is_lastspurt==1')) {
    return 2;
  }

  // is_finalcorner or is_last_straight typically means late race
  if (condition.includes('is_finalcorner') || condition.includes('is_last_straight')) {
    return 2;
  }

  return null;
}

export const getGeneVersionSkillId = (skillId: string): string => {
  const baseSkillId = getBaseSkillId(skillId);
  const skill = skillCollection[baseSkillId];
  if (!skill) return skillId;

  const geneVersionId = skill.gene_version?.id;

  if (!geneVersionId) return skillId;

  return `${geneVersionId}`;
};

export const getUmaForUniqueSkill = (skillId: string): string => {
  const baseSkillId = getBaseSkillId(skillId);
  const skill = skillCollection[baseSkillId];
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const outfitId = skill.character?.[0];
  if (!outfitId) {
    throw new Error(`Uma ID not found for skill: ${skillId}`);
  }

  return outfitId.toString();
};
