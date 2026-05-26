import gameToraSupportCardsJson from '@/modules/data/json/gametora/support-cards.json';
import { collectReleasedSupportCardIds } from '@/modules/data/loaders/global-cutover';
import type { SkillsMap } from '@/modules/data/services/SkillService';
import type {
  SupportCardSkillEntry,
  SupportCardsMap
} from '@/modules/data/services/SupportCardService';
import { loadedSkills } from './skill-loader';
import {
  attachSupportCardEventSources,
  attachSupportCardHintSources
} from './attach-support-sources';
import { loadChainEventSkillIds, loadRandomEventSkillIds } from './chain-event-skills-loader';

type SupportCardSnapshot = {
  support_id: number;
  char_id: number;
  char_name?: string | null;
  type?: string | null;
  rarity: number;
  title_en?: string | null;
  title_ja?: string | null;
  hints?: {
    hint_skills?: Array<number>;
  } | null;
  event_skills?: Array<number> | null;
};

const supportCardTypeMap: Record<string, number> = {
  speed: 1,
  stamina: 2,
  power: 3,
  guts: 4,
  intelligence: 5,
  friend: 6,
  group: 7
};

function resolveSupportCardType(type: string | null | undefined): number {
  if (!type) {
    return 0;
  }

  return supportCardTypeMap[type] ?? 0;
}

function toSupportCardSkillEntry(skillId: number, skills: SkillsMap): SupportCardSkillEntry {
  const skillEntry = skills[String(skillId)];

  return {
    id: skillId,
    name: skillEntry?.name ?? `Unknown Skill (${skillId})`,
    rarity: skillEntry?.rarity ?? 0
  };
}

export function loadSupportCards(
  skills: SkillsMap,
  supportCards: Array<SupportCardSnapshot> = gameToraSupportCardsJson as Array<SupportCardSnapshot>,
  releasedCardIds: Set<string> = collectReleasedSupportCardIds(),
  chainEventSkillIds: Map<number, Set<number>> = loadChainEventSkillIds(),
  randomEventSkillIds: Map<number, Set<number>> = loadRandomEventSkillIds()
): SupportCardsMap {
  const supportCardMap: SupportCardsMap = {};

  for (const supportCard of supportCards) {
    const cardId = String(supportCard.support_id);

    const chainSkillIds = chainEventSkillIds.get(supportCard.support_id);
    const randomSkillIds = randomEventSkillIds.get(supportCard.support_id);

    const chainEventSkills = chainSkillIds
      ? Array.from(chainSkillIds).map((skillId) => toSupportCardSkillEntry(skillId, skills))
      : [];

    const randomEventSkills = randomSkillIds
      ? Array.from(randomSkillIds).map((skillId) => toSupportCardSkillEntry(skillId, skills))
      : [];

    supportCardMap[cardId] = {
      id: supportCard.support_id,
      name: supportCard.title_en || supportCard.title_ja || '',
      charaId: supportCard.char_id,
      charaName: supportCard.char_name ?? '',
      rarity: supportCard.rarity,
      supportCardType: resolveSupportCardType(supportCard.type),
      released: releasedCardIds.has(cardId),
      hintSkills: (supportCard.hints?.hint_skills ?? []).map((skillId) =>
        toSupportCardSkillEntry(skillId, skills)
      ),
      eventSkills: [...chainEventSkills, ...randomEventSkills],
      chainEventSkills,
      randomEventSkills
    };
  }

  return supportCardMap;
}

export const loadedSupportCards = loadSupportCards(loadedSkills.skills);
attachSupportCardHintSources(loadedSkills.skills, loadedSupportCards);
attachSupportCardEventSources(loadedSkills.skills, loadedSupportCards);
