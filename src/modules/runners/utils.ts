import { useMemo, useSyncExternalStore } from 'react';
import icons from '@/modules/data/icons.json';
import {
  getRuntimeUmas,
  subscribeRuntimeMasterDbData,
} from '@/modules/data/runtime-data-context';
import type { UmasMap } from '@/workers/db/storage';

export type UmaData = UmasMap;
export type UmaDataKey = keyof UmaData & string;
export type UmaEntry = UmaData[UmaDataKey];
export type UmaOutfitKey = keyof UmaEntry['outfits'] & string;
export type UmaOutfit = UmaEntry['outfits'][UmaOutfitKey];
export type UmaSearchEntry = {
  id: string;
  name: string;
  outfit: string;
};

export type Uma = {
  name: Array<string>;
  outfits: Record<string, string>;
};

const getUmasData = () => getRuntimeUmas();

function useRuntimeUmas(): UmasMap {
  return useSyncExternalStore(subscribeRuntimeMasterDbData, getRuntimeUmas, getRuntimeUmas);
}

function buildUmaSearchData(umas: UmasMap): {
  altIds: Array<string>;
  namesForSearch: Record<string, string>;
  umasForSearch: Array<UmaSearchEntry>;
} {
  const altIds = Object.keys(umas).flatMap((id) => {
    const uma = umas[id];
    if (!uma) {
      return [];
    }
    return Object.keys(uma.outfits);
  });

  const namesForSearch = Object.fromEntries(
    altIds.map((id) => {
      const baseId = getUmaBaseId(id);
      const uma = umas[baseId];
      if (!uma) {
        return [id, ''];
      }

      return [id, (uma.outfits[id] + ' ' + uma.name[1]).toUpperCase().replace(/\./g, '')];
    }),
  );

  const umasForSearch = altIds
    .map((id) => {
      const baseId = getUmaBaseId(id);
      const uma = umas[baseId];
      if (!uma) {
        return null;
      }

      return {
        id,
        name: uma.name[1],
        outfit: uma.outfits[id],
      };
    })
    .filter((entry): entry is UmaSearchEntry => entry !== null);

  return {
    altIds,
    namesForSearch,
    umasForSearch,
  };
}

// Base Functions

export const getUmaBaseId = (id: string) => {
  if (id.length > 4) {
    return id.slice(0, 4);
  }

  return id;
};

export const getUmaById = (id: string) => {
  const baseId = getUmaBaseId(id);
  const umas = getUmasData();

  const uma = umas[baseId];

  if (!uma) {
    throw new Error(`Uma with id ${id} not found`);
  }

  return uma;
};

export type UmaAltId = string;
export const getUmaAltIds = () => buildUmaSearchData(getUmasData()).altIds;

// Lookup Functions

export const getUmaNamesForSearch = () => buildUmaSearchData(getUmasData()).namesForSearch;
export const getUmasForSearch = () => buildUmaSearchData(getUmasData()).umasForSearch;

export function useUmasForSearch(): Array<UmaSearchEntry> {
  const umas = useRuntimeUmas();
  return useMemo(() => buildUmaSearchData(umas).umasForSearch, [umas]);
}

export function rankForStat(x: number) {
  if (x > 1200) {
    // over 1200 letter (eg UG) goes up by 100 and minor number (eg UG8) goes up by 10
    return Math.min(18 + Math.floor((x - 1200) / 100) * 10 + (Math.floor(x / 10) % 10), 97);
  } else if (x >= 1150) {
    return 17; // SS+
  } else if (x >= 1100) {
    return 16; // SS
  } else if (x >= 400) {
    // between 400 and 1100 letter goes up by 100 starting with C (8)
    return 8 + Math.floor((x - 400) / 100);
  } else {
    // between 1 and 400 letter goes up by 50 starting with G+ (0)
    return Math.floor(x / 50);
  }
}
export function searchNames(query: string) {
  const q = query.toUpperCase().replace(/\./g, '');
  const namesForSearch = getUmaNamesForSearch();
  return getUmaAltIds().filter((oid) => namesForSearch[oid]?.indexOf(q) > -1);
}

// Image URL Utilities

/**
 * Get the icon image URL for an Uma outfit ID
 * Falls back to a random mob image if no outfit ID is provided
 */
export const getUmaImageUrl = (outfitId: string | undefined, randomMobId?: number): string => {
  if (outfitId) {
    return icons[outfitId as keyof typeof icons];
  }

  return getMobImageUrl(randomMobId);
};

/**
 * Get the image URL for a random mob
 */
export const getMobImageUrl = (randomMobId?: number): string => {
  const mobId = randomMobId || 8000;
  return `/icons/mob/trained_mob_chr_icon_${mobId}_000001_01.png`;
};

/**
 * Get Uma outfit name by outfit ID
 */
export const getUmaOutfitName = (outfitId: string): string | null => {
  try {
    const uma = getUmaById(outfitId);
    return uma.outfits[outfitId] || null;
  } catch {
    return null;
  }
};

/**
 * Get Uma display info (name + outfit) by outfit ID
 */
export const getUmaDisplayInfo = (outfitId: string): { name: string; outfit: string } | null => {
  try {
    const uma = getUmaById(outfitId);

    return {
      name: uma.name[1],
      outfit: uma.outfits[outfitId],
    };
  } catch {
    return null;
  }
};
