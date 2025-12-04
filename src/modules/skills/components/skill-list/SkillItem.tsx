import { getSkillDataById, getSkillMetaById } from '@/modules/skills/utils';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Activity, memo, useMemo, useState } from 'react';
import { ExpandedSkillDetails } from '../ExpandedSkillDetails';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const isWhiteSkill = (skillRarity: number) => {
  return skillRarity === 1;
};

const isGoldSkill = (skillRarity: number) => {
  return skillRarity === 2;
};

const isUniqueSkill = (skillRarity: number) => {
  return [3, 4, 5].includes(skillRarity);
};

const isEvolutionSkill = (skillRarity: number) => {
  return skillRarity === 6;
};

export const SkillIcon = (props) => {
  return <img className="w-6 h-6" src={`/icons/${props.iconId}.png`} />;
};

type SkillItemProps = {
  skillId: string;
  selected?: boolean;
  dismissable?: boolean;
  withDetails?: boolean;
  distanceFactor?: number;
  forcedPosition?: number;
  onPositionChange?: (position: number) => void;
  itemProps?: {
    className?: string;
  };
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
          props.itemProps?.className,
          {
            selected: selected,
          },
        )}
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
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'rounded-md bg-background border-2 flex h-[44px]',
          props.itemProps?.className,
          {
            selected: selected,
            'rounded-b-none': expanded,
          },
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
