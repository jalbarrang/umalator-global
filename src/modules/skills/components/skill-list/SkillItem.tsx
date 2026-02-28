import { Activity, memo, useMemo } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { ExpandedSkillDetails } from '../ExpandedSkillDetails';
import { getSkillById } from '@/modules/skills/utils';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isEvolutionSkill, isGoldSkill, isUniqueSkill, isWhiteSkill } from '@/store/runners.store';

export const SkillIcon = (props: { iconId: string }) => {
  return <img className="w-6 h-6" src={`/icons/${props.iconId}.png`} />;
};

type SkillItemProps = React.HTMLAttributes<HTMLDivElement> & {
  skillId: string;
  selected?: boolean;
  dismissable?: boolean;
  withDetails?: boolean;
  distanceFactor?: number;
  isHovered?: boolean;
  isFocused?: boolean;
};

export const SkillItem = memo((props: SkillItemProps) => {
  const {
    skillId,
    selected = false,
    dismissable = false,
    withDetails = false,
    distanceFactor = 0,
    isHovered = false,
    isFocused = false,
  } = props;

  const skill = useMemo(() => getSkillById(skillId), [skillId]);

  const skillContext = useMemo(
    () => ({
      id: skillId.split('-')[0],
      rarity: skill.rarity,
      iconId: skill.iconId,
    }),
    [skillId, skill],
  );

  if (!withDetails) {
    return (
      <div
        className={cn(
          'rounded-md bg-background border-2 flex h-[44px]',
          {
            selected: selected,
            'bg-yellow-200/70 dark:bg-yellow-800/40': isHovered || isFocused,
          },
          props.className,
        )}
        style={props.style}
        data-event="select-skill"
        data-skillid={skillId}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        <div
          className={cn('flex w-6 border rounded-l', {
            'skill-white': isWhiteSkill(skillContext.rarity),
            'skill-gold': isGoldSkill(skillContext.rarity),
            'skill-unique': isUniqueSkill(skillContext.rarity),
            'skill-pink': isEvolutionSkill(skillContext.rarity),
          })}
        ></div>

        <div className="flex flex-1 items-center gap-2 p-2">
          <Activity mode={skillContext.iconId ? 'visible' : 'hidden'}>
            <SkillIcon iconId={skillContext.iconId} />
          </Activity>

          <span className={cn('text-sm text-foreground')}>
            {i18n.t(`skillnames.${skillContext.id}`)}
          </span>
        </div>

        {dismissable && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            data-event="remove-skill"
            data-skillid={skillId}
            className="h-full"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-skillid={skillId}
      style={props.style}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className={cn(
        'rounded-md bg-background border-2 flex h-[44px]',
        {
          selected: selected,
          'bg-yellow-200/70 dark:bg-yellow-800/40': isHovered || isFocused,
        },
        props.className,
      )}
    >
      <div
        className={cn('flex w-6 border rounded-l', {
          'skill-white': isWhiteSkill(skillContext.rarity),
          'skill-gold': isGoldSkill(skillContext.rarity),
          'skill-unique': isUniqueSkill(skillContext.rarity),
          'skill-pink': isEvolutionSkill(skillContext.rarity),
        })}
      ></div>

      <div className="flex flex-1 items-center gap-2 p-2">
        <Activity mode={skillContext.iconId ? 'visible' : 'hidden'}>
          <SkillIcon iconId={skillContext.iconId} />
        </Activity>

        <span className={cn('text-sm text-foreground')}>
          {i18n.t(`skillnames.${skillContext.id}`)}
        </span>
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-full shrink-0 text-muted-foreground"
              title="Show skill details"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          }
        />
        <PopoverContent align="start" side="right" className="w-[420px] p-0">
          <ExpandedSkillDetails
            id={skillId}
            skill={skill}
            dismissable={dismissable}
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
          className="h-full"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});
