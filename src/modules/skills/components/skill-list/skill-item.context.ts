import type { SkillEntry } from '@/modules/data/skills';
import type { SkillCostSummary } from '@/modules/skills/skill-cost-summary';
import { createContext, useContext } from 'react';

export type SkillMeta = {
  hintLevel: number;
  bought?: boolean;
};

const DEFAULT_SKILL_META: SkillMeta = { hintLevel: 0 };

export const defaultGetSkillMeta = (): SkillMeta => DEFAULT_SKILL_META;

export type ISkillItemContext = {
  skill: SkillEntry;
  skillId: string;
  normalizedSkillId: string;
  hasFastLearner: boolean;
  hasCost: boolean;
  runnerId?: string;
  distanceFactor?: number;
  spCost?: number;
  costSummary?: SkillCostSummary;

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
