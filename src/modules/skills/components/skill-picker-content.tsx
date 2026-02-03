import { SearchIcon, XIcon } from 'lucide-react';
import {
  useDeferredValue,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { SkillIcon, SkillItem } from './skill-list/SkillItem';
import { VirtualizedSkillGrid } from './VirtualizedSkillGrid';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { groups_filters } from '@/modules/skills/filters';
import { iconIdPrefixes } from '@/modules/skills/icons';
import { SkillQuery } from '@/modules/skills/query';
import { getAllSkills, getUniqueSkillForByUmaId, matchRarity } from '@/modules/skills/utils';

type IconFilterButtonProps = {
  type: string;
  group: string;
  filterState: FilterState;
  onChecked: () => void;
};

const IconFilterButton = (props: IconFilterButtonProps) => {
  const { type, group, filterState } = props;

  return (
    <Button
      data-filter={type}
      className={cn({
        'border-primary border': filterState[group][type],
      })}
      variant="ghost"
      size="icon"
      onClick={() => props.onChecked()}
    >
      <SkillIcon iconId={`${type}1`} />
    </Button>
  );
};

type FilterButtonProps = {
  group: string;
  filter: string;
  filterState: FilterState;
  onChecked: () => void;
};

const FilterButton = (props: FilterButtonProps) => {
  const { group, filter, filterState, onChecked } = props;

  return (
    <div className="flex items-center gap-3">
      <Checkbox id={filter} checked={filterState[group][filter]} onCheckedChange={onChecked} />
      <Label htmlFor={filter}>{i18n.t(`skillfilters.${filter}`)}</Label>
    </div>
  );
};

type FilterState = Record<string, Record<string, boolean>>;
type FilterGroup = keyof typeof groups_filters;

type FilterAction =
  | { type: 'TOGGLE_ICON_TYPE'; filter: string }
  | { type: 'SET_EXCLUSIVE_FILTER'; group: string; filter: string }
  | { type: 'CLEAR_FILTERS' };

function createInitialFilterState(): FilterState {
  const state: FilterState = {};
  const groupKeys = Object.keys(groups_filters) as Array<FilterGroup>;

  for (const group of groupKeys) {
    state[group] = {};

    for (const filter of groups_filters[group]) {
      state[group][filter] = group === 'icontype';
    }
  }

  return state;
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'CLEAR_FILTERS': {
      return createInitialFilterState();
    }

    case 'TOGGLE_ICON_TYPE': {
      const { filter } = action;
      const iconFilters = state.icontype;
      const allActive = groups_filters.icontype.every((f) => iconFilters[f]);

      if (allActive) {
        // If all are active, clicking one makes it exclusive (deselects others)
        const newIconFilters: Record<string, boolean> = {};

        groups_filters.icontype.forEach((f) => {
          newIconFilters[f] = f === filter;
        });

        return { ...state, icontype: newIconFilters };
      }

      // Toggle the clicked filter
      const newValue = !iconFilters[filter];
      const newIconFilters = { ...iconFilters, [filter]: newValue };

      // Check if none would be active after toggle
      const anyActive = groups_filters.icontype.some((f) => newIconFilters[f]);
      if (!anyActive) {
        // Re-enable all if none would be active
        groups_filters.icontype.forEach((f) => {
          newIconFilters[f] = true;
        });
      }

      return { ...state, icontype: newIconFilters };
    }

    case 'SET_EXCLUSIVE_FILTER': {
      const { group, filter } = action;
      const groupFilters = state[group];

      // If the filter is already active, deactivate it (toggle off)
      // Otherwise, make it the only active one
      const newGroupFilters: Record<string, boolean> = {};
      Object.keys(groupFilters).forEach((f) => {
        newGroupFilters[f] = !groupFilters[filter] && f === filter;
      });

      return { ...state, [group]: newGroupFilters };
    }

    default:
      return state;
  }
}

const getActiveFilters = (filterState: FilterState, group: string): Array<string> => {
  return groups_filters[group as FilterGroup].filter((f) => filterState[group][f]);
};

type IconIdPrefix = keyof typeof iconIdPrefixes;

export type SkillPickerContentProps = {
  ref: React.RefObject<{ focus: () => void } | null>;
  umaId: string | undefined;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  className?: string;
  hideSelected?: boolean;
  isMobile?: boolean;
};

