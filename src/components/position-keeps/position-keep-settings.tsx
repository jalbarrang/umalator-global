import {
  setPacemakerCount,
  setSelectedPacemakerIndices,
  togglePacemakerSelection,
  useSelectedPacemakerIndices,
} from '@/store/settings/actions';
import { setIsPacemakerDropdownOpen, useUIStore } from '@/store/ui.store';
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
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { Label } from '@/components/ui/label';
import { useMemo } from 'react';

export const PositionKeepSettings = () => {
  const { isPacemakerDropdownOpen } = useUIStore();
  const { posKeepMode, pacemakerCount } = useSettingsStore();
  const selectedPacemakerIndices = useSelectedPacemakerIndices();

  const pacemakerNames = useMemo(
    () =>
      [...Array(pacemakerCount)].map((_, index) => `Pacemaker ${index + 1}`),
    [pacemakerCount],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold">Position Keep</Label>

      <Select
        value={posKeepMode.toString()}
        onValueChange={(value) => setPosKeepMode(+value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PosKeepMode.None.toString()}>None</SelectItem>
          <SelectItem value={PosKeepMode.Approximate.toString()}>
            Approximate
          </SelectItem>
          <SelectItem value={PosKeepMode.Virtual.toString()}>
            Virtual Pacemaker
          </SelectItem>
        </SelectContent>
      </Select>

      {posKeepMode === PosKeepMode.Approximate && (
        <p className="text-xs text-muted-foreground">Using default pacemaker</p>
      )}

      {posKeepMode === PosKeepMode.Virtual && (
        <div className="flex flex-col gap-3 mt-2 pl-2 border-l-2 border-muted">
          <div>
            <Label className="text-xs">Show Pacemakers:</Label>
            <div className="pacemaker-combobox mt-1">
              <button
                className="pacemaker-combobox-button"
                onClick={() =>
                  setIsPacemakerDropdownOpen(!isPacemakerDropdownOpen)
                }
              >
                {selectedPacemakerIndices.length === 0
                  ? 'None'
                  : selectedPacemakerIndices.length === 1
                    ? `Pacemaker ${selectedPacemakerIndices[0] + 1}`
                    : selectedPacemakerIndices.length === pacemakerCount
                      ? 'All Pacemakers'
                      : `${selectedPacemakerIndices.length} Pacemakers`}
                <span className="pacemaker-combobox-arrow">▼</span>
              </button>

              {isPacemakerDropdownOpen && (
                <div className="pacemaker-combobox-dropdown">
                  {pacemakerNames.map((name, index) => (
                    <label key={index} className="pacemaker-combobox-option">
                      <input
                        type="checkbox"
                        checked={selectedPacemakerIndices.includes(index)}
                        onChange={() => togglePacemakerSelection(index)}
                      />
                      <span
                        style={{
                          color:
                            index === 0
                              ? '#22c55e'
                              : index === 1
                                ? '#a855f7'
                                : '#ec4899',
                        }}
                      >
                        {name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <MultiSelect
              values={selectedPacemakerIndices.map(String)}
              onValuesChange={(values) =>
                setSelectedPacemakerIndices(values.map(Number))
              }
            >
              <MultiSelectTrigger className="w-full max-w-[400px]">
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

          <div>
            <Label htmlFor="pacemakercount" className="text-xs">
              Number of pacemakers: {pacemakerCount}
            </Label>
            <input
              type="range"
              id="pacemakercount"
              min="1"
              max="3"
              value={pacemakerCount}
              onInput={(e) => setPacemakerCount(+e.currentTarget.value)}
              className="w-full mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};
