import { useCallback, useMemo } from 'react';
import { Button } from '../../ui/button';
import { cn } from '@/lib/utils';
import {
  getSkillIconFilterImageUrl,
  groups_filters,
  skillMatchesIconTypeFilter
} from '@/modules/skills/filters';
import { iconIdPrefixes } from '@/modules/skills/icons';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import React from 'react';

export type IconTypeFilterKey = keyof typeof iconIdPrefixes | 'selfdebuff';

type IconTypeFilterButtonProps = {
  iconType: IconTypeFilterKey;
  iconTypeFilters: Record<IconTypeFilterKey, boolean>;
  onToggle: (iconType: IconTypeFilterKey) => void;
};

const IconTypeFilterButton = React.memo((props: IconTypeFilterButtonProps) => {
  const { iconType, iconTypeFilters, onToggle } = props;

  const toggleIconTypeFilter = useCallback(() => {
    onToggle(iconType as IconTypeFilterKey);
  }, [iconType, onToggle]);

  const classNameObject = useMemo(() => {
    return cn('border rounded-none', {
      'border-primary': iconTypeFilters[iconType as IconTypeFilterKey]
    });
  }, [iconTypeFilters, iconType]);

  const imgSrc = useMemo(() => {
    return getSkillIconFilterImageUrl(iconType);
  }, [iconType]);

  return (
    <Button
      key={iconType}
      variant="ghost"
      size="icon"
      className={classNameObject}
      onClick={toggleIconTypeFilter}
      title={`Filter by icon type ${iconType}`}
    >
      <img src={imgSrc} alt="" className="size-6" />
    </Button>
  );
});

type IconTypeFilterBarProps = {
  iconTypeFilters: Record<IconTypeFilterKey, boolean>;
  onToggle: (iconType: IconTypeFilterKey) => void;
};

export const IconTypeFilterBar = React.memo((props: IconTypeFilterBarProps) => {
  const { iconTypeFilters, onToggle } = props;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups_filters.icontype.map((iconType) => (
        <IconTypeFilterButton
          key={iconType}
          iconType={iconType as IconTypeFilterKey}
          iconTypeFilters={iconTypeFilters}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});

export function useIconTypeFilter<T extends { id: string }>(
  data: Array<T>,
  skillMetadataById: Map<string, SkillEntry>
) {
  const [iconTypeFilters, setIconTypeFilters] = React.useState<Record<IconTypeFilterKey, boolean>>(
    () => {
      const initialState = {} as Record<IconTypeFilterKey, boolean>;

      for (const iconType of groups_filters.icontype) {
        initialState[iconType as IconTypeFilterKey] = true;
      }

      return initialState;
    }
  );

  const activeIconTypeFilters = useMemo(() => {
    return groups_filters.icontype.filter(
      (iconType) => iconTypeFilters[iconType as IconTypeFilterKey]
    );
  }, [iconTypeFilters]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const skill = skillMetadataById.get(row.id);
      if (!skill) return true;

      return activeIconTypeFilters.some((iconType) => skillMatchesIconTypeFilter(skill, iconType));
    });
  }, [activeIconTypeFilters, data, skillMetadataById]);

  const handleToggleIconTypeFilter = useCallback((iconType: IconTypeFilterKey) => {
    setIconTypeFilters((prev) => {
      const allActive = groups_filters.icontype.every(
        (filter) => prev[filter as IconTypeFilterKey]
      );

      if (allActive) {
        const nextState = {} as Record<IconTypeFilterKey, boolean>;
        for (const filter of groups_filters.icontype) {
          nextState[filter as IconTypeFilterKey] = filter === iconType;
        }
        return nextState;
      }

      const toggledState = {
        ...prev,
        [iconType]: !prev[iconType]
      };

      const anyActive = groups_filters.icontype.some(
        (filter) => toggledState[filter as IconTypeFilterKey]
      );

      if (!anyActive) {
        for (const filter of groups_filters.icontype) {
          toggledState[filter as IconTypeFilterKey] = true;
        }
      }

      return toggledState;
    });
  }, []);

  return {
    iconTypeFilters,
    activeIconTypeFilters,
    filteredData,
    handleToggleIconTypeFilter
  };
}
