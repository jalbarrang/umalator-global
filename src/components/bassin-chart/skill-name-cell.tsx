import i18n from '@/i18n';
import { SkillComparisonRoundResult } from '@/modules/simulation/types';
import { CellContext } from '@tanstack/react-table';

import icons from '@/modules/data/icons.json';
import { useUmas } from '@/modules/data/master-db.store';
import type { UmasMap } from '@/workers/db/storage';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { CircleHelp } from 'lucide-react';
import { ExpandedSkillDetails } from '@/modules/skills/components/ExpandedSkillDetails';
import { useMemo } from 'react';
import { SkillEntry } from '@/modules/data/skill-types';
import React from 'react';

type SkillNameTableCellProps = {
  id: string;
  skill: SkillEntry;
  displayedName: string;
  iconSrc: string | null;
  iconClassName: string;
  courseDistance?: number;
};

const SkillNameTableCell = (props: SkillNameTableCellProps) => {
  const { id, skill, displayedName, iconSrc, iconClassName, courseDistance } = props;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {iconSrc && <img src={iconSrc} className={iconClassName} />}

      <span className="truncate" title={displayedName}>
        {displayedName}
      </span>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0 text-muted-foreground"
              title="Show skill details"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <PopoverContent align="start" side="right" className="w-[420px] p-0">
          <ExpandedSkillDetails id={id} skill={skill} distanceFactor={courseDistance} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

type SkillNameCellProps = {
  showUmaIcons?: boolean;
  showSkillIds?: boolean;
  skillMetadataById: Map<string, SkillEntry>;
  courseDistance?: number;
};

export const skillNameCell = ({
  showUmaIcons = false,
  showSkillIds = true,
  skillMetadataById,
  courseDistance,
}: SkillNameCellProps) => {
  return React.memo((props: CellContext<SkillComparisonRoundResult, unknown>) => {
    const umas = useUmas();
    const id = props.getValue() as string;
    const skill = skillMetadataById.get(id);

    const translatedName = i18n.t(`skillnames.${id}`);

    const displayedName = useMemo(() => {
      return showSkillIds ? `${translatedName} (${id})` : translatedName;
    }, [id, translatedName]);

    const iconSrc = useMemo(() => {
      if (!skill) return { src: null, className: 'w-4 h-4' };
      if (showUmaIcons) {
        const umaId = umaForUniqueSkill(id, umas);
        if (umaId && icons[umaId as keyof typeof icons]) {
          return {
            src: icons[umaId as keyof typeof icons],
            className: 'w-8 h-8',
          };
        }
      }

      return {
        src: `/icons/${skill.iconId}.png`,
        className: 'w-4 h-4',
      };
    }, [id, skill, umas]);

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
        skill={skill}
        displayedName={displayedName}
        iconSrc={iconSrc.src}
        iconClassName={iconSrc.className}
        courseDistance={courseDistance}
      />
    );
  });
};

function umaForUniqueSkill(skillId: string, umas: UmasMap): string | null {
  const sid = parseInt(skillId);
  if (sid < 100000 || sid >= 200000) return null;

  const remainder = sid - 100001;
  if (remainder < 0) return null;

  const i = Math.floor(remainder / 10) % 1000;
  const v = Math.floor(remainder / 10 / 1000) + 1;

  const umaId = i.toString().padStart(3, '0');
  const baseUmaId = `1${umaId}`;
  const outfitId = `${baseUmaId}${v.toString().padStart(2, '0')}`;
  const uma = umas[baseUmaId];

  if (uma?.outfits[outfitId]) {
    return outfitId;
  }

  return null;
}
