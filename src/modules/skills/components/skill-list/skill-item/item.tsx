import React from 'react';
import { SkillItemProvider } from './provider';
import type { SkillItemProps } from './types';

export const SkillItem = React.memo((props: Readonly<SkillItemProps>) => {
  const {
    children,
    skillId,
    hasFastLearner,
    distanceFactor,
    spCost,
    costSummary,
    runnerId,
    onHintLevelChange,
    onBoughtChange,
    onRemove,
    getSkillMeta,
  } = props;

  return (
    <SkillItemProvider
      skillId={skillId}
      hasFastLearner={hasFastLearner}
      distanceFactor={distanceFactor}
      spCost={spCost}
      costSummary={costSummary}
      runnerId={runnerId}
      onHintLevelChange={onHintLevelChange}
      onBoughtChange={onBoughtChange}
      onRemove={onRemove}
      getSkillMeta={getSkillMeta}
    >
      {children}
    </SkillItemProvider>
  );
});
