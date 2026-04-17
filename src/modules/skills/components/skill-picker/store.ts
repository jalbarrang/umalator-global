import { createContext, useContext, useMemo } from 'react';
import { createStore, useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { groups_filters } from '../../filters';
import { FilterGroup, FilterState } from './types';
import { SkillQuery } from '../../query';
import { matchRarity } from '../../utils';
import { iconIdPrefixes } from '../../icons';
import { SkillEntry } from '@/modules/data/skills';

type ISkillPickerState = {
  filters: FilterState;
  groups: typeof groups_filters;
};

type ISkillPickerActions = {
  clearFilters: () => void;
  toggleIconType: (filter: string) => void;
  setExclusiveFilter: (group: string, filter: string) => void;
};

type ISkillPickerStore = ISkillPickerState & {
  actions: ISkillPickerActions;
};

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

export const getActiveFilters = (filterState: FilterState, group: string): Array<string> => {
  return groups_filters[group as FilterGroup].filter((f) => filterState[group][f]);
};

export const createSkillPickerStore = () => {
  return createStore<ISkillPickerStore>()((set, get) => {
    return {
      filters: createInitialFilterState(),
      groups: groups_filters,
      actions: {
        clearFilters: () => {
          set({ filters: createInitialFilterState() });
        },
        toggleIconType: (filter: string) => {
          const { filters } = get();
          const iconFilters = filters.icontype;
          const allActive = groups_filters.icontype.every((f) => iconFilters[f]);

          if (allActive) {
            // If all are active, clicking one makes it exclusive (deselects others)
            const newIconFilters: Record<string, boolean> = {};

            groups_filters.icontype.forEach((f) => {
              newIconFilters[f] = f === filter;
            });

            set({ filters: { ...filters, icontype: newIconFilters } });
            return;
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

          set({ filters: { ...filters, icontype: newIconFilters } });
        },

        setExclusiveFilter: (group: string, filter: string) => {
          const { filters } = get();
          const groupFilters = filters[group];

          // If the filter is already active, deactivate it (toggle off)
          // Otherwise, make it the only active one
          const newGroupFilters: Record<string, boolean> = {};
          Object.keys(groupFilters).forEach((f) => {
            newGroupFilters[f] = !groupFilters[filter] && f === filter;
          });

          set({ filters: { ...filters, [group]: newGroupFilters } });
        },
      },
    };
  });
};

export type ISkillPickerStoreApi = ReturnType<typeof createSkillPickerStore>;
export const SkillPickerStoreContext = createContext<ISkillPickerStoreApi | null>(null);

export const useSkillPickerStore = <T>(selector: (store: ISkillPickerStore) => T): T => {
  const store = useContext(SkillPickerStoreContext);

  if (!store) {
    throw new Error('useSkillPickerStore must be used within SkillPickerStoreProvider');
  }

  return useStore(store, selector);
};

export const useSkillPickerState = () => {
  return useSkillPickerStore(
    useShallow((state) => {
      return {
        filters: state.filters,
        groups: state.groups,
      };
    }),
  );
};

export const useSkillPickerActions = () => {
  return useSkillPickerStore(useShallow((state) => state.actions));
};

type IconIdPrefix = keyof typeof iconIdPrefixes;

export const useFilteredSkills = (deferredSearchText: string, skills: Array<SkillEntry>) => {
  const filters = useSkillPickerStore((state) => state.filters);

  return useMemo(() => {
    const activeRarities = getActiveFilters(filters, 'rarity');
    const activeIconTypes = getActiveFilters(filters, 'icontype');
    const activeStrategies = getActiveFilters(filters, 'strategy');
    const activeDistances = getActiveFilters(filters, 'distance');
    const activeSurfaces = getActiveFilters(filters, 'surface');
    const activeLocations = getActiveFilters(filters, 'location');

    return SkillQuery.from(skills)
      .whereValid()
      .whereText(deferredSearchText)
      .whereAny(activeRarities, (skill, r) => matchRarity(skill.id, r))
      .whereAny(activeIconTypes, (skill, iconKey) =>
        iconIdPrefixes[iconKey as IconIdPrefix]?.some((p) => skill.iconId.startsWith(p)),
      )
      .whereConditionMatch(activeStrategies)
      .whereConditionMatch(activeDistances)
      .whereConditionMatch(activeSurfaces)
      .whereConditionMatch(activeLocations)
      .execute();
  }, [deferredSearchText, filters, skills]);
};

export const useSelectedOtherFiltersCount = () => {
  return useSkillPickerStore(
    useShallow((state) => {
      let count = 0;

      for (const [groupName, groupValues] of Object.entries(state.filters)) {
        for (const filterValue of Object.values(groupValues)) {
          if (filterValue && groupName !== 'icontype') count++;
        }
      }

      return count;
    }),
  );
};
