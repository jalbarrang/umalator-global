import {
  setPosKeepMode,
  setSamples,
  setSeed,
  setWitVariance,
  toggleShowHp,
  toggleShowLanes,
  useSettingsStore,
  useWitVariance,
  WitVarianceSettings,
} from '@/store/settings.store';
import {
  getSelectedPacemakerIndices,
  setPacemakerCount,
  togglePacemakerSelection,
} from '@/store/settings/actions';
import {
  setIsPacemakerDropdownOpen,
  setRunOnceCounter,
  useUIStore,
} from '@/store/ui.store';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DicesIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';
import { Separator } from '@/components/ui/separator';

const WitVarianceSettingRow = ({
  label,
  uma1Key,
  uma2Key,
  settings,
  onToggle,
  disabled,
}: {
  label: string;
  uma1Key: keyof WitVarianceSettings;
  uma2Key: keyof WitVarianceSettings;
  settings: WitVarianceSettings;
  onToggle: (key: keyof WitVarianceSettings) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-2">
    <span
      className={`text-sm ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
    >
      {label}
    </span>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${disabled ? 'opacity-50' : ''}`}
          style={{ color: 'rgb(42, 119, 197)' }}
        >
          Uma 1
        </span>
        <Checkbox
          checked={settings[uma1Key] as boolean}
          onCheckedChange={() => onToggle(uma1Key)}
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${disabled ? 'opacity-50' : ''}`}
          style={{ color: 'rgb(197, 42, 42)' }}
        >
          Uma 2
        </span>
        <Checkbox
          checked={settings[uma2Key] as boolean}
          onCheckedChange={() => onToggle(uma2Key)}
          disabled={disabled}
        />
      </div>
    </div>
  </div>
);

export const AdvancedSettingsPanel = () => {
  const { isPacemakerDropdownOpen } = useUIStore();
  const { nsamples, seed, posKeepMode, showLanes, showHp, pacemakerCount } =
    useSettingsStore();
  const witVarianceSettings = useWitVariance();

  const handleSimWitVarianceToggle = () => {
    setWitVariance({ simWitVariance: !witVarianceSettings.simWitVariance });
  };

  const toggleWitVarianceSetting = (setting: keyof WitVarianceSettings) => {
    setWitVariance({ [setting]: !witVarianceSettings[setting] });
  };

  const selectedPacemakerIndices = getSelectedPacemakerIndices();

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeed(parseInt(e.target.value));
    setRunOnceCounter(0);
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * (-1 >>> 0)) >>> 0);
    setRunOnceCounter(0);
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Advanced Settings</PanelTitle>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-4">
        {/* Samples & Seed */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="nsamples" className="w-20">
              Samples:
            </Label>
            <Input
              type="number"
              id="nsamples"
              min="1"
              max="10000"
              value={nsamples}
              onInput={(e) => setSamples(+e.currentTarget.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="seed" className="w-20">
              Seed:
            </Label>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                id="seed"
                value={seed}
                onChange={handleSeedChange}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                title="Randomize seed"
                onClick={handleRandomizeSeed}
              >
                <DicesIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Position Keep */}
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
            <p className="text-xs text-muted-foreground">
              Using default pacemaker
            </p>
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

        <Separator />

        {/* Display Options */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-semibold">Display Options</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="showhp" className="text-sm font-normal">
              Show HP
            </Label>
            <Checkbox
              id="showhp"
              checked={showHp}
              onCheckedChange={toggleShowHp}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showlanes" className="text-sm font-normal">
              Show Lanes
            </Label>
            <Checkbox
              id="showlanes"
              checked={showLanes}
              onCheckedChange={toggleShowLanes}
            />
          </div>
        </div>

        <Separator />

        {/* Wit Variance */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="simWitVariance" className="text-sm font-semibold">
              Wit Variance
            </Label>
            <Checkbox
              id="simWitVariance"
              checked={witVarianceSettings.simWitVariance}
              onCheckedChange={handleSimWitVarianceToggle}
            />
          </div>

          <div className="pl-2 border-l-2 border-muted">
            <WitVarianceSettingRow
              label="Rushed State"
              uma1Key="allowRushedUma1"
              uma2Key="allowRushedUma2"
              settings={witVarianceSettings}
              onToggle={toggleWitVarianceSetting}
              disabled={!witVarianceSettings.simWitVariance}
            />
            <WitVarianceSettingRow
              label="Downhill Mode"
              uma1Key="allowDownhillUma1"
              uma2Key="allowDownhillUma2"
              settings={witVarianceSettings}
              onToggle={toggleWitVarianceSetting}
              disabled={!witVarianceSettings.simWitVariance}
            />
            <WitVarianceSettingRow
              label="Section Modifier"
              uma1Key="allowSectionModifierUma1"
              uma2Key="allowSectionModifierUma2"
              settings={witVarianceSettings}
              onToggle={toggleWitVarianceSetting}
              disabled={!witVarianceSettings.simWitVariance}
            />
            <WitVarianceSettingRow
              label="Skill Check Chance"
              uma1Key="allowSkillCheckChanceUma1"
              uma2Key="allowSkillCheckChanceUma2"
              settings={witVarianceSettings}
              onToggle={toggleWitVarianceSetting}
              disabled={!witVarianceSettings.simWitVariance}
            />
          </div>
        </div>
      </PanelContent>
    </Panel>
  );
};
