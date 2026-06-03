import type {
  SkillEntry,
  SkillSupportCardSourceEntry,
  SkillsMap
} from '@/modules/data/services/SkillService';
import type { SupportCardsMap } from '@/modules/data/services/SupportCardService';

function compareSupportSources(
  a: SkillSupportCardSourceEntry,
  b: SkillSupportCardSourceEntry
): number {
  return b.rarity - a.rarity || a.supportCardId - b.supportCardId;
}

function sortSupportSources(sources: Array<SkillSupportCardSourceEntry>): void {
  sources.sort(compareSupportSources);
}

function sourceKey(source: SkillSupportCardSourceEntry): string {
  return `${source.supportCardId}:${source.sourceType ?? 'hint'}`;
}

function upsertSupportSource(skill: SkillEntry, source: SkillSupportCardSourceEntry): void {
  const sources = skill.supportSources ?? [];
  const existingIndex = sources.findIndex((entry) => sourceKey(entry) === sourceKey(source));

  if (existingIndex >= 0) {
    sources[existingIndex] = source;
  } else {
    sources.push(source);
  }

  sortSupportSources(sources);
  skill.supportSources = sources;
}

function attachSupportCardSourcesByType(
  skills: SkillsMap,
  supportCards: SupportCardsMap,
  sourceType: 'hint' | 'event' | 'chain-event' | 'random-event',
  getSkillIds: (card: SupportCardsMap[string]) => Array<{ id: number }>
): void {
  for (const card of Object.values(supportCards)) {
    for (const skillRef of getSkillIds(card)) {
      const skill = skills[String(skillRef.id)];
      if (!skill) {
        continue;
      }

      upsertSupportSource(skill, {
        supportCardId: card.id,
        charaId: card.charaId,
        rarity: card.rarity,
        supportCardType: card.supportCardType,
        name: card.name,
        sourceType
      });
    }
  }
}

/**
 * Merges support-card hint skills from GameTora into each skill's `supportSources`.
 */
export function attachSupportCardHintSources(
  skills: SkillsMap,
  supportCards: SupportCardsMap
): void {
  attachSupportCardSourcesByType(skills, supportCards, 'hint', (card) => card.hintSkills);
}

/**
 * Merges support-card event skill rewards from GameTora into each skill's `supportSources`.
 */
export function attachSupportCardEventSources(
  skills: SkillsMap,
  supportCards: SupportCardsMap
): void {
  attachSupportCardSourcesByType(skills, supportCards, 'event', (card) => card.eventSkills);
  attachSupportCardSourcesByType(
    skills,
    supportCards,
    'chain-event',
    (card) => card.chainEventSkills
  );
  attachSupportCardSourcesByType(
    skills,
    supportCards,
    'random-event',
    (card) => card.randomEventSkills
  );
}

/**
 * Attaches both hint and event support-card sources onto skills.
 */
export function attachSupportCardSources(skills: SkillsMap, supportCards: SupportCardsMap): void {
  attachSupportCardHintSources(skills, supportCards);
  attachSupportCardEventSources(skills, supportCards);
}
