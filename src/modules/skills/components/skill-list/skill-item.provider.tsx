import React, { useMemo } from 'react';
import { defaultGetSkillMeta, SkillItemContext, type SkillMeta } from './skill-item.context';
import { skillCollection } from '@/modules/data/skills';
import { isUniqueSkill } from '@/store/runners.store';
import {
  normalizeSkillIdForCostSummary,
  type SkillCostSummary,
} from '@/modules/skills/skill-cost-summary';

type SkillItemProviderProps = React.PropsWithChildren<{
  skillId: string;
  hasFastLearner?: boolean;
  spCost?: number;
  runnerId?: string;
  distanceFactor?: number;
  costSummary?: SkillCostSummary;
  onHintLevelChange?: (skillId: string, level: number) => void;
  onBoughtChange?: (skillId: string, bought: boolean) => void;
  onRemove?: (skillId: string) => void;
  getSkillMeta?: (skillId: string) => SkillMeta;
}>;

export const SkillItemProvider = ({
  children,
  skillId,
  hasFastLearner,
  spCost,
  runnerId,
  distanceFactor,
  costSummary,
  onHintLevelChange,
  onBoughtChange,
  onRemove,
  getSkillMeta,
}: SkillItemProviderProps) => {
  const normalizedSkillId = useMemo(() => normalizeSkillIdForCostSummary(skillId), [skillId]);

  const skill = useMemo(() => {
    return skillCollection[normalizedSkillId];
  }, [normalizedSkillId]);

  const hasCost = useMemo(() => {
    const supportsPurchasableCost = !isUniqueSkill(skill.rarity);

    if (!supportsPurchasableCost) {
      return false;
    }

    return Boolean(costSummary) || typeof spCost === 'number';
  }, [costSummary, spCost, skill.rarity]);

  const resolvedGetSkillMeta = useMemo(() => {
    const sourceGetSkillMeta = getSkillMeta ?? defaultGetSkillMeta;

    return (targetSkillId: string): SkillMeta => {
      const directMeta = sourceGetSkillMeta(targetSkillId);
      const normalizedTargetSkillId = normalizeSkillIdForCostSummary(targetSkillId);

      if (
        normalizedTargetSkillId === targetSkillId ||
        directMeta.hintLevel !== 0 ||
        directMeta.bought !== undefined
      ) {
        return directMeta;
      }

      const fallbackMeta = sourceGetSkillMeta(normalizedTargetSkillId);

      if (fallbackMeta.hintLevel !== 0 || fallbackMeta.bought !== undefined) {
        return fallbackMeta;
      }

      return directMeta;
    };
  }, [getSkillMeta]);

  const contextValue = useMemo(() => {
    return {
      skill,
      skillId,
      normalizedSkillId,
      hasFastLearner: hasFastLearner ?? false,
      hasCost,
      runnerId,
      distanceFactor,
      spCost,
      costSummary,
      onHintLevelChange,
      onBoughtChange,
      onRemove,
      getSkillMeta: resolvedGetSkillMeta,
    };
  }, [
    skill,
    skillId,
    normalizedSkillId,
    hasFastLearner,
    hasCost,
    runnerId,
    distanceFactor,
    spCost,
    costSummary,
    onHintLevelChange,
    onBoughtChange,
    onRemove,
    resolvedGetSkillMeta,
  ]);

  return <SkillItemContext.Provider value={contextValue}>{children}</SkillItemContext.Provider>;
};
