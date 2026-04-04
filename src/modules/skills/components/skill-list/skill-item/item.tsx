import { useSkillItem } from './context';
import { SkillItemCostSummaryLayout, SkillItemDefaultLayout } from './layouts';
import { SkillItemProvider } from './provider';
import { SkillItemRail, SkillItemRoot } from './primitives';
import type { SkillItemContentProps, SkillItemProps } from './types';

export function SkillItemContent(props: Readonly<SkillItemContentProps>) {
  const {
    selected = false,
    isHovered = false,
    isFocused = false,
    dismissable = false,
    interactive = true,
    accessory,
    onDismiss,
    className,
    ...rest
  } = props;
  const { hasCost, costSummary } = useSkillItem();
  const isCostSummaryLayout = hasCost && Boolean(costSummary) && !accessory;

  return (
    <SkillItemRoot
      interactive={interactive}
      selected={selected}
      isHovered={isHovered}
      isFocused={isFocused}
      size={isCostSummaryLayout ? 'summary' : 'default'}
      className={className}
      {...rest}
    >
      <SkillItemRail />
      {isCostSummaryLayout ? (
        <SkillItemCostSummaryLayout dismissable={dismissable} onDismiss={onDismiss} />
      ) : (
        <SkillItemDefaultLayout dismissable={dismissable} accessory={accessory} onDismiss={onDismiss} />
      )}
    </SkillItemRoot>
  );
}

export function SkillItem(props: Readonly<SkillItemProps>) {
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
}

SkillItem.displayName = 'SkillItem';
