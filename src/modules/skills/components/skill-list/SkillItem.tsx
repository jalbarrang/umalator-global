import { Activity, memo } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { ExpandedSkillDetails } from '../ExpandedSkillDetails';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isEvolutionSkill, isGoldSkill, isUniqueSkill, isWhiteSkill } from '@/store/runners.store';
import { SkillCostDetails } from '../cost-details';
import { SkillItemProvider } from './skill-item.provider';
import { useSkillItem, type SkillMeta } from './skill-item.context';
import type { SkillCostSummary } from '@/modules/skills/skill-cost-summary';

export const SkillIcon = (props: { iconId: string }) => {
  const { iconId } = props;

  return <img className="w-6 h-6" src={getIconUrl(`${iconId}.png`)} alt={iconId} />;
};

type SkillItemProps = React.HTMLAttributes<HTMLDivElement> & {
  skillId: string;
  selected?: boolean;
  dismissable?: boolean;
  distanceFactor?: number;
  isHovered?: boolean;
  isFocused?: boolean;
  spCost?: number;
  costSummary?: SkillCostSummary;
  runnerId?: string;
  hasFastLearner?: boolean;
  onHintLevelChange?: (skillId: string, level: number) => void;
  onBoughtChange?: (skillId: string, bought: boolean) => void;
  onRemove?: (skillId: string) => void;
  getSkillMeta?: (skillId: string) => SkillMeta;
};

export const SkillItem = memo((props: SkillItemProps) => {
  const {
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
    ...rest
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
      <SkillItemContent {...rest} />
    </SkillItemProvider>
  );
});

type SkillItemContentProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
  isHovered?: boolean;
  isFocused?: boolean;
  dismissable?: boolean;
};

const SkillItemContent = (props: SkillItemContentProps) => {
  const { selected = false, isHovered = false, isFocused = false, dismissable = false } = props;

  const { skill, skillId, hasCost, costSummary, distanceFactor, spCost, onRemove, getSkillMeta } =
    useSkillItem();
  const isCostSummaryLayout = hasCost && Boolean(costSummary);
  const isObtained = costSummary?.isObtained ?? getSkillMeta(skillId).bought ?? false;
  const displayedNetCost = costSummary?.netTotal ?? spCost ?? 0;
  const roundedDiscountPct = costSummary?.roundedDiscountPct ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-skillid={skillId}
      data-event="select-skill"
      style={props.style}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className={cn(
        'rounded-md bg-background border-2 flex h-auto',
        {
          'ring-2 ring-primary': selected,
          'bg-yellow-200/70 dark:bg-yellow-800/40': isHovered || isFocused,
        },
        isCostSummaryLayout ? 'min-h-[64px]' : 'min-h-[48px]',
        props.className,
      )}
    >
      <div
        className={cn('flex w-6 border rounded-l', {
          'skill-white': isWhiteSkill(skill.rarity),
          'skill-gold': isGoldSkill(skill.rarity),
          'skill-unique': isUniqueSkill(skill.rarity),
          'skill-pink': isEvolutionSkill(skill.rarity),
        })}
      ></div>

      {isCostSummaryLayout ? (
        <div className="flex flex-1 flex-col gap-2 p-2.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Activity mode={skill.iconId ? 'visible' : 'hidden'}>
                <SkillIcon iconId={skill.iconId} />
              </Activity>

              <span className={cn('text-sm text-foreground leading-tight break-words')}>
                {i18n.t(`skillnames.${skill.id}`)}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground cursor-pointer"
                      title="Show skill details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CircleHelp className="h-4 w-4" />
                    </Button>
                  }
                />
                <PopoverContent align="start" side="right" className="w-[420px] p-0">
                  <ExpandedSkillDetails
                    id={skillId}
                    skill={skill}
                    distanceFactor={distanceFactor}
                  />
                </PopoverContent>
              </Popover>

              {dismissable && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  data-event="remove-skill"
                  data-skillid={skillId}
                  className="h-7 w-7 cursor-pointer"
                  onClick={
                    onRemove
                      ? (e) => {
                          e.stopPropagation();
                          onRemove(skillId);
                        }
                      : undefined
                  }
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {hasCost && (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-full justify-end gap-2 rounded-sm border border-border/60 bg-muted/20 px-2 cursor-pointer hover:bg-muted/40',
                      isObtained
                        ? 'border-green-600/30 bg-green-600/5 text-green-600 dark:border-green-400/30 dark:bg-green-400/8 dark:text-green-400'
                        : 'text-muted-foreground',
                    )}
                    title="Show skill cost details"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isObtained ? (
                      'Obtained'
                    ) : (
                      <>
                        {roundedDiscountPct > 0 && (
                          <span className="text-[11px] font-medium italic tracking-tight text-muted-foreground">
                            {roundedDiscountPct}% off
                          </span>
                        )}
                        <span className="font-semibold text-foreground">{displayedNetCost} SP</span>
                      </>
                    )}
                  </Button>
                }
              />
              <PopoverContent align="start" side="right" className="w-[420px] p-0">
                <SkillCostDetails />
              </PopoverContent>
            </Popover>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-1 items-center gap-2 p-2">
            <Activity mode={skill.iconId ? 'visible' : 'hidden'}>
              <SkillIcon iconId={skill.iconId} />
            </Activity>

            <span className={cn('text-sm text-foreground')}>
              {i18n.t(`skillnames.${skill.id}`)}
            </span>
          </div>

          <div className="flex h-full items-center">
            {hasCost && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-full rounded-none whitespace-nowrap cursor-pointer',
                        isObtained ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                      )}
                      title="Show skill cost details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isObtained ? 'Obtained' : `${displayedNetCost} SP`}
                    </Button>
                  }
                />
                <PopoverContent align="start" side="right" className="w-[420px] p-0">
                  <SkillCostDetails />
                </PopoverContent>
              </Popover>
            )}

            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full text-muted-foreground rounded-none cursor-pointer"
                    title="Show skill details"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Button>
                }
              />
              <PopoverContent align="start" side="right" className="w-[420px] p-0">
                <ExpandedSkillDetails id={skillId} skill={skill} distanceFactor={distanceFactor} />
              </PopoverContent>
            </Popover>

            {dismissable && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                data-event="remove-skill"
                data-skillid={skillId}
                className="h-full rounded-none cursor-pointer"
                onClick={
                  onRemove
                    ? (e) => {
                        e.stopPropagation();
                        onRemove(skillId);
                      }
                    : undefined
                }
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
