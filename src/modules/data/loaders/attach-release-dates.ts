import characterCardsJson from '@/modules/data/json/gametora/character-cards.json';
import supportCardsJson from '@/modules/data/json/gametora/support-cards.json';
import type { SkillsMap } from '@/modules/data/services/SkillService';

type CharacterCard = {
  release?: string;
  release_en?: string;
  skills_unique?: Array<number>;
  skills_awakening?: Array<number>;
  skills_innate?: Array<number>;
  skills_evo?: Array<{ new: number; old: number }>;
  skills_event?: Array<number>;
};

type SupportCard = {
  release?: string;
  release_en?: string;
  hints?: { hint_skills?: Array<number> };
  event_skills?: Array<number>;
};

function buildSkillReleaseDateMap(): Map<string, string> {
  const skillDates = new Map<string, string>();

  function trackEarliest(skillId: number, date: string) {
    const id = String(skillId);
    const existing = skillDates.get(id);

    if (!existing || date < existing) {
      skillDates.set(id, date);
    }
  }

  // Character cards — only use global (EN) release dates
  for (const card of characterCardsJson as Array<CharacterCard>) {
    const date = card.release_en;
    if (!date) continue;

    for (const id of card.skills_unique ?? []) trackEarliest(id, date);
    for (const id of card.skills_awakening ?? []) trackEarliest(id, date);
    for (const id of card.skills_innate ?? []) trackEarliest(id, date);

    for (const evo of card.skills_evo ?? []) {
      trackEarliest(evo.new, date);
      trackEarliest(evo.old, date);
    }

    for (const id of card.skills_event ?? []) trackEarliest(id, date);
  }

  // Support cards — only use global (EN) release dates
  for (const card of supportCardsJson as Array<SupportCard>) {
    const date = card.release_en;
    if (!date) continue;

    for (const id of card.hints?.hint_skills ?? []) trackEarliest(id, date);
    for (const id of card.event_skills ?? []) trackEarliest(id, date);
  }

  return skillDates;
}

/**
 * Attach release dates to skill entries by cross-referencing character card
 * and support card release dates. Uses the earliest date a skill appeared
 * across all sources.
 */
export function attachReleaseDates(skills: SkillsMap): void {
  const dateMap = buildSkillReleaseDateMap();

  for (const [skillId, entry] of Object.entries(skills)) {
    const date = dateMap.get(skillId);

    if (date) {
      entry.releaseDate = date;
    }
  }
}
