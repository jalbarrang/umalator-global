import { useMemo } from 'react';
import { createRuntimeCatalogProxy, getDataRuntime } from './runtime';

// =======
// Types
// =======

export type UmaEntry = {
  name: Array<string>; // [Japanese name, English name]
  outfits: Record<string, string>; // { outfitId: "epithet" }
};
export type UmasMap = Record<string, UmaEntry>;

// =======
// Data
// =======

const getUmasMap = (): UmasMap => getDataRuntime().catalog.umas;

export const umas = createRuntimeCatalogProxy(getUmasMap) as UmasMap;

// =====
// Query Methods
// =====

export const getUmas = (): Array<UmaEntry> => Object.values(umas);
export const getUmaById = (id: string): UmaEntry | undefined => umas[id];
export const getUmasByOutfitId = (outfitId: string): UmaEntry | undefined => {
  const uma = umas[outfitId];

  if (uma === undefined) {
    return undefined;
  }

  return uma;
};

// =============
// Hooks
// =============

export const useUmas = () => {
  return useMemo(() => umas, []);
};

export const umaForUniqueSkill = (skillId: string): string | null => {
  const sid = parseInt(skillId);
  if (sid < 100000 || sid >= 200000) return null;

  const remainder = sid - 100001;
  if (remainder < 0) return null;

  const i = Math.floor(remainder / 10) % 1000;
  const v = Math.floor(remainder / 10 / 1000) + 1;

  const umaId = i.toString().padStart(3, '0');
  const baseUmaId = `1${umaId}`;
  const outfitId = `${baseUmaId}${v.toString().padStart(2, '0')}`;
  const uma = umas[baseUmaId];

  if (uma?.outfits[outfitId]) {
    return outfitId;
  }

  return null;
};
