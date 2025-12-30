import { parseSkillCondition, tokenizedConditions } from './conditions';
import type { ISkillRarity } from '@/modules/simulation/lib/skills/definitions';
import type { SkillAlternative } from '@/modules/simulation/lib/core/RaceSolverBuilder';
import type { ISkill } from './types';
import type { UmaAltId } from '@/modules/runners/utils';
import skillsDataList from '@/modules/data/skill_data.json';
import skillMetaList from '@/modules/data/skill_meta.json';
import skillNamesList from '@/modules/data/skillnames.json';
import GametoraSkills from '@/modules/data/gametora/skills.json';

import { treeMatch } from '@/modules/simulation/lib/skills/parser/ConditionMatcher';
import { SkillRarity } from '@/modules/simulation/lib/skills/definitions';

// Types

export type SkillNamesList = Record<string, Array<string>>;
export type TranslatedSkillNames = Record<string, string>;

export type SkillData = {
  alternatives: Array<SkillAlternative>;
  rarity: ISkillRarity;
};

export type SkillMeta = {
  groupId: string;
  iconId: string;
  baseCost: number;
  order: number;
};

export type SkillId = keyof typeof skillsDataList;

export type Skill = {
  id: string; // The ID of the skill, e.g. "100011-1"
  name: string; // The name of the skill, e.g. "Corner Adept"
  originalId: string; // The original ID of the skill, e.g. "100011"
  meta: SkillMeta;
  data: SkillData;
};

// Methods

export const getBaseSkillId = (id: string): string => {
  const [skillId] = id.split('-');

  if (!skillId) {
    throw new Error(`Invalid skill ID: ${id}`);
  }

  return skillId;
};

export const getSkillDataById = (id: string): SkillData => {
  const baseId = getBaseSkillId(id);

  const skillData = skillsDataList[baseId as SkillId];

  if (!skillData) {
    throw new Error(`Skill data not found for ID: ${id}`);
  }

  return skillData as SkillData;
};

export const getSkillMetaById = (id: string): SkillMeta => {
  const baseId = getBaseSkillId(id);

  const skillMeta = skillMetaList[baseId as SkillId];

  if (!skillMeta) {
    throw new Error(`Skill meta not found for ID: ${id}`);
  }

  return skillMeta as unknown as SkillMeta;
};

export const getSkillNameById = (id: string): string => {
  const baseId = getBaseSkillId(id);

  const [skillName] = skillNamesList[baseId as SkillId];

  if (!skillName) {
    throw new Error(`Skill names not found for ID: ${id}`);
  }

  return skillName;
};

export function getUniqueSkillForByUmaId(outfitId: UmaAltId): string {
  const umaId = +outfitId.slice(1, -2);
  const altId = +outfitId.slice(-2);

  const skillId = (100000 + 10000 * (altId - 1) + umaId * 10 + 1).toString();

  return skillId;
}

export function skillComparator(a: string, b: string) {
  const x = getSkillMetaById(a).order;
  const y = getSkillMetaById(b).order;

  return +(y < x) - +(x < y) || +(b < a) - +(a < b);
}

export function sortSkills(skills: Array<string>): Array<string> {
  return skills.toSorted(skillComparator);
}

export function SkillSet(iterable: Array<string>): Set<string> {
  return new Set<string>(sortSkills(iterable));
}

export const getBaseSkillsToTest = () => {
  return Object.keys(skillsDataList).filter((id) => skillsDataList[id as SkillId]?.rarity < 3);
};

export const translateSkillNamesForLang = (lang: 'en' | 'ja'): TranslatedSkillNames => {
  return Object.entries(skillNamesList).reduce((acc, [key, value]) => {
    const translatedValue = value[lang === 'en' ? 0 : 1];

    if (translatedValue) {
      acc[key] = translatedValue;
    }

    return acc;
  }, {} as TranslatedSkillNames);
};

export const getAllSkills = (): Array<Skill> => {
  return Object.keys(skillsDataList).map((id) => ({
    id,
    originalId: getBaseSkillId(id),
    name: getSkillNameById(id),
    meta: getSkillMetaById(id),
    data: getSkillDataById(id),
  }));
};

export const allSkills = getAllSkills();
export const skillsById: Map<string, Skill> = new Map();

export const getRunnerSkills = (skillIds: Array<string>): Array<Skill> => {
  return allSkills.filter((skill) => skillIds.includes(skill.originalId));
};

export const nonUniqueSkills: Array<Skill> = [];
export const nonUniqueSkillIds: Array<string> = [];

export const getSelectableSkillsForUma = (umaId: UmaAltId) => {
  const ids: Array<string> = [];

  // White, Gold, Upgraded Unique (2* Umas), Unique (3* Umas)
  const allowedRarities = [1, 2, 4, 5];

  for (const skill of GametoraSkills as Array<ISkill>) {
    if (!allowedRarities.includes(skill.rarity)) continue;
    if (
      ![1, 2].includes(skill.rarity) &&
      skill.char?.length === 1 &&
      skill.char?.includes(parseInt(umaId))
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
  const skillData = getSkillDataById(skillId);
  if (!skillData) return false;

  const rarity = skillData.rarity;

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

const generateSkillFilterLookUp = () => {
  const filterLookup: Record<string, Set<string>> = {};
  const filterMapEntries = Object.entries(conditionFilterMap);

  for (const [filterKey, ops] of filterMapEntries) {
    filterLookup[filterKey] = new Set();

    for (const skill of allSkills) {
      const conditions = tokenizedConditions[skill.id];
      if (!conditions) continue;

      const matches = ops.some((op) => conditions.some((alt) => treeMatch(op, alt)));

      if (matches) {
        filterLookup[filterKey].add(skill.id);
      }
    }
  }

  return filterLookup;
};

export const skillFilterLookUp = generateSkillFilterLookUp();

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
  const data = getSkillDataById(skillId);
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
  const skill: ISkill = GametoraSkills.find((s) => s.id === parseInt(baseSkillId));
  if (!skill) return skillId;

  const geneVersionId = skill.gene_version?.id;

  if (!geneVersionId) return skillId;

  return `${geneVersionId}`;
};

export const getUmaForUniqueSkill = (skillId: string): string => {
  const baseSkillId = getBaseSkillId(skillId);
  const skill: ISkill = GametoraSkills.find((s) => s.id === parseInt(baseSkillId));
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const outfitId = skill.char?.[0];
  if (!outfitId) {
    throw new Error(`Uma ID not found for skill: ${skillId}`);
  }

  return outfitId.toString();
};

export const uniqueSkillIds: Array<string> = [];

// Setup every value for module variables
for (const skill of allSkills) {
  skillsById.set(skill.id, skill);

  const isNotUniqueSkill = skill.data.rarity < SkillRarity.Unique;
  const isEvolvedSkill = skill.data.rarity === SkillRarity.Evolution;

  if (isNotUniqueSkill || isEvolvedSkill) {
    nonUniqueSkills.push(skill);
    nonUniqueSkillIds.push(skill.id);
  }

  if (skill.data.rarity >= 4 && skill.id.startsWith('1')) {
    uniqueSkillIds.push(skill.id);
  }
}
