import { Activity, memo } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { ExpandedSkillDetails } from '../ExpandedSkillDetails';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isEvolutionSkill, isGoldSkill, isUniqueSkill, isWhiteSkill } from '@/store/runners.store';
import { SkillCostDetails } from '../cost-details';
import { SkillItemProvider } from './skill-item.provider';
import { useSkillItem, type SkillMeta } from './skill-item.context';

export const SkillIcon = (props: { iconId: string }) => {
  return <img className="w-6 h-6" src={`/icons/${props.iconId}.png`} />;
};

type SkillItemProps = React.HTMLAttributes<HTMLDivElement> & {
  skillId: string;
  selected?: boolean;
  dismissable?: boolean;
  distanceFactor?: number;
  isHovered?: boolean;
  isFocused?: boolean;
  spCost?: number;
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

  const { skill, hasCost, distanceFactor, spCost, onRemove, getSkillMeta } = useSkillItem();
  const isObtained = getSkillMeta(skill.id).bought ?? false;

  return (
    <div
      data-skillid={skill.id}
      data-event="select-skill"
      style={props.style}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className={cn(
        'rounded-md bg-background border-2 flex h-auto min-h-[48px]',
        {
          'ring-2 ring-primary': selected,
          'bg-yellow-200/70 dark:bg-yellow-800/40': isHovered || isFocused,
        },
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

      <div className="flex flex-1 items-center gap-2 p-2">
        <Activity mode={skill.iconId ? 'visible' : 'hidden'}>
          <SkillIcon iconId={skill.iconId} />
        </Activity>

        <span className={cn('text-sm text-foreground')}>{i18n.t(`skillnames.${skill.id}`)}</span>
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
                  {isObtained ? 'Obtained' : `${spCost} SP`}
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
            <ExpandedSkillDetails id={skill.id} skill={skill} distanceFactor={distanceFactor} />
          </PopoverContent>
        </Popover>

        {dismissable && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            data-event="remove-skill"
            data-skillid={skill.id}
            className="h-full rounded-none cursor-pointer"
            onClick={
              onRemove
                ? (e) => {
                    e.stopPropagation();
                    onRemove(skill.id);
                  }
                : undefined
            }
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
