import { cn } from '@/lib/utils';
import { SkillIcon } from '../skill-list/skill-item';
import { Button } from '@/components/ui/button';
import { FilterState } from './types';
import { Label } from '@/components/ui/label';
import i18n from '@/i18n';
import { XIcon } from 'lucide-react';
import { useSelectedOtherFiltersCount, useSkillPickerActions, useSkillPickerState } from './store';
import { useCallback, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type FilterButtonProps = {
  group: string;
  filter: string;
};

const FilterButton = (props: FilterButtonProps) => {
  const { group, filter } = props;

  return (
    <ToggleGroupItem value={`${group}|${filter}`}>
      <Label htmlFor={filter}>{i18n.t(`skillfilters.${filter}`)}</Label>
    </ToggleGroupItem>
  );
};

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

export const SkillPickerFilterRow = () => {
  const { filters: filterState, groups: groups_filters } = useSkillPickerState();

  const { toggleIconType, setExclusiveFilter, clearFilters } = useSkillPickerActions();

  const handleRarityChecked = useCallback(
    (filter: string) => {
      setExclusiveFilter('rarity', filter);
    },
    [setExclusiveFilter],
  );

  const handleIconTypeChecked = useCallback(
    (filter: string) => {
      toggleIconType(filter);
    },
    [toggleIconType],
  );

  const handleStrategyChecked = useCallback(
    (filter: string) => {
      setExclusiveFilter('strategy', filter);
    },
    [setExclusiveFilter],
  );

  const handleDistanceChecked = useCallback(
    (filter: string) => {
      setExclusiveFilter('distance', filter);
    },
    [setExclusiveFilter],
  );

  const handleSurfaceChecked = useCallback(
    (filter: string) => {
      setExclusiveFilter('surface', filter);
    },
    [setExclusiveFilter],
  );

  const handleLocationChecked = useCallback(
    (filter: string) => {
      setExclusiveFilter('location', filter);
    },
    [setExclusiveFilter],
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();

    // setSearchText('');
    // searchRef.current?.focus();
    // searchRef.current?.select();
  }, [clearFilters]);

  const selectedOtherFiltersCount = useSelectedOtherFiltersCount();

  const [raritiesFilter, setRaritiesFilter] = useState<string[]>([]);
  const [strategiesFilter, setStrategiesFilter] = useState<string[]>([]);
  const [distancesFilter, setDistancesFilter] = useState<string[]>([]);
  const [surfacesFilter, setSurfacesFilter] = useState<string[]>([]);
  const [locationsFilter, setLocationsFilter] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ToggleGroup
          value={raritiesFilter}
          onValueChange={setRaritiesFilter}
          size="sm"
          variant="outline"
          multiple
        >
          <FilterButton filter="white" group="rarity" />
          <FilterButton filter="gold" group="rarity" />
          <FilterButton filter="pink" group="rarity" />
          <FilterButton filter="unique" group="rarity" />
          <FilterButton filter="inherit" group="rarity" />
        </ToggleGroup>

        <ToggleGroup
          value={strategiesFilter}
          onValueChange={setStrategiesFilter}
          size="sm"
          variant="outline"
          multiple
        >
          <FilterButton filter="nige" group="strategy" />
          <FilterButton filter="senkou" group="strategy" />
          <FilterButton filter="sasi" group="strategy" />
          <FilterButton filter="oikomi" group="strategy" />
        </ToggleGroup>

        <ToggleGroup
          value={distancesFilter}
          onValueChange={setDistancesFilter}
          size="sm"
          variant="outline"
          multiple
        >
          <FilterButton filter="short" group="distance" />
          <FilterButton filter="mile" group="distance" />
          <FilterButton filter="medium" group="distance" />
          <FilterButton filter="long" group="distance" />
        </ToggleGroup>

        <ToggleGroup
          value={locationsFilter}
          onValueChange={setLocationsFilter}
          size="sm"
          variant="outline"
          multiple
        >
          <FilterButton filter="phase0" group="location" />
          <FilterButton filter="phase1" group="location" />
          <FilterButton filter="phase2" group="location" />
          <FilterButton filter="phase3" group="location" />
          <FilterButton filter="finalcorner" group="location" />
          <FilterButton filter="finalstraight" group="location" />
        </ToggleGroup>

        <ToggleGroup
          value={surfacesFilter}
          onValueChange={setSurfacesFilter}
          size="sm"
          variant="outline"
          multiple
        >
          <FilterButton filter="turf" group="surface" />
          <FilterButton filter="dirt" group="surface" />
        </ToggleGroup>
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
  );
};
