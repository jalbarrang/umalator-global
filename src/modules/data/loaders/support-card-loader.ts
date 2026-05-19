import gameToraSupportCardsJson from '@/modules/data/json/gametora/support-cards.json';
import { loadSkills } from '@/modules/data/loaders/skill-loader';
import type { SkillsMap } from '@/modules/data/services/SkillService';
import type {
  SupportCardSkillEntry,
  SupportCardsMap
} from '@/modules/data/services/SupportCardService';

type SupportCardSnapshot = {
  support_id: number;
  char_id: number;
  char_name?: string | null;
  type?: string | null;
  rarity: number;
  title_en?: string | null;
  title_ja?: string | null;
  release_en?: string | null;
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

let cachedSkills: SkillsMap | null = null;

function getDefaultSkills(): SkillsMap {
  if (cachedSkills) {
    return cachedSkills;
  }

  cachedSkills = loadSkills().skills;
  return cachedSkills;
}

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
  skills: SkillsMap = getDefaultSkills(),
  supportCards: Array<SupportCardSnapshot> = gameToraSupportCardsJson as Array<SupportCardSnapshot>
): SupportCardsMap {
  const supportCardMap: SupportCardsMap = {};

  for (const supportCard of supportCards) {
    const cardId = String(supportCard.support_id);

    supportCardMap[cardId] = {
      id: supportCard.support_id,
      name: supportCard.title_en || supportCard.title_ja || '',
      charaId: supportCard.char_id,
      charaName: supportCard.char_name ?? '',
      rarity: supportCard.rarity,
      supportCardType: resolveSupportCardType(supportCard.type),
      released: !!supportCard.release_en,
      hintSkills: (supportCard.hints?.hint_skills ?? []).map((skillId) =>
        toSupportCardSkillEntry(skillId, skills)
      ),
      eventSkills: (supportCard.event_skills ?? []).map((skillId) =>
        toSupportCardSkillEntry(skillId, skills)
      )
    };
  }

  return supportCardMap;
}
