import { useMemo } from 'react';
import { Slider } from '../ui/slider';
import type { IPosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import {
  setPacemakerCount,
  setSelectedPacemakerIndices,
  togglePaceMakers,
  useSelectedPacemakerIndices,
} from '@/store/settings/actions';
import { setPosKeepMode, useSettingsStore } from '@/store/settings.store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
} from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';

export const PositionKeepSettings = () => {
  const { posKeepMode, pacemakerCount } = useSettingsStore();
  const selectedPacemakerIndices = useSelectedPacemakerIndices();

  const pacemakerNames = useMemo(
    () => [...Array(pacemakerCount)].map((_, index) => `Pacemaker ${index + 1}`),
    [pacemakerCount],
  );

  const handlePosKeepModeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPosKeepMode(+value as IPosKeepMode);
  };

  const handlePacemakerCountChange = (value: number | ReadonlyArray<number>) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (value.length === 0) return;
    setPacemakerCount(value[0] ?? 1);
  };

  const handleSelectedPacemakerIndicesChange = (values: Array<string>) => {
    togglePaceMakers(values.map(Number));
    setSelectedPacemakerIndices(values.map(Number));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-semibold">Position Keep</Label>

        <Select value={posKeepMode.toString()} onValueChange={handlePosKeepModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PosKeepMode.None.toString()}>None</SelectItem>
            <SelectItem value={PosKeepMode.Approximate.toString()}>Approximate</SelectItem>
            <SelectItem value={PosKeepMode.Virtual.toString()}>Virtual Pacemaker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {posKeepMode === PosKeepMode.Approximate && (
        <p className="text-xs text-muted-foreground">Using default pacemaker</p>
      )}

      {posKeepMode === PosKeepMode.Virtual && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Show Pacemakers:</Label>
            <MultiSelect
              value={selectedPacemakerIndices.map(String)}
              onValueChange={handleSelectedPacemakerIndicesChange}
            >
              <MultiSelectTrigger className="w-full">
                {selectedPacemakerIndices.length === 0
                  ? 'None'
                  : selectedPacemakerIndices.length === 1
                    ? `Pacemaker ${selectedPacemakerIndices[0] + 1}`
                    : selectedPacemakerIndices.length === pacemakerCount
                      ? 'All Pacemakers'
                      : `${selectedPacemakerIndices.length} Pacemakers`}
              </MultiSelectTrigger>
              <MultiSelectContent>
                <MultiSelectGroup>
                  {pacemakerNames.map((name, index) => (
                    <MultiSelectItem key={index} value={index.toString()}>
                      {name}
                    </MultiSelectItem>
                  ))}
                </MultiSelectGroup>
              </MultiSelectContent>
            </MultiSelect>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="pacemakercount" className="text-xs">
              Number of pacemakers: {pacemakerCount}
            </Label>

            <Slider
              id="pacemakercount"
              min={1}
              max={3}
              step={1}
              value={[pacemakerCount]}
              onValueChange={handlePacemakerCountChange}
              className="w-full mt-1"
            />
          </div>
        </>
      )}
    </div>
  );
};
