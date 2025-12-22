import { Activity, memo, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ExpandedSkillDetails } from '../ExpandedSkillDetails';
import { getSkillDataById, getSkillMetaById } from '@/modules/skills/utils';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
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
  forcedPosition?: number;
  onPositionChange?: (position: string | undefined) => void;
};

export const SkillItem = memo((props: SkillItemProps) => {
  const {
    skillId,
    selected = false,
    dismissable = false,
    withDetails = false,
    distanceFactor = 0,
    forcedPosition = 0,
    onPositionChange = () => {},
  } = props;

  const [expanded, setExpanded] = useState(false);

  const skillData = useMemo(() => getSkillDataById(skillId), [skillId]);
  const skillMeta = useMemo(() => getSkillMetaById(skillId), [skillId]);

  const skillContext = useMemo(
    () => ({
      id: skillId.split('-')[0],
      rarity: skillData?.rarity ?? 0,
      iconId: skillMeta?.iconId,
    }),
    [skillId, skillData, skillMeta],
  );

  if (!withDetails) {
    return (
      <div
        className={cn(
          'rounded-md bg-background border-2 flex h-[44px]',
          {
            selected: selected,
          },
          props.className,
        )}
        style={props.style}
        data-event="select-skill"
        data-skillid={skillId}
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
      className={cn({
        'max-h-[44px]': !expanded,
      })}
      style={props.style}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'rounded-md bg-background border-2 flex h-[44px]',
          {
            selected: selected,
            'rounded-b-none': expanded,
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

      <Activity mode={expanded ? 'visible' : 'hidden'}>
        <ExpandedSkillDetails
          id={skillId}
          skillData={skillData}
          dismissable={dismissable}
          distanceFactor={distanceFactor}
          forcedPosition={forcedPosition}
          onPositionChange={onPositionChange}
        />
      </Activity>
    </div>
  );
});
