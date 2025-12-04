import skillsDataList from '@data/skill_data.json';
import skillMetaList from '@data/skill_meta.json';
import skillNamesList from '@data/skillnames.json';
import GametoraSkills from '@data/gametora/skills.json';

import { UmaAltId } from '@/modules/runners/utils';
import { strict as assert } from 'assert';
import { parseSkillCondition, tokenizedConditions } from './conditions';
import { ISkill } from './types';
import { SkillRarity } from '@simulation/lib/RaceSolver';
import { treeMatch } from '@simulation/lib/tools/ConditionMatcher';

// Types

export type SkillNamesList = Record<string, string[]>;
export type TranslatedSkillNames = Record<string, string>;

export type SkillData = {
  alternatives: [
    {
      baseDuration: number;
      condition: string;
      effects: [
        {
          modifier: number;
          target: number;
          type: number;
        },
        {
          modifier: number;
          target: number;
          type: number;
        },
      ];
      precondition: string;
    },
  ];
  rarity: number;
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

export const getBaseSkillId = (id: string) => id.split('-')[0];

export const getSkillDataById = (id: string): SkillData | null =>
  skillsDataList[getBaseSkillId(id)] ?? null;

export const getSkillMetaById = (id: string): SkillMeta | null =>
  skillMetaList[getBaseSkillId(id)] ?? null;

export const getSkillNameById = (id: string): string[] =>
  skillNamesList[getBaseSkillId(id)] ?? [];

export const getUniqueSkills = () => {
  return Object.keys(skillsDataList).filter((id) => {
    const skill = skillsDataList[id];
    return skill.rarity >= 4 && id.startsWith('1');
  });
};

export function assertIsSkill(sid: string): asserts sid is SkillId {
  assert(skillsDataList[sid] !== null);
}

export function getUniqueSkillForByUmaId(outfitId: UmaAltId): SkillId {
  const umaId = +outfitId.slice(1, -2);
  const altId = +outfitId.slice(-2);

  const skillId = (100000 + 10000 * (altId - 1) + umaId * 10 + 1).toString();

  assertIsSkill(skillId);

  return skillId;
}

export function skillComparator(a: string, b: string) {
  const x = getSkillMetaById(a).order;
  const y = getSkillMetaById(b).order;

  return +(y < x) - +(x < y) || +(b < a) - +(a < b);
}

export function sortSkills(skills: string[]): string[] {
  return skills.toSorted(skillComparator);
}

export function SkillSet(iterable: string[]): Set<string> {
  return new Set<string>(sortSkills(iterable));
}

export const getBaseSkillsToTest = () => {
  return Object.keys(skillsDataList).filter(
    (id) => skillsDataList[id].rarity < 3,
  );
};

export const translateSkillNamesForLang = (
  lang: 'en' | 'ja',
): TranslatedSkillNames => {
  return Object.entries(skillNamesList).reduce((acc, [key, value]) => {
    const translatedValue = value[lang === 'en' ? 0 : 1];

    if (translatedValue) {
      acc[key] = translatedValue;
    }

    return acc;
  }, {});
};

export const getAllSkills = (): Skill[] => {
  return Object.keys(skillsDataList).map((id) => ({
    id,
    originalId: getBaseSkillId(id),
    name: getSkillNameById(id)[0],
    meta: getSkillMetaById(id),
    data: getSkillDataById(id),
  }));
};

export const allSkills = getAllSkills();
export const skillsById = new Map();

export const getRunnerSkills = (skillIds: string[]): Skill[] => {
  return allSkills.filter((skill) => skillIds.includes(skill.originalId));
};

export const nonUniqueSkills: Skill[] = [];
export const nonUniqueSkillIds: string[] = [];

export const getSelectableSkillsForUma = (umaId: UmaAltId) => {
  const ids: string[] = [];

  // White, Gold, Upgraded Unique (2* Umas), Unique (3* Umas)
  const allowedRarities = [1, 2, 4, 5];

  for (const skill of GametoraSkills as ISkill[]) {
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
  return Object.entries(conditionFilterMap).reduce(
    (acc, [filterKey, ops]) => {
      acc[filterKey] = new Set();

      getAllSkills().forEach((skill) => {
        const conditions = tokenizedConditions[skill.id];
        if (!conditions) return;

        const matches = ops.some((op) =>
          conditions.some((alt) => treeMatch(op, alt)),
        );

        if (matches) {
          acc[filterKey].add(skill.id);
        }
      });

      return acc;
    },
    {} as Record<string, Set<string>>,
  );
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
  if (phaseMatch) {
    return parseInt(phaseMatch[1], 10);
  }

  // phase>=X means X or later
  const phaseGteMatch = condition.match(/phase>=(\d)/);
  if (phaseGteMatch) {
    return parseInt(phaseGteMatch[1], 10);
  }

  // phase_random==X
  const phaseRandomMatch = condition.match(/phase_random==(\d)/);
  if (phaseRandomMatch) {
    return parseInt(phaseRandomMatch[1], 10);
  }

  // is_lastspurt==1 means phase 2 or 3, estimate as phase 2
  if (condition.includes('is_lastspurt==1')) {
    return 2;
  }

  // is_finalcorner or is_last_straight typically means late race
  if (
    condition.includes('is_finalcorner') ||
    condition.includes('is_last_straight')
  ) {
    return 2;
  }

  return null;
}

// Setup every value for module variables
for (const skill of allSkills) {
  skillsById.set(skill.id, skill);

  const isNotUniqueSkill = skill.data.rarity < SkillRarity.Unique;
  const isEvolvedSkill = skill.data.rarity === SkillRarity.Evolution;

  if (isNotUniqueSkill || isEvolvedSkill) {
    nonUniqueSkills.push(skill);
    nonUniqueSkillIds.push(skill.id);
  }
}
