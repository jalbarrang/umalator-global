import { Activity, memo, useMemo, type ReactNode } from 'react';
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
import type { SkillEntry } from '@/modules/data/skills';

export const SkillIcon = (props: { iconId: string }) => {
  const { iconId } = props;

  return <img className="w-6 h-6" src={getIconUrl(`${iconId}.png`)} alt={iconId} />;
};

type SkillIconNameRowProps = {
  iconId: string;
  skillId: string;
  className?: string;
};

const SkillIconNameRow = (props: SkillIconNameRowProps) => {
  const { iconId, skillId, className } = props;

  return (
    <div className={cn('flex flex-1 items-center gap-2', className)}>
      <Activity mode={iconId ? 'visible' : 'hidden'}>
        <SkillIcon iconId={iconId} />
      </Activity>

      <span className="text-sm text-foreground leading-tight wrap-break-word">
        {i18n.t(`skillnames.${skillId}`)}
      </span>
    </div>
  );
};

type SkillDetailsPopoverActionsProps = {
  skillId: string;
  skill: SkillEntry;
  distanceFactor?: number;
  dismissable: boolean;
  onRemove?: (skillId: string) => void;
  className?: string;
};

const SkillDetailsPopoverActions = (props: SkillDetailsPopoverActionsProps) => {
  const { skillId, skill, distanceFactor, dismissable, onRemove, className } = props;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-lg"
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
          size="icon-lg"
          type="button"
          data-event="remove-skill"
          data-skillid={skillId}
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
  );
};

type SkillCostDetailsPopoverProps = {
  triggerClassName: string;
  children: ReactNode;
};

const SkillCostDetailsPopover = (props: SkillCostDetailsPopoverProps) => {
  const { triggerClassName, children } = props;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className={triggerClassName}
            title="Show skill cost details"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </Button>
        }
      />
      <PopoverContent align="start" side="right" className="w-[420px] p-0">
        <SkillCostDetails />
      </PopoverContent>
    </Popover>
  );
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

  const { skill, skillId, hasCost, costSummary } = useSkillItem();
  const isCostSummaryLayout = hasCost && Boolean(costSummary);

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
        <TwoLineSkillLayout dismissable={dismissable} />
      ) : (
        <DefaultSkillLayout dismissable={dismissable} />
      )}
    </div>
  );
};

type SkillLayoutProps = {
  dismissable: boolean;
};

const DefaultSkillLayout = (props: SkillLayoutProps) => {
  const { dismissable } = props;
  const { skill, skillId, hasCost, costSummary, distanceFactor, spCost, onRemove, getSkillMeta } =
    useSkillItem();

  const selfMeta = useMemo(() => getSkillMeta(skillId), [getSkillMeta, skillId]);

  const isObtained = useMemo(
    () => costSummary?.isObtained ?? selfMeta.bought ?? false,
    [costSummary?.isObtained, selfMeta.bought],
  );

  const displayedNetCost = useMemo(
    () => costSummary?.netTotal ?? spCost ?? 0,
    [costSummary?.netTotal, spCost],
  );

  return (
    <div className="flex flex-1 items-center gap-2 p-1 px-2">
      <SkillIconNameRow iconId={skill.iconId} skillId={skill.id} />

      <div className="flex items-center">
        {hasCost && (
          <SkillCostDetailsPopover
            triggerClassName={cn(
              'h-full rounded-none whitespace-nowrap cursor-pointer',
              isObtained ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            {isObtained ? 'Obtained' : `${displayedNetCost} SP`}
          </SkillCostDetailsPopover>
        )}

        <SkillDetailsPopoverActions
          skillId={skillId}
          skill={skill}
          distanceFactor={distanceFactor}
          dismissable={dismissable}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
};

const TwoLineSkillLayout = (props: SkillLayoutProps) => {
  const { dismissable } = props;
  const { skill, skillId, costSummary, distanceFactor, onRemove, hasCost, getSkillMeta, spCost } =
    useSkillItem();

  const roundedDiscountPct = useMemo(
    () => costSummary?.roundedDiscountPct ?? 0,
    [costSummary?.roundedDiscountPct],
  );

  const selfMeta = useMemo(() => getSkillMeta(skillId), [getSkillMeta, skillId]);

  const isObtained = useMemo(
    () => costSummary?.isObtained ?? selfMeta.bought ?? false,
    [costSummary?.isObtained, selfMeta.bought],
  );

  const displayedNetCost = useMemo(
    () => costSummary?.netTotal ?? spCost ?? 0,
    [costSummary?.netTotal, spCost],
  );

  return (
    <div className="flex flex-1 flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 p-1 px-2">
        <SkillIconNameRow iconId={skill.iconId} skillId={skill.id} />

        <SkillDetailsPopoverActions
          skillId={skillId}
          skill={skill}
          distanceFactor={distanceFactor}
          dismissable={dismissable}
          onRemove={onRemove}
          className="shrink-0"
        />
      </div>

      {hasCost && (
        <SkillCostDetailsPopover
          triggerClassName={cn(
            'h-8 w-full justify-end gap-2 rounded-sm border border-border/60 bg-muted/20 px-2 cursor-pointer hover:bg-muted/40',
            isObtained
              ? 'border-green-600/30 bg-green-600/5 text-green-600 dark:border-green-400/30 dark:bg-green-400/8 dark:text-green-400'
              : 'text-muted-foreground',
          )}
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
        </SkillCostDetailsPopover>
      )}
    </div>
  );
};
