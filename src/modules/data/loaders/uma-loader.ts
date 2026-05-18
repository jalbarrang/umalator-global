import characterCardsJson from '@/modules/data/json/gametora/character-cards.json';
import type { UmasMap } from '@/modules/data/services/UmaService';

type GameToraCharacterCardSnapshot = {
  card_id: number;
  char_id: number;
  name_en?: string | null;
  name_jp?: string | null;
  title_en_gl?: string | null;
  title_jp?: string | null;
  release_en?: string | null;
};

export type LoadGameToraUmasResult = {
  umas: UmasMap;
  releasedOutfits: Set<string>;
};

export function loadGameToraUmas(
  characterCards: Array<GameToraCharacterCardSnapshot> =
    characterCardsJson as Array<GameToraCharacterCardSnapshot>
): LoadGameToraUmasResult {
  const umas: UmasMap = {};
  const releasedOutfits = new Set<string>();

  for (const characterCard of characterCards) {
    const baseUmaId = String(characterCard.char_id);
    const outfitId = String(characterCard.card_id);
    const existingEntry = umas[baseUmaId];

    if (!existingEntry) {
      umas[baseUmaId] = {
        name: [characterCard.name_jp || '', characterCard.name_en || ''],
        outfits: {
          [outfitId]: characterCard.title_en_gl || characterCard.title_jp || ''
        }
      };
    } else {
      if (!existingEntry.name[0] && characterCard.name_jp) {
        existingEntry.name[0] = characterCard.name_jp;
      }

      if (!existingEntry.name[1] && characterCard.name_en) {
        existingEntry.name[1] = characterCard.name_en;
      }

      existingEntry.outfits[outfitId] = characterCard.title_en_gl || characterCard.title_jp || '';
    }

    if (characterCard.release_en) {
      releasedOutfits.add(outfitId);
    }
  }

  return {
    umas,
    releasedOutfits
  };
}
