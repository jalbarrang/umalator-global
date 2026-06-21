import characterCards from '@/modules/data/json/gametora/character-cards.json';
import type { TimelineEvent } from './timeline-types';

type CharacterCardRecord = {
  card_id: number;
  char_id: number;
  name_en: string;
  rarity: number;
};

export type CharacterCardName = Pick<CharacterCardRecord, 'name_en' | 'char_id' | 'rarity'>;

export const characterCardNameMap = new Map<number, CharacterCardName>(
  (characterCards as CharacterCardRecord[]).map((card) => [
    card.card_id,
    {
      name_en: card.name_en,
      char_id: card.char_id,
      rarity: card.rarity
    }
  ])
);

// Counts the rate-up (pickup) 3-star Umas on a banner, used to split the
// 3% total 3-star rate between the rate-up pool and the off-banner pool.
export function characterPickupCount(event: TimelineEvent): number {
  const count = (event.pickup_card_ids ?? []).filter(
    (cardId) => characterCardNameMap.get(cardId)?.rarity === 3
  ).length;
  return Math.max(1, count);
}

export function resolveBannerLabel(event: TimelineEvent): string {
  if (event.title) return event.title;

  if (event.related_characters?.length) {
    return event.related_characters.join(' / ');
  }

  const pickupNames = event.pickup_card_ids
    ?.map((cardId) => characterCardNameMap.get(cardId)?.name_en)
    .filter(Boolean);

  if (pickupNames?.length) {
    return pickupNames.join(' / ');
  }

  return 'Upcoming banner';
}
