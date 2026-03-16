import type { SkillEntry } from '@/modules/data/skills';
import { createContext, useContext } from 'react';

export type SkillMeta = {
  hintLevel: number;
  bought?: boolean;
};

const DEFAULT_SKILL_META: SkillMeta = { hintLevel: 0 };

export const defaultGetSkillMeta = (): SkillMeta => DEFAULT_SKILL_META;

export type ISkillItemContext = {
  skill: SkillEntry;
  hasFastLearner: boolean;
  hasCost: boolean;
  runnerId?: string;
  distanceFactor?: number;
  spCost?: number;

  onHintLevelChange?: (skillId: string, level: number) => void;
  onBoughtChange?: (skillId: string, bought: boolean) => void;
  onRemove?: (skillId: string) => void;
  getSkillMeta: (skillId: string) => SkillMeta;
};

export const SkillItemContext = createContext<ISkillItemContext>({} as ISkillItemContext);

export const useSkillItem = () => {
  const context = useContext(SkillItemContext);

  if (!context) {
    throw new Error('useSkillItem must be used within a SkillItemContext');
  }

  return context;
};
