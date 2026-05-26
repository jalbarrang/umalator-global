// =======
// Types
// =======

import { loadedSupportCards } from '../loaders/support-card-loader';

export type SupportCardSkillEntry = {
  id: number;
  name: string;
  rarity: number;
};

export type SupportCardEntry = {
  id: number;
  name: string;
  charaId: number;
  charaName: string;
  rarity: number;
  supportCardType: number;
  released: boolean;
  hintSkills: Array<SupportCardSkillEntry>;
  eventSkills: Array<SupportCardSkillEntry>;
  chainEventSkills: Array<SupportCardSkillEntry>;
  randomEventSkills: Array<SupportCardSkillEntry>;
};

export type SupportCardsMap = Record<string, SupportCardEntry>;

// =======
// Service
// =======

export class SupportCardService {
  private readonly supportCards: SupportCardsMap;

  constructor(supportCardsData: SupportCardsMap) {
    this.supportCards = supportCardsData;
  }

  getAll = (): Array<SupportCardEntry> => Object.values(this.supportCards);

  getById = (id: string): SupportCardEntry | undefined => this.supportCards[id];

  getByCharaId = (charaId: number): Array<SupportCardEntry> => {
    return this.getAll().filter((card) => card.charaId === charaId);
  };

  getByType = (type: number): Array<SupportCardEntry> => {
    return this.getAll().filter((card) => card.supportCardType === type);
  };

  getByRarity = (rarity: number): Array<SupportCardEntry> => {
    return this.getAll().filter((card) => card.rarity === rarity);
  };

  isReleased = (id: string): boolean => {
    return this.supportCards[id]?.released ?? false;
  };

  getReleased = (): Array<SupportCardEntry> => {
    return this.getAll().filter((card) => card.released);
  };

  getUpcoming = (): Array<SupportCardEntry> => {
    return this.getAll().filter((card) => !card.released);
  };
}

export const supportCardsService = new SupportCardService(loadedSupportCards);
