import type { UmaAltId } from '@/modules/runners/utils';
import { SkillRarity } from '@/lib/uma-domain/skills/definitions';
import { skillsService } from '@/modules/data/services/SkillService';

// Methods

const getBaseSkillId = (id: string): string => {
  const [skillId] = id.split('-');

  if (!skillId) {
    throw new Error(`Invalid skill ID: ${id}`);
  }

  return skillId;
};

export const getSkillNameById = (id: string): string => {
  const baseId = getBaseSkillId(id);
  const skill = skillsService.getById(baseId);
  if (skill?.name) {
    return skill.name;
  }

  // Master data doesn't always include inherited aliases. Resolve those from their original unique.
  if (baseId.startsWith('9')) {
    const originalId = `1${baseId.slice(1)}`;
    const originalSkill = skillsService.getById(originalId);
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
const nonMeasurableSkills = new Set(['300051', '300061']);

export const getBaseSkillsToTest = () => {
  const skillIds = skillsService.getAll().map((skill) => skill.id);
  const skillsToTest = [];

  for (const id of skillIds) {
    if (nonMeasurableSkills.has(id)) continue;

    const skillData = skillsService.getById(id);

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

export const getSelectableSkillsForUma = (umaId: UmaAltId, includeUpcoming = false) => {
  const ids: Array<string> = [];

  // White, Gold, Upgraded Unique (2* Umas), Unique (3* Umas)
  const allowedRarities = new Set([1, 2, 4, 5]);

  for (const skill of skillsService.getAll()) {
    if (!allowedRarities.has(skill.rarity)) continue;
    if (!includeUpcoming && !skillsService.isReleased(skill.id)) continue;

    // Inherited uniques (9xxxxx) are added via the gene_version redirect
    // on their parent unique skill — skip them to avoid duplicates.
    if (skill.id.startsWith('9')) continue;

    const character = skill.character;

    const onlyAvailableInOneUma =
      character.length === 1 && character.includes(Number.parseInt(umaId));
    const isUnique = skill.rarity === SkillRarity.Unique;

    // Filter
    if (onlyAvailableInOneUma && isUnique) {
      continue;
    }

    if (skill.gene_version?.id) {
      const geneVersionId = `${skill.gene_version.id}`;
      if (!includeUpcoming && !skillsService.isReleased(geneVersionId)) continue;
      ids.push(geneVersionId);
      continue;
    }

    ids.push(skill.id);
  }

  return ids;
};

export const matchRarity = (skillId: string, rarityB: string) => {
  const skill = skillsService.getById(skillId);
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
function estimateSkillActivationPhase(skillId: string): number | null {
  const data = skillsService.getById(skillId);
  if (!data?.alternatives?.[0]?.condition) return null;

  const condition = data.alternatives[0].condition;

  // Check for phase conditions in order of specificity
  // phase==X is most specific
  const phaseMatch = condition.match(/phase==(\d)/);
  if (phaseMatch?.[1]) {
    return Number.parseInt(phaseMatch[1], 10);
  }

  // phase>=X means X or later
  const phaseGteMatch = condition.match(/phase>=(\d)/);
  if (phaseGteMatch?.[1]) {
    return Number.parseInt(phaseGteMatch[1], 10);
  }

  // phase_random==X
  const phaseRandomMatch = condition.match(/phase_random==(\d)/);
  if (phaseRandomMatch?.[1]) {
    return Number.parseInt(phaseRandomMatch[1], 10);
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
  const skill = skillsService.getById(baseSkillId);
  if (!skill) return skillId;

  const geneVersionId = skill.gene_version?.id;

  if (!geneVersionId) return skillId;

  return `${geneVersionId}`;
};

export const getUmaForUniqueSkill = (skillId: string): string => {
  const baseSkillId = getBaseSkillId(skillId);
  const skill = skillsService.getById(baseSkillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const outfitId = skill.character?.[0];
  if (!outfitId) {
    throw new Error(`Uma ID not found for skill: ${skillId}`);
  }

  return outfitId.toString();
};
