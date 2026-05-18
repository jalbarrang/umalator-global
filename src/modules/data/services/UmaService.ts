// =======
// Types
// =======

export type UmaEntry = {
  name: Array<string>; // [Japanese name, English name]
  outfits: Record<string, string>; // { outfitId: "epithet" }
};

export type UmasMap = Record<string, UmaEntry>;

// =======
// Service
// =======

export type UmaServiceOptions = {
  releasedOutfits?: Iterable<string>;
};

function collectOutfitIds(umasData: UmasMap): Set<string> {
  const outfitIds = new Set<string>();

  for (const uma of Object.values(umasData)) {
    for (const outfitId of Object.keys(uma.outfits)) {
      outfitIds.add(outfitId);
    }
  }

  return outfitIds;
}

export class UmaService {
  private readonly umas: UmasMap;
  private readonly releasedOutfits: Set<string>;

  constructor(umasData: UmasMap, options: UmaServiceOptions = {}) {
    const { releasedOutfits } = options;

    this.umas = umasData;
    this.releasedOutfits = new Set(releasedOutfits ?? collectOutfitIds(umasData));
  }

  // =====
  // Query Methods
  // =====

  getAll = (): Array<UmaEntry> => Object.values(this.umas);

  getAllEntries = (): Array<[string, UmaEntry]> => Object.entries(this.umas);

  getById = (id: string): UmaEntry | undefined => this.umas[id];

  getByOutfitId = (outfitId: string): UmaEntry | undefined => {
    return Object.values(this.umas).find((uma) => uma.outfits[outfitId] !== undefined);
  };

  isReleased = (outfitId: string): boolean => {
    return this.releasedOutfits.has(outfitId);
  };

  umaForUniqueSkill = (skillId: string): string | null => {
    const sid = parseInt(skillId);
    if (sid < 100000 || sid >= 200000) return null;

    const remainder = sid - 100001;
    if (remainder < 0) return null;

    const i = Math.floor(remainder / 10) % 1000;
    const v = Math.floor(remainder / 10 / 1000) + 1;

    const umaId = i.toString().padStart(3, '0');
    const baseUmaId = `1${umaId}`;
    const outfitId = `${baseUmaId}${v.toString().padStart(2, '0')}`;
    const uma = this.umas[baseUmaId];

    if (uma?.outfits[outfitId]) {
      return outfitId;
    }

    return null;
  };
}