export function SkillPickerContent(props: SkillPickerContentProps) {
  const {
    ref,
    umaId,
    options,
    currentSkills,
    onSelect,
    className,
    hideSelected = false,
    isMobile = false,
  } = props;

  const umaUniqueSkillId = umaId ? getUniqueSkillForByUmaId(umaId) : undefined;

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);

  const [filterState, dispatch] = useReducer(filterReducer, null, createInitialFilterState);

  const skills = getAllSkills().filter((skill) => options.includes(skill.id));

  const filteredSkills = (() => {
    const activeRarities = getActiveFilters(filterState, 'rarity');
    const activeIconTypes = getActiveFilters(filterState, 'icontype');
    const activeStrategies = getActiveFilters(filterState, 'strategy');
    const activeDistances = getActiveFilters(filterState, 'distance');
    const activeSurfaces = getActiveFilters(filterState, 'surface');
    const activeLocations = getActiveFilters(filterState, 'location');

    return SkillQuery.from(skills)
      .whereValid()
      .whereText(deferredSearchText)
      .whereAny(activeRarities, (skill, r) => matchRarity(skill.id, r))
      .whereAny(activeIconTypes, (skill, iconKey) =>
        iconIdPrefixes[iconKey as IconIdPrefix]?.some((p) => skill.meta.iconId.startsWith(p)),
      )
      .whereConditionMatch(activeStrategies)
      .whereConditionMatch(activeDistances)
      .whereConditionMatch(activeSurfaces)
      .whereConditionMatch(activeLocations)
      .execute();
  })();

  const selectedOtherFiltersCount = useMemo(() => {
    let count = 0;

    for (const [groupName, groupValues] of Object.entries(filterState)) {
      for (const filterValue of Object.values(groupValues)) {
        if (filterValue && groupName !== 'icontype') count++;
      }
    }

    return count;
  }, [filterState]);

  const handleClearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
    setSearchText('');
    searchRef.current?.focus();
    searchRef.current?.select();
  };

  // Create a lookup map from skill ID to Skill object
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

  // Build selected map using the pre-built lookup
  const selectedMap = (() => {
    const selected: Array<[string, string]> = [];

    for (const id of currentSkills) {
      // Use the pre-built map for O(1) lookup
      const skill = skillsById.get(id.split('-')[0]); // Handle debuff suffixes like "123456-1"
      if (!skill?.meta) continue;

      // Skip debuffs - they can be selected multiple times
      if (skill.meta.iconId.startsWith('3')) continue;

      selected.push([skill.meta.groupId, id]);
    }

    return new Map(selected);
  })();

  const toggleSelected: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    const eventElement = target.closest('[data-event]') as HTMLElement;
    if (!eventElement) return;

    const eventType = eventElement.dataset.event;
    if (!eventType) return;

    if (eventType !== 'select-skill') return;

    let id = eventElement.dataset.skillid;
    const skill = skills.find((skillItem) => skillItem.id === id);
    if (!skill) return;

    const groupId = skill.meta.groupId;
    const newSelected = new Set(currentSkills);

    // Remove skill from same group if exists (for non-debuffs)
    const selectedId = selectedMap.get(groupId);
    if (selectedId) {
      newSelected.delete(selectedId);
    } else if (skill.meta.iconId.startsWith('3')) {
      // For debuffs, find the next available suffix
      let count = 0;

      for (const newSelectedId of newSelected) {
        if (newSelectedId.split('-')[0] === id) {
          count++;
        }
      }

      id = count > 0 ? `${id}-${count}` : id;
    }

    if (id) {
      newSelected.add(id);
    }

    onSelect(Array.from(newSelected));
  };

  const handleRarityChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'rarity', filter });
  };

  const handleIconTypeChecked = (filter: string) => {
    dispatch({ type: 'TOGGLE_ICON_TYPE', filter });
  };

  const handleStrategyChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'strategy', filter });
  };

  const handleDistanceChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'distance', filter });
  };

  const handleSurfaceChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'surface', filter });
  };

  const handleLocationChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'location', filter });
  };

  const handleRemoveSkill: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement;
    const eventElement = target.closest('[data-event="remove-skill"]') as HTMLElement;
    if (!eventElement) return;

    const skillId = eventElement.dataset.skillid;
    if (!skillId) return;

    const newSkills = currentSkills.filter((id) => id !== skillId);
    onSelect(newSkills);
  };

  useHotkeys('f', (event) => {
    event.preventDefault();

    searchRef.current?.focus();
    searchRef.current?.select();
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
    }),
    [searchRef],
  );

  return (
    <div className={cn('flex flex-col gap-3', isMobile ? '' : 'overflow-hidden h-full', className)}>
      <div data-filter-group="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="w-4 h-4" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="text"
            value={searchText}
            placeholder="Search skill by name"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="border p-1 rounded-md text-foreground">
              <kbd>f</kbd>
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {groups_filters['icontype'].map((iconType) => (
              <IconFilterButton
                key={iconType}
                type={iconType}
                filterState={filterState}
                group="icontype"
                onChecked={() => handleIconTypeChecked(iconType)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <FilterButton
                filter="white"
                filterState={filterState}
                group="rarity"
                onChecked={() => handleRarityChecked('white')}
              />
              <FilterButton
                filter="gold"
                filterState={filterState}
                group="rarity"
                onChecked={() => handleRarityChecked('gold')}
              />
              <FilterButton
                key="skill-pink"
                filter="pink"
                filterState={filterState}
                group="rarity"
                onChecked={() => handleRarityChecked('pink')}
              />
              <FilterButton
                key="skill-unique"
                filter="unique"
                filterState={filterState}
                group="rarity"
                onChecked={() => handleRarityChecked('unique')}
              />
              <FilterButton
                key="skill-inherit"
                filter="inherit"
                filterState={filterState}
                group="rarity"
                onChecked={() => handleRarityChecked('inherit')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FilterButton
                filter="nige"
                filterState={filterState}
                group="strategy"
                onChecked={() => handleStrategyChecked('nige')}
              />

              <FilterButton
                filter="senkou"
                filterState={filterState}
                group="strategy"
                onChecked={() => handleStrategyChecked('senkou')}
              />

              <FilterButton
                filter="sasi"
                filterState={filterState}
                group="strategy"
                onChecked={() => handleStrategyChecked('sasi')}
              />

              <FilterButton
                filter="oikomi"
                filterState={filterState}
                group="strategy"
                onChecked={() => handleStrategyChecked('oikomi')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FilterButton
                filter="short"
                filterState={filterState}
                group="distance"
                onChecked={() => handleDistanceChecked('short')}
              />

              <FilterButton
                filter="mile"
                filterState={filterState}
                group="distance"
                onChecked={() => handleDistanceChecked('mile')}
              />

              <FilterButton
                filter="medium"
                filterState={filterState}
                group="distance"
                onChecked={() => handleDistanceChecked('medium')}
              />
              <FilterButton
                filter="long"
                filterState={filterState}
                group="distance"
                onChecked={() => handleDistanceChecked('long')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FilterButton
                filter="phase0"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('phase0')}
              />

              <FilterButton
                filter="phase1"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('phase1')}
              />

              <FilterButton
                filter="phase2"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('phase2')}
              />

              <FilterButton
                filter="phase3"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('phase3')}
              />

              <FilterButton
                filter="finalcorner"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('finalcorner')}
              />

              <FilterButton
                filter="finalstraight"
                filterState={filterState}
                group="location"
                onChecked={() => handleLocationChecked('finalstraight')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FilterButton
                filter="turf"
                filterState={filterState}
                group="surface"
                onChecked={() => handleSurfaceChecked('turf')}
              />

              <FilterButton
                filter="dirt"
                filterState={filterState}
                group="surface"
                onChecked={() => handleSurfaceChecked('dirt')}
              />
            </div>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedOtherFiltersCount === 0}
              onClick={handleClearFilters}
            >
              <XIcon className="w-4 h-4" />
              Clear Filters
              {selectedOtherFiltersCount > 0 && (
                <span className="text-xs text-gray-500">({selectedOtherFiltersCount})</span>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {!hideSelected && isMobile && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">Skills selected</span>
                  <span className="text-xs text-muted-foreground">({currentSkills.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={handleRemoveSkill}>
                  {currentSkills.map((skillId) => (
                    <SkillItem
                      key={skillId}
                      skillId={skillId}
                      dismissable={skillId !== umaUniqueSkillId}
                      className="cursor-pointer"
                    />
                  ))}
                </div>
              </div>

              <Separator className="my-2" />
            </>
          )}

          <div className={cn('flex flex-col gap-2', isMobile ? 'h-[400px]' : 'flex-1 min-h-0')}>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold">Skills available</span>
              <span className="text-xs text-muted-foreground">({filteredSkills.length})</span>
            </div>

            <VirtualizedSkillGrid
              items={filteredSkills}
              selectedMap={selectedMap}
              onClick={toggleSelected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
