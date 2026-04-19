import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import i18n from '@/i18n';
import { ChevronDownIcon, FilterIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { SkillIcon } from '../skill-list/skill-item';
import { groups_filters } from '../../filters';
import { useSkillPickerActions, useSkillPickerState } from './store';
import { FilterState } from './types';

type FilterButtonProps = {
  id: string;
  checked: boolean;
  onChecked: () => void;
};

const FilterButton = ({ id, checked, onChecked }: FilterButtonProps) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChecked}
        className="peer sr-only"
      />
      <Label
        htmlFor={id}
        className={cn(
          'cursor-pointer rounded-md border px-2 py-1 text-xs leading-5 transition-colors',
          'border-border bg-background text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
          'peer-focus-visible:border-ring peer-focus-visible:ring-ring/40 peer-focus-visible:ring-[3px]',
          checked && 'border-primary/50 bg-muted text-foreground',
        )}
      >
        {i18n.t(`skillfilters.${id}`)}
      </Label>
    </div>
  );
};

type IconFilterButtonProps = {
  type: string;
  group: string;
  filterState: FilterState;
  onChecked: () => void;
};

const IconFilterButton = ({ type, group, filterState, onChecked }: IconFilterButtonProps) => {
  const isActive = filterState[group][type];

  return (
    <Button
      type="button"
      data-filter={type}
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 rounded-md border border-border bg-background p-0 [&_img]:h-7 [&_img]:w-7',
        isActive
          ? 'border-primary/60 bg-muted opacity-100'
          : 'opacity-45 hover:opacity-80 hover:border-muted-foreground/30',
      )}
      onClick={onChecked}
    >
      <SkillIcon iconId={`${type}1`} />
    </Button>
  );
};

const iconCategoryOrder = ['1', '2', '3', '4'] as const;

const filterGroups = {
  rarity: ['white', 'gold', 'unique', 'inherit'],
  strategy: ['nige', 'senkou', 'sasi', 'oikomi'],
  distance: ['short', 'mile', 'medium', 'long'],
  surface: ['turf', 'dirt'],
  location: ['phase0', 'phase1', 'phase2', 'phase3', 'finalcorner', 'finalstraight'],
} as const;

function groupIconTypesByCategory() {
  const grouped: Record<string, Array<string>> = {};

  for (const iconType of groups_filters.icontype) {
    const category = iconType[0];
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(iconType);
  }

  return grouped;
}

const iconTypesByCategory = groupIconTypesByCategory();

type FilterSectionProps = {
  title: string;
  children: React.ReactNode;
};

const FilterSection = ({ title, children }: FilterSectionProps) => {
  return (
    <section className="min-w-0">
      <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
};

export const SkillPickerFilterRow = () => {
  const { filters: filterState } = useSkillPickerState();
  const { toggleIconType, setExclusiveFilter } = useSkillPickerActions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleExclusiveChecked = useCallback(
    (group: string, filter: string) => {
      setExclusiveFilter(group, filter);
    },
    [setExclusiveFilter],
  );

  const handleIconTypeChecked = useCallback(
    (filter: string) => {
      toggleIconType(filter);
    },
    [toggleIconType],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;

    for (const [groupName, groupValues] of Object.entries(filterState)) {
      if (groupName === 'icontype') continue;
      count += Object.values(groupValues).filter(Boolean).length;
    }

    return count;
  }, [filterState]);

  return (
    <div className="flex flex-col gap-2">
      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between rounded-md"
          onClick={() => setMobileOpen((current) => !current)}
        >
          <span className="flex items-center gap-2 text-xs">
            <FilterIcon className="h-3.5 w-3.5" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </span>
          <ChevronDownIcon
            className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-180')}
          />
        </Button>
      </div>

      <div className={cn('flex-col gap-2', mobileOpen ? 'flex' : 'hidden', 'md:flex')}>
        <div className="flex flex-col gap-2 md:flex-row">
          <FilterSection title="Rarity">
            {filterGroups.rarity.map((filter) => (
              <FilterButton
                key={filter}
                id={filter}
                checked={filterState.rarity[filter]}
                onChecked={() => handleExclusiveChecked('rarity', filter)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Strategy">
            {filterGroups.strategy.map((filter) => (
              <FilterButton
                key={filter}
                id={filter}
                checked={filterState.strategy[filter]}
                onChecked={() => handleExclusiveChecked('strategy', filter)}
              />
            ))}
          </FilterSection>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <FilterSection title="Distance">
            {filterGroups.distance.map((filter) => (
              <FilterButton
                key={filter}
                id={filter}
                checked={filterState.distance[filter]}
                onChecked={() => handleExclusiveChecked('distance', filter)}
              />
            ))}
          </FilterSection>

          <Separator orientation="vertical" className="hidden md:block" />

          <FilterSection title="Surface">
            {filterGroups.surface.map((filter) => (
              <FilterButton
                key={filter}
                id={filter}
                checked={filterState.surface[filter]}
                onChecked={() => handleExclusiveChecked('surface', filter)}
              />
            ))}
          </FilterSection>

          <Separator orientation="vertical" className="hidden md:block" />

          <FilterSection title="Location">
            {filterGroups.location.map((filter) => (
              <FilterButton
                key={filter}
                id={filter}
                checked={filterState.location[filter]}
                onChecked={() => handleExclusiveChecked('location', filter)}
              />
            ))}
          </FilterSection>
        </div>

        <FilterSection title="Effect type">
          <div className="flex flex-wrap gap-1">
            {iconCategoryOrder.map((category) => {
              const types = iconTypesByCategory[category];
              if (!types) return null;

              return (
                <div key={category} className="flex flex-wrap gap-1">
                  {types.map((type) => (
                    <IconFilterButton
                      key={type}
                      type={type}
                      group="icontype"
                      filterState={filterState}
                      onChecked={() => handleIconTypeChecked(type)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </FilterSection>
      </div>
    </div>
  );
};
