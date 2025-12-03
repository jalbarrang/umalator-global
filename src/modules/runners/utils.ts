import umas from '@data/umas.json';

export type Uma = {
  name: string[];
  outfits: Record<string, string>;
};

// Base Functions

export const getUmaBaseId = (id: string) => {
  if (id.length > 4) {
    return id.slice(0, 4);
  }

  return id;
};

export const getUmaById = (id: string) => {
  return umas[getUmaBaseId(id)];
};

export type UmaAltId = (typeof umaAltIds)[number];

export const umaAltIds = Object.keys(umas).flatMap((id) =>
  Object.keys(umas[id].outfits),
);

// Lookup Functions

export const umaNamesForSearch = Object.fromEntries(
  umaAltIds.map((id) => {
    const uma = getUmaById(id);
    return [
      id,
      (uma.outfits[id] + ' ' + uma.name[1]).toUpperCase().replace(/\./g, ''),
    ];
  }),
);

export const umasForSearch = umaAltIds.map((id) => {
  const uma = getUmaById(id);

  return {
    id,
    name: uma.name[1],
    outfit: uma.outfits[id],
  };
});

export function rankForStat(x: number) {
  if (x > 1200) {
    // over 1200 letter (eg UG) goes up by 100 and minor number (eg UG8) goes up by 10
    return Math.min(
      18 + Math.floor((x - 1200) / 100) * 10 + (Math.floor(x / 10) % 10),
      97,
    );
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
export function searchNames(query) {
  const q = query.toUpperCase().replace(/\./g, '');
  return umaAltIds.filter((oid) => umaNamesForSearch[oid].indexOf(q) > -1);
}
