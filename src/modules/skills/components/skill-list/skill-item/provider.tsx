import React, { useMemo } from 'react';
import { skillCollection } from '@/modules/data/skills';
import { normalizeSkillIdForCostSummary } from '@/modules/skills/skill-cost-summary';
import { isUniqueSkill } from '@/store/runners.store';
import {
  defaultGetSkillMeta,
  SkillItemContext,
  type SkillItemContextValue,
  type SkillMeta,
} from './context';
import type { SkillItemContextProps } from './types';

export type SkillItemProviderProps = React.PropsWithChildren<SkillItemContextProps>;

export function SkillItemProvider({
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
}: Readonly<SkillItemProviderProps>) {
  const normalizedSkillId = useMemo(() => normalizeSkillIdForCostSummary(skillId), [skillId]);

  const skill = useMemo(() => skillCollection[normalizedSkillId], [normalizedSkillId]);

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

  const contextValue = useMemo<SkillItemContextValue>(() => {
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
}
