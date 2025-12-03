import { useSimulationRunner } from '@/modules/simulation/hooks/useSimulationRunner';
import {
  setPosKeepMode,
  setSamples,
  setSeed,
  setWitVariance,
  toggleShowHp,
  toggleShowLanes,
  useSettingsStore,
  useWitVariance,
} from '@/store/settings.store';
import {
  getSelectedPacemakerIndices,
  setPacemakerCount,
  togglePacemakerSelection,
} from '@/store/settings/actions';
import {
  setIsPacemakerDropdownOpen,
  setMode,
  setRunOnceCounter,
  setShowWitVarianceSettings,
  useUIStore,
} from '@/store/ui.store';
import { Mode } from '@/utils/settings';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { CogIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const RunButtonRow = () => {
  const { mode, isSimulationRunning } = useUIStore();
  const { handleRunCompare, handleRunOnce, doBasinnChart } =
    useSimulationRunner();

  if (mode === Mode.Compare) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRunCompare}
          disabled={isSimulationRunning}
          variant="default"
          size="lg"
        >
          Run all samples
        </Button>

        <Button
          onClick={handleRunOnce}
          disabled={isSimulationRunning}
          variant="outline"
          size="sm"
        >
          Run one sample
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        onClick={doBasinnChart}
        disabled={isSimulationRunning}
      >
        Run Skill Simulations
      </Button>
    </div>
  );
};

export const SimulationPanel = () => {
  const { mode, isPacemakerDropdownOpen } = useUIStore();
  const { nsamples, seed, posKeepMode, showLanes, showHp, pacemakerCount } =
    useSettingsStore();
  const { simWitVariance } = useWitVariance();

  const handleSimWitVarianceToggle = () => {
    setWitVariance({ simWitVariance: !simWitVariance });
  };

  const selectedPacemakerIndices = getSelectedPacemakerIndices();

  const handleSeedChange = (e) => {
    setSeed(parseInt(e.target.value));
    setRunOnceCounter(0);
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * (-1 >>> 0)) >>> 0);
    setRunOnceCounter(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-bold">Simulation Mode</div>

        <RadioGroup
          value={mode.toString()}
          onValueChange={(value) => setMode(parseInt(value))}
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="0" id="mode-compare" />
            <Label htmlFor="mode-compare">Compare</Label>
          </div>

          <div className="flex items-center gap-3">
            <RadioGroupItem value="1" id="mode-chart" />
            <Label htmlFor="mode-chart">Skill chart</Label>
          </div>

          <div className="flex items-center gap-3">
            <RadioGroupItem value="2" id="mode-uniques-chart" />
            <Label htmlFor="mode-uniques-chart">Uma chart</Label>
          </div>
        </RadioGroup>

        <div className="flex items-center gap-3">
          <Label htmlFor="nsamples">Samples:</Label>
          <Input
            type="number"
            id="nsamples"
            min="1"
            max="10000"
            value={nsamples}
            onInput={(e) => setSamples(+e.currentTarget.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="seed">Seed:</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              id="seed"
              value={seed}
              onInput={handleSeedChange}
            />

            <button title="Randomize seed" onClick={handleRandomizeSeed}>
              🎲
            </button>
          </div>
        </div>
      </div>

      <div>
        <div>
          <div className="text-md font-bold">Position Keep</div>

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

          {posKeepMode == PosKeepMode.Approximate && (
            <div id="pacemakerIndicator">
              <span>Using default pacemaker</span>
            </div>
          )}

          {posKeepMode == PosKeepMode.Virtual && (
            <div id="pacemakerIndicator">
              <div>
                <label>Show Pacemakers:</label>
                <div className="pacemaker-combobox">
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
                      {[...Array(pacemakerCount)].map((_, index) => (
                        <label
                          key={index}
                          className="pacemaker-combobox-option"
                        >
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
                            Pacemaker {index + 1}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div id="pacemakerCountControl">
                <label htmlFor="pacemakercount">
                  Number of pacemakers: {pacemakerCount}
                </label>
                <input
                  type="range"
                  id="pacemakercount"
                  min="1"
                  max="3"
                  value={pacemakerCount}
                  onInput={(e) => setPacemakerCount(+e.currentTarget.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <Label htmlFor="showhp">Show HP</Label>
          <Checkbox
            id="showhp"
            checked={showHp}
            onCheckedChange={toggleShowHp}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="showlanes">Show Lanes</Label>
          <Checkbox
            id="showlanes"
            checked={showLanes}
            onCheckedChange={toggleShowLanes}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="simWitVariance">Wit Variance</Label>
          <Checkbox
            id="simWitVariance"
            checked={simWitVariance}
            onCheckedChange={handleSimWitVarianceToggle}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowWitVarianceSettings(true)}
            title="Configure Wit Variance settings"
            disabled={!simWitVariance}
          >
            <CogIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};
