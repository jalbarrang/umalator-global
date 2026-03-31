import React, { useMemo } from 'react';
import { defaultGetSkillMeta, SkillItemContext, type SkillMeta } from './skill-item.context';
import { skillCollection } from '@/modules/data/skills';
import { isUniqueSkill } from '@/store/runners.store';

type SkillItemProviderProps = React.PropsWithChildren<{
  skillId: string;
  hasFastLearner?: boolean;
  spCost?: number;
  runnerId?: string;
  distanceFactor?: number;
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
  onHintLevelChange,
  onBoughtChange,
  onRemove,
  getSkillMeta,
}: SkillItemProviderProps) => {
  const skill = useMemo(() => {
    const baseId = skillId.split('-')[0] ?? skillId;
    return skillCollection[baseId];
  }, [skillId]);

  const hasCost = useMemo(() => {
    return typeof spCost === 'number' && !isUniqueSkill(skill.rarity);
  }, [spCost, skill.rarity]);

  const contextValue = useMemo(() => {
    return {
      skill,
      hasFastLearner: hasFastLearner ?? false,
      hasCost,
      runnerId,
      distanceFactor,
      spCost,
      onHintLevelChange,
      onBoughtChange,
      onRemove,
      getSkillMeta: getSkillMeta ?? defaultGetSkillMeta,
    };
  }, [
    skill,
    hasFastLearner,
    hasCost,
    runnerId,
    distanceFactor,
    spCost,
    onHintLevelChange,
    onBoughtChange,
    onRemove,
    getSkillMeta,
  ]);

  return <SkillItemContext.Provider value={contextValue}>{children}</SkillItemContext.Provider>;
};
