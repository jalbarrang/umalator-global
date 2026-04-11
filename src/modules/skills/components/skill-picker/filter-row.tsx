import { cn } from '@/lib/utils';
import { SkillIcon } from '../skill-list/skill-item';
import { Button } from '@/components/ui/button';
import { FilterState } from './types';
import { Label } from '@/components/ui/label';
import i18n from '@/i18n';
import { useSelectedOtherFiltersCount, useSkillPickerActions, useSkillPickerState } from './store';
import { useCallback, useState } from 'react';
import { ChevronUpIcon, FilterIcon } from 'lucide-react';

type FilterButtonProps = {
  id: string;
  checked: boolean;
  onChecked: any;
};

const FilterButton = (props: FilterButtonProps) => {
  const { id, checked, onChecked } = props;

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
          'cursor-pointer rounded-lg border px-3 py-1.5 transition-all',
          'border-border bg-background hover:bg-muted hover:text-foreground',
          'peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]',
          checked &&
            'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
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

  const { toggleIconType, setExclusiveFilter } = useSkillPickerActions();

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

  const selectedOtherFiltersCount = useSelectedOtherFiltersCount();

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <FilterIcon className="w-4 h-4" />
          <span className="text-xs">Filters ({selectedOtherFiltersCount})</span>
          <ChevronUpIcon className={cn('w-4 h-4', showFilters ? 'rotate-180' : '')} />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 items-center flex-wrap md:flex-nowrap">
            <div>
              <Label>Type</Label>
            </div>

            <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
              <FilterButton
                id="white"
                checked={filterState.rarity.white}
                onChecked={() => handleRarityChecked('white')}
              />
              <FilterButton
                id="gold"
                checked={filterState.rarity.gold}
                onChecked={() => handleRarityChecked('gold')}
              />
              {/* <FilterButton
                id="pink"
                checked={filterState.rarity.pink}
                onChecked={() => handleRarityChecked('pink')}
              /> */}
              <FilterButton
                id="unique"
                checked={filterState.rarity.unique}
                onChecked={() => handleRarityChecked('unique')}
              />
              <FilterButton
                id="inherit"
                checked={filterState.rarity.inherit}
                onChecked={() => handleRarityChecked('inherit')}
              />
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center flex-wrap md:flex-nowrap">
            <div>
              <Label>Strategy</Label>
            </div>

            <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
              <FilterButton
                id="nige"
                checked={filterState.strategy.nige}
                onChecked={() => handleStrategyChecked('nige')}
              />
              <FilterButton
                id="senkou"
                checked={filterState.strategy.senkou}
                onChecked={() => handleStrategyChecked('senkou')}
              />
              <FilterButton
                id="sasi"
                checked={filterState.strategy.sasi}
                onChecked={() => handleStrategyChecked('sasi')}
              />
              <FilterButton
                id="oikomi"
                checked={filterState.strategy.oikomi}
                onChecked={() => handleStrategyChecked('oikomi')}
              />
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center flex-wrap md:flex-nowrap">
            <div>
              <Label>Track</Label>
            </div>

            <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
              <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
                <FilterButton
                  id="short"
                  checked={filterState.distance.short}
                  onChecked={() => handleDistanceChecked('short')}
                />
                <FilterButton
                  id="mile"
                  checked={filterState.distance.mile}
                  onChecked={() => handleDistanceChecked('mile')}
                />
                <FilterButton
                  id="medium"
                  checked={filterState.distance.medium}
                  onChecked={() => handleDistanceChecked('medium')}
                />
                <FilterButton
                  id="long"
                  checked={filterState.distance.long}
                  onChecked={() => handleDistanceChecked('long')}
                />
              </div>

              <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
                <FilterButton
                  id="turf"
                  checked={filterState.surface.turf}
                  onChecked={() => handleSurfaceChecked('turf')}
                />
                <FilterButton
                  id="dirt"
                  checked={filterState.surface.dirt}
                  onChecked={() => handleSurfaceChecked('dirt')}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center flex-wrap md:flex-nowrap">
            <div>
              <Label>Trigger</Label>
            </div>

            <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
              <FilterButton
                id="phase0"
                checked={filterState.location.phase0}
                onChecked={() => handleLocationChecked('phase0')}
              />
              <FilterButton
                id="phase1"
                checked={filterState.location.phase1}
                onChecked={() => handleLocationChecked('phase1')}
              />
              <FilterButton
                id="phase2"
                checked={filterState.location.phase2}
                onChecked={() => handleLocationChecked('phase2')}
              />
              <FilterButton
                id="phase3"
                checked={filterState.location.phase3}
                onChecked={() => handleLocationChecked('phase3')}
              />
              <FilterButton
                id="finalcorner"
                checked={filterState.location.finalcorner}
                onChecked={() => handleLocationChecked('finalcorner')}
              />
              <FilterButton
                id="finalstraight"
                checked={filterState.location.finalstraight}
                onChecked={() => handleLocationChecked('finalstraight')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
