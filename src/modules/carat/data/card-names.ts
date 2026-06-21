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
