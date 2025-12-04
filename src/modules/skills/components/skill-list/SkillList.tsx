import { useDeferredValue, useReducer, useRef, useState } from 'react';

import './SkillList.css';

import {
  getAllSkills,
  getUniqueSkillForByUmaId,
  matchRarity,
} from '@/modules/skills/utils';
import { SkillIcon, SkillItem } from './SkillItem';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { SkillQuery } from '@/modules/skills/query';
import { iconIdPrefixes } from '@/modules/skills/icons';
import { groups_filters } from '@/modules/skills/filters';
import { useSkillModalStore } from '@/modules/skills/store';

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
        'border-primary': filterState[group][type],
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
      <Checkbox
        id={filter}
        checked={filterState[group][filter]}
        onCheckedChange={onChecked}
      />
      <Label htmlFor={filter}>{i18n.t(`skillfilters.${filter}`)}</Label>
    </div>
  );
};

type FilterState = Record<string, Record<string, boolean>>;

type FilterAction =
  | { type: 'TOGGLE_ICON_TYPE'; filter: string }
  | { type: 'SET_EXCLUSIVE_FILTER'; group: string; filter: string };

function createInitialFilterState(): FilterState {
  const state: FilterState = {};
  Object.keys(groups_filters).forEach((group) => {
    state[group] = {};
    groups_filters[group].forEach((filter) => {
      state[group][filter] = group === 'icontype';
    });
  });

  return state;
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
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

const getActiveFilters = (filterState: FilterState, group: string): string[] =>
  groups_filters[group].filter((f) => filterState[group][f]);

export function SkillPickerModal() {
  const { open, umaId, options, currentSkills, onSelect } =
    useSkillModalStore();

  const umaUniqueSkillId = getUniqueSkillForByUmaId(umaId);

  const searchRef = useRef<HTMLInputElement>(null);
  const skillsContainerRef = useRef<HTMLDivElement>(null);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);

  const [filterState, dispatch] = useReducer(
    filterReducer,
    null,
    createInitialFilterState,
  );

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
        iconIdPrefixes[iconKey]?.some((p) => skill.meta.iconId.startsWith(p)),
      )
      .whereConditionMatch(activeStrategies)
      .whereConditionMatch(activeDistances)
      .whereConditionMatch(activeSurfaces)
      .whereConditionMatch(activeLocations)
      .execute();
  })();

  // Create a lookup map from skill ID to Skill object
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

  // Build selected map using the pre-built lookup
  const selectedMap = (() => {
    const selected: [string, string][] = [];

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
    const skill = skills.find((skill) => skill.id === id);
    if (!skill) return;

    const groupId = skill.meta.groupId;
    const newSelected = new Set(currentSkills);

    // Remove skill from same group if exists (for non-debuffs)
    if (selectedMap.has(groupId)) {
      newSelected.delete(selectedMap.get(groupId));
    } else if (skill.meta.iconId.startsWith('3')) {
      // For debuffs, find the next available suffix
      let count = 0;

      for (const selectedId of newSelected) {
        if (selectedId.split('-')[0] === id) {
          count++;
        }
      }

      id = count > 0 ? `${id}-${count}` : id;
    }

    newSelected.add(id);
    onSelect(Array.from(newSelected));
  };

  const handleRarityChecked = (filter: string) => {
    dispatch({ type: 'SET_EXCLUSIVE_FILTER', group: 'rarity', filter });
  };

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
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
    const eventElement = target.closest(
      '[data-event="remove-skill"]',
    ) as HTMLElement;
    if (!eventElement) return;

    const skillId = eventElement.dataset.skillid;
    if (!skillId) return;

    const newSkills = currentSkills.filter((id) => id !== skillId);
    onSelect(newSkills);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col gap-4 w-[80vw] sm:max-w-[80vw] h-[90dvh]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();

          searchRef.current?.focus();
          searchRef.current?.select();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Skill to Runner</DialogTitle>
        </DialogHeader>

        {currentSkills.length > 0 && (
          <div className="flex flex-col gap-2 border-b pb-4 shrink-0 max-h-[30vh] overflow-y-auto">
            <div className="text-sm font-bold">Current Skills</div>
            <div className="flex flex-wrap gap-2" onClick={handleRemoveSkill}>
              {currentSkills.map((skillId) => (
                <SkillItem
                  key={skillId}
                  skillId={skillId}
                  dismissable={skillId !== umaUniqueSkillId}
                  itemProps={{ className: 'cursor-pointer' }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 overflow-y-auto">
            <div data-filter-group="search">
              <Input
                ref={searchRef}
                type="text"
                className="filterSearch"
                value={searchText}
                placeholder="Search"
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

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
                  <div className="text-sm font-bold">Rarity</div>
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
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-bold">Style</div>
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
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-bold">Distance</div>
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
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-bold">Surface</div>
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

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-bold">Phase</div>
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
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto" ref={skillsContainerRef}>
            <div
              className="grid grid-cols-2 gap-2 p-2"
              onClick={toggleSelected}
            >
              {filteredSkills.map((skill) => (
                <SkillItem
                  key={skill.id}
                  skillId={skill.id}
                  selected={selectedMap.get(skill.meta.groupId) === skill.id}
                  itemProps={{
                    className: 'cursor-pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
