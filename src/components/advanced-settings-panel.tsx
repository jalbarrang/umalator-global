import type { WitVarianceSettings } from '@/store/settings.store';
import {
  setSamples,
  setWitVariance,
  useSettingsStore,
  useWitVariance,
} from '@/store/settings.store';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
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
    <span className={`text-sm ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
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
          checked={settings[uma1Key]}
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
          checked={settings[uma2Key]}
          onCheckedChange={() => onToggle(uma2Key)}
          disabled={disabled}
        />
      </div>
    </div>
  </div>
);

export const AdvancedSettingsPanel = () => {
  const { nsamples } = useSettingsStore();
  const witVarianceSettings = useWitVariance();

  const handleSimWitVarianceToggle = () => {
    setWitVariance({ simWitVariance: !witVarianceSettings.simWitVariance });
  };

  const toggleWitVarianceSetting = (setting: keyof WitVarianceSettings) => {
    setWitVariance({ [setting]: !witVarianceSettings[setting] });
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Advanced Settings</PanelTitle>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-4">
        {/* Samples */}
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
