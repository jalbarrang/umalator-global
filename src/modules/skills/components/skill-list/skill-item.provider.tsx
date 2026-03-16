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

export const SkillItemProvider = (props: SkillItemProviderProps) => {
  const skill = useMemo(() => skillCollection[props.skillId], [props.skillId]);

  const hasCost = useMemo(() => {
    return typeof props.spCost === 'number' && !isUniqueSkill(skill.rarity);
  }, [props.spCost, skill.rarity]);

  const contextValue = useMemo(() => {
    return {
      skill,
      hasFastLearner: props.hasFastLearner ?? false,
      hasCost,
      runnerId: props.runnerId,
      distanceFactor: props.distanceFactor,
      spCost: props.spCost,
      onHintLevelChange: props.onHintLevelChange,
      onBoughtChange: props.onBoughtChange,
      onRemove: props.onRemove,
      getSkillMeta: props.getSkillMeta ?? defaultGetSkillMeta,
    };
  }, [
    skill,
    props.hasFastLearner,
    hasCost,
    props.runnerId,
    props.distanceFactor,
    props.spCost,
    props.onHintLevelChange,
    props.onBoughtChange,
    props.onRemove,
    props.getSkillMeta,
  ]);

  return (
    <SkillItemContext.Provider value={contextValue}>{props.children}</SkillItemContext.Provider>
  );
};
