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

const MS_PER_DAY = 86_400_000;

/**
 * Compute the JP→Global lag in days from character cards that have both dates.
 * Returns the median offset, or a sensible fallback.
 */
function computeJpToGlobalLagDays(characterCards: Array<CharacterCard>): number {
  const diffs: Array<number> = [];

  for (const card of characterCards) {
    if (card.release && card.release_en) {
      const jp = new Date(card.release).getTime();
      const en = new Date(card.release_en).getTime();
      diffs.push(Math.round((en - jp) / MS_PER_DAY));
    }
  }

  if (diffs.length === 0) return 1550; // ~4.2 years fallback

  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type SkillDateSource = {
  dateEn?: string;
  dateJp?: string;
};

function buildSkillDateSources(
  characterCards: Array<CharacterCard>,
  supportCards: Array<SupportCard>
): Map<string, SkillDateSource> {
  const sources = new Map<string, SkillDateSource>();

  function track(skillId: number, dateEn?: string, dateJp?: string) {
    const id = String(skillId);
    const existing = sources.get(id) ?? {};

    if (dateEn && (!existing.dateEn || dateEn < existing.dateEn)) {
      existing.dateEn = dateEn;
    }

    if (dateJp && (!existing.dateJp || dateJp < existing.dateJp)) {
      existing.dateJp = dateJp;
    }

    sources.set(id, existing);
  }

  // Character cards
  for (const card of characterCards) {
    const dateEn = card.release_en;
    const dateJp = card.release;

    for (const id of card.skills_unique ?? []) track(id, dateEn, dateJp);
    for (const id of card.skills_awakening ?? []) track(id, dateEn, dateJp);
    for (const id of card.skills_innate ?? []) track(id, dateEn, dateJp);

    for (const evo of card.skills_evo ?? []) {
      track(evo.new, dateEn, dateJp);
      track(evo.old, dateEn, dateJp);
    }

    for (const id of card.skills_event ?? []) track(id, dateEn, dateJp);
  }

  // Support cards
  for (const card of supportCards) {
    const dateEn = card.release_en;
    const dateJp = card.release;

    for (const id of card.hints?.hint_skills ?? []) track(id, dateEn, dateJp);
    for (const id of card.event_skills ?? []) track(id, dateEn, dateJp);
  }

  return sources;
}

/**
 * Attach release dates to skill entries.
 *
 * - Released skills (in master.mdb): already have `releaseDate` from extraction.
 *   If not, fall back to the earliest `release_en` from character/support cards.
 * - Upcoming skills (GameTora only): use JP release date + JP→Global lag offset,
 *   so they sort after all released skills while maintaining relative JP order.
 */
export function attachReleaseDates(
  skills: SkillsMap,
  characterCards: Array<CharacterCard>,
  supportCards: Array<SupportCard>
): void {
  const dateSources = buildSkillDateSources(characterCards, supportCards);
  const lagDays = computeJpToGlobalLagDays(characterCards);

  for (const [skillId, entry] of Object.entries(skills)) {
    // Already has a date from master.mdb extraction
    if (entry.releaseDate) continue;

    const source = dateSources.get(skillId);
    if (!source) continue;

    if (source.dateEn) {
      // Global date available from character/support card
      entry.releaseDate = source.dateEn;
    } else if (source.dateJp) {
      // Upcoming: pad JP date forward by the JP→Global lag
      entry.releaseDate = addDays(source.dateJp, lagDays);
    }
  }
}
