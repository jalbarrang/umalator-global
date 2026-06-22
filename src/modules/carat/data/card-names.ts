import characterCards from '@/modules/data/json/gametora/character-cards.json';
import supportCards from '@/modules/data/json/gametora/support-cards.json';
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

type SupportCardRecord = {
  support_id: number;
  rarity: number;
  char_name: string;
  title_en?: string;
};

const supportCardMap = new Map<number, SupportCardRecord>(
  (supportCards as SupportCardRecord[]).map((card) => [card.support_id, card])
);

// Counts the rate-up (pickup) SSR support cards on a banner. Each rate-up SSR
// keeps its own 0.75% pull rate regardless of count, but the 200-pull spark
// only guarantees one copy of one card, so multi-pickup banners need a caveat.
export function supportPickupCount(event: TimelineEvent): number {
  const count = (event.pickup_card_ids ?? []).filter(
    (cardId) => supportCardMap.get(cardId)?.rarity === 3
  ).length;
  return Math.max(1, count);
}

export type PickupTarget = {
  id: number;
  name: string;
};

// The list of 3-star rate-up cards/Umas a player can set copy goals for,
// preserving banner order. Returns support SSRs for support banners and 3-star
// Umas for character banners.
export function bannerPickupTargets(event: TimelineEvent): PickupTarget[] {
  const ids = event.pickup_card_ids ?? [];

  if (event.card_type === 'character') {
    return ids
      .map((id) => {
        const card = characterCardNameMap.get(id);
        return card?.rarity === 3 ? { id, name: card.name_en } : null;
      })
      .filter((target): target is PickupTarget => target !== null);
  }

  return ids
    .map((id) => {
      const card = supportCardMap.get(id);
      if (card?.rarity !== 3) return null;
      const name = card.title_en ? `${card.title_en} ${card.char_name}` : card.char_name;
      return { id, name };
    })
    .filter((target): target is PickupTarget => target !== null);
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
