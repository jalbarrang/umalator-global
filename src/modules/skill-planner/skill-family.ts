import { skillCollection } from '@/modules/data/skills';
import { getBaseTier, getGoldVersion, getUpgradeTier, getWhiteVersion } from '@/modules/skills/skill-relationships';

function queueIfValid(skillIds: Set<string>, queue: Array<string>, skillId?: string) {
  if (!skillId || skillIds.has(skillId) || !skillCollection[skillId]) {
    return;
  }

  queue.push(skillId);
}

export function getRepresentativePrerequisiteIds(skillId: string): Array<string> {
  const skill = skillCollection[skillId];
  if (!skill) return [];

  if (skill.rarity === 2) {
    const whiteVersionId = getWhiteVersion(skillId);
    if (!whiteVersionId) return [];

    const baseTierId = getBaseTier(whiteVersionId);
    const upgradeTierId = getUpgradeTier(baseTierId);

    return Array.from(
      new Set([baseTierId, upgradeTierId].filter((id): id is string => Boolean(id && id !== skillId))),
    );
  }

  const baseTierId = getBaseTier(skillId);
  const upgradeTierId = getUpgradeTier(baseTierId);
  if (upgradeTierId && skillId === upgradeTierId && baseTierId && baseTierId !== skillId) {
    return [baseTierId];
  }

  return [];
}

export function getRelatedSkillIds(skillId: string): Array<string> {
  const related = new Set<string>();
  const queue = [skillId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || related.has(currentId) || !skillCollection[currentId]) {
      continue;
    }

    related.add(currentId);

    const currentSkill = skillCollection[currentId];
    for (const versionId of currentSkill.versions.map(String)) {
      queueIfValid(related, queue, versionId);
    }

    queueIfValid(related, queue, getGoldVersion(currentId));
    queueIfValid(related, queue, getWhiteVersion(currentId));

    const baseTierId = getBaseTier(currentId);
    const upgradeTierId = getUpgradeTier(baseTierId);
    queueIfValid(related, queue, baseTierId);
    queueIfValid(related, queue, upgradeTierId);
  }

  return Array.from(related);
}
