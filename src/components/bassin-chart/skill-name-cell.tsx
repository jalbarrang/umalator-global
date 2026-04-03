import i18n from '@/i18n';
import { SkillComparisonRoundResult } from '@/modules/simulation/types';
import { CellContext } from '@tanstack/react-table';

import { getIconUrl } from '@/assets/icons';
import { getIconById } from '@/modules/data/icons';
import { Button } from '../ui/button';
import { CircleHelp } from 'lucide-react';
import { useMemo } from 'react';
import { SkillEntry, skillCollection } from '@/modules/data/skills';
import React from 'react';
import { umaForUniqueSkill } from '@/modules/data/umas';

/** `data-event` value on the skill details help control; must match delegated handler in BasinnChart. */
export const BASSIN_DATA_EVENT_TOGGLE_SKILL_DETAILS = 'toggle-skill-details';

type SkillNameTableCellProps = {
  id: string;
  displayedName: string;
  iconSrc: string | null;
  iconClassName: string;
};

const SkillNameTableCell = React.memo((props: SkillNameTableCellProps) => {
  const { id, displayedName, iconSrc, iconClassName } = props;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {iconSrc && <img src={iconSrc} className={iconClassName} />}

      <span className="truncate" title={displayedName}>
        {displayedName}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-6 w-6 shrink-0 text-muted-foreground"
        title="Show skill details"
        data-event={BASSIN_DATA_EVENT_TOGGLE_SKILL_DETAILS}
        data-skill-id={id}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});

type SkillNameCellProps = {
  showUmaIcons?: boolean;
  showSkillIds?: boolean;
  skillMetadataById: Map<string, SkillEntry>;
};

export const skillNameCell = ({
  showUmaIcons = false,
  showSkillIds = true,
}: SkillNameCellProps) => {
  return React.memo((props: CellContext<SkillComparisonRoundResult, unknown>) => {
    const id = props.getValue() as string;
    const skill = skillCollection[id];

    const translatedName = i18n.t(`skillnames.${id}`);

    const displayedName = useMemo(() => {
      return showSkillIds ? `${translatedName} (${id})` : translatedName;
    }, [id, translatedName]);

    const iconSrc = useMemo(() => {
      if (!skill) return { src: null, className: 'w-4 h-4' };

      if (showUmaIcons) {
        const umaId = umaForUniqueSkill(id);
        const umaIcon = umaId ? getIconById(umaId) : undefined;
        if (umaIcon) {
          return {
            src: umaIcon,
            className: 'w-8 h-8',
          };
        }
      }

      return {
        src: getIconUrl(`${skill.iconId}.png`),
        className: 'w-4 h-4',
      };
    }, [id, skill]);

    if (!skill) {
      return (
        <span className="truncate" title={displayedName}>
          {displayedName}
        </span>
      );
    }

    return (
      <SkillNameTableCell
        id={id}
        displayedName={displayedName}
        iconSrc={iconSrc.src}
        iconClassName={iconSrc.className}
      />
    );
  });
};
