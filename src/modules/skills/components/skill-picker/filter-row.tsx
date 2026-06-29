import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import i18n from '@/i18n';
import { ChevronDownIcon, FilterIcon, XIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  getSkillIconFilterDisplayId,
  groups_filters,
  SELF_DEBUFF_ICON_FILTER_KEY
} from '../../filters';
import { SkillIcon } from '../skill-list/skill-item/SkillIcon';
import {
  hasActiveSkillPickerFilters,
  type SkillPickerFilterGroup,
  useSkillPickerActions,
  useSkillPickerState,
  useSkillPickerStore
} from './store';
import { FilterState } from './types';

type FilterButtonProps = {
  id: string;
  checked: boolean;
  onChecked: () => void;
};

const FilterButton = ({ id, checked, onChecked }: FilterButtonProps) => {
  const inputId = `${useId()}-${id}`;

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={inputId}
        checked={checked}
        onChange={onChecked}
        className="peer sr-only"
      />
      <Label
        htmlFor={inputId}
        className={cn(
          'cursor-pointer rounded-md border px-2 py-1 text-xs leading-5 transition-colors',
          'border-border bg-background text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
          'peer-focus-visible:border-ring peer-focus-visible:ring-ring/40 peer-focus-visible:ring-[3px]',
          checked && 'border-primary/50 bg-muted text-foreground'
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

const IconFilterButton = (props: IconFilterButtonProps) => {
  const { type, group, filterState, onChecked } = props;
  const isActive = filterState[group][type];

  return (
    <Button
      type="button"
      data-filter={type}
      variant="ghost"
      size="icon"
      title={type === SELF_DEBUFF_ICON_FILTER_KEY ? i18n.t('skillfilters.selfdebuff') : undefined}
      className={cn(
        'size-8 rounded-md border border-border bg-background p-0 [&_img]:h-7 [&_img]:w-7',
        isActive
          ? 'border-primary/60 bg-muted opacity-100'
          : 'opacity-45 hover:opacity-80 hover:border-muted-foreground/30'
      )}
      onClick={onChecked}
    >
      <SkillIcon iconId={getSkillIconFilterDisplayId(type)} />
    </Button>
  );
};

const iconCategoryOrder = ['1', '2', '3', '4'] as const;

const filterGroups = {
  rarity: ['white', 'gold', 'unique', 'inherit'],
  strategy: ['nige', 'senkou', 'sasi', 'oikomi'],
  distance: ['short', 'mile', 'medium', 'long'],
  surface: ['turf', 'dirt'],
  location: ['phase0', 'phase1', 'phase2', 'phase3', 'finalcorner', 'finalstraight']
} as const;

function groupIconTypesByCategory() {
  const grouped: Record<string, Array<string>> = {};

  for (const iconType of groups_filters.icontype) {
    if (iconType === SELF_DEBUFF_ICON_FILTER_KEY) continue;
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

type SkillPickerFilterRowProps = {
  showUpcomingToggle?: boolean;
  onAfterClear?: () => void;
  hasAdditionalFilters?: boolean;
  hiddenFilterGroups?: ReadonlySet<SkillPickerFilterGroup>;
};

export const SkillPickerFilterRow = (props: SkillPickerFilterRowProps) => {
  const {
    showUpcomingToggle = true,
    onAfterClear,
    hasAdditionalFilters = false,
    hiddenFilterGroups
  } = props;
  const { filters: filterState } = useSkillPickerState();
  const { toggleIconType, setExclusiveFilter, clearFilters } = useSkillPickerActions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleExclusiveChecked = useCallback(
    (group: string, filter: string) => {
      setExclusiveFilter(group, filter);
    },
    [setExclusiveFilter]
  );

  const handleIconTypeChecked = useCallback(
    (filter: string) => {
      toggleIconType(filter);
    },
    [toggleIconType]
  );

  const isGroupHidden = useCallback(
    (group: SkillPickerFilterGroup) => hiddenFilterGroups?.has(group) ?? false,
    [hiddenFilterGroups]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;

    for (const [groupName, groupValues] of Object.entries(filterState)) {
      if (groupName === 'icontype' || isGroupHidden(groupName as SkillPickerFilterGroup)) {
        continue;
      }
      count += Object.values(groupValues).filter(Boolean).length;
    }

    return count;
  }, [filterState, isGroupHidden]);

  const pickerFiltersActive = useMemo(
    () => hasActiveSkillPickerFilters(filterState, hiddenFilterGroups),
    [filterState, hiddenFilterGroups]
  );

  const showClear = pickerFiltersActive || hasAdditionalFilters;

  const handleClearFilters = useCallback(() => {
    clearFilters();
    onAfterClear?.();
  }, [clearFilters, onAfterClear]);

  return (
    <div className="flex flex-col gap-2">
      {showClear ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={handleClearFilters}
          >
            <XIcon />
            Clear
          </Button>
        </div>
      ) : null}

      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between rounded-md"
          onClick={() => setMobileOpen((current) => !current)}
        >
          <span className="flex items-center gap-2 text-xs">
            <FilterIcon />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </span>
          <ChevronDownIcon
            className={cn('size-4 transition-transform', mobileOpen && 'rotate-180')}
          />
        </Button>
      </div>

      <div className={cn('flex-col gap-2', mobileOpen ? 'flex' : 'hidden', 'md:flex')}>
        {!isGroupHidden('rarity') || !isGroupHidden('strategy') ? (
          <div className="flex flex-col gap-2 md:flex-row">
            {!isGroupHidden('rarity') ? (
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
            ) : null}

            {!isGroupHidden('strategy') ? (
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
            ) : null}
          </div>
        ) : null}

        {!isGroupHidden('distance') || !isGroupHidden('surface') || !isGroupHidden('location') ? (
          <div className="flex flex-col gap-2 md:flex-row">
            {!isGroupHidden('distance') ? (
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
            ) : null}

            {!isGroupHidden('distance') && !isGroupHidden('surface') ? (
              <Separator orientation="vertical" className="hidden md:block" />
            ) : null}

            {!isGroupHidden('surface') ? (
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
            ) : null}

            {(!isGroupHidden('distance') || !isGroupHidden('surface')) &&
            !isGroupHidden('location') ? (
              <Separator orientation="vertical" className="hidden md:block" />
            ) : null}

            {!isGroupHidden('location') ? (
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
            ) : null}
          </div>
        ) : null}

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
                  {category === '2' ? (
                    <IconFilterButton
                      type={SELF_DEBUFF_ICON_FILTER_KEY}
                      group="icontype"
                      filterState={filterState}
                      onChecked={() => handleIconTypeChecked(SELF_DEBUFF_ICON_FILTER_KEY)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </FilterSection>

        {showUpcomingToggle ? (
          <div className="flex items-center justify-end">
            <SkillPickerUpcomingToggle />
          </div>
        ) : null}
      </div>
    </div>
  );
};

function SkillPickerUpcomingToggle() {
  const checkboxId = useId();
  const showUpcoming = useSkillPickerStore((state) => state.showUpcoming);
  const { setShowUpcoming } = useSkillPickerActions();

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={checkboxId}
        checked={showUpcoming}
        onCheckedChange={(checked) => setShowUpcoming(checked === true)}
      />
      <Label htmlFor={checkboxId} className="text-xs font-normal">
        Show upcoming
      </Label>
    </div>
  );
}
