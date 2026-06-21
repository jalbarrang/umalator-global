import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CHAMPIONS_MEETING_REWARDS,
  CLUB_RANK_MONTHLY_CARATS,
  DAILY_CARAT_PACK_MONTHLY_CARATS,
  LEAGUE_OF_HEROES_REWARDS,
  TEAM_TRIALS_WEEKLY_CARATS,
  TRAINING_PASS_MONTHLY_CARATS
} from '@/modules/carat/model/income-tables';
import { InfoHint } from '@/modules/carat/components/info-hint';
import { type CaratSettings, setCaratSetting, updateCaratSettings, useCaratStore } from '@/store/carat.store';

const teamTrialsOptions = Object.entries(TEAM_TRIALS_WEEKLY_CARATS).map(([value, carats]) => ({
  value,
  label: value.replace('class-', 'Class '),
  suffix: `${carats}/wk`
}));

const clubRankOptions = Object.entries(CLUB_RANK_MONTHLY_CARATS).map(([value, carats]) => ({
  value,
  label: value.toUpperCase(),
  suffix: `${carats.toLocaleString()}/mo`
}));

const formatRewardOption = ([value, reward]: [string, { carats: number; tickets: number }]) => ({
  value,
  label: value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  suffix: reward.carats === 0 && reward.tickets === 0 ? 'No rewards' : `${reward.carats.toLocaleString()} + ${reward.tickets} tickets`
});

const cmOptions = Object.entries(CHAMPIONS_MEETING_REWARDS).map(formatRewardOption);

const lohOptions = Object.entries(LEAGUE_OF_HEROES_REWARDS).map(formatRewardOption);

type NumberSettingKey = {
  [K in keyof CaratSettings]: CaratSettings[K] extends number ? K : never;
}[keyof CaratSettings];

function NumberField(props: { label: string; settingKey: NumberSettingKey; helper?: string; hint?: ReactNode }) {
  const { label, settingKey, helper, hint } = props;
  const value = useCaratStore((state) => state.settings[settingKey]);

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {label}
          {hint}
        </span>
        {helper ? <span className="text-[11px] text-muted-foreground">{helper}</span> : null}
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => setCaratSetting(settingKey, Number(event.target.value) || 0)}
        className="text-right tabular-nums"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: { value: string; label: string; suffix: string }[];
  onValueChange: (value: string) => void;
}) {
  const { label, value, options, onValueChange } = props;

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(selected: string) => options.find((option) => option.value === selected)?.label ?? selected}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex w-full justify-between gap-4">
                <span>{option.label}</span>
                <span className="text-muted-foreground">{option.suffix}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function applyIncomePreset(preset: 'casual' | 'average' | 'dedicated') {
  const presets: Record<typeof preset, Partial<CaratSettings>> = {
    casual: {
      monthlyCarats: 10000,
      monthlyTickets: 18,
      teamTrialsClass: 'class-4',
      clubRank: 'c',
      cmPlacement: 'group-b-3rd',
      lohRank: 'silver-4',
      dailyCaratPack: false,
      trainingPass: 'free'
    },
    average: {
      monthlyCarats: 15000,
      monthlyTickets: 27,
      teamTrialsClass: 'class-6',
      clubRank: 'b',
      cmPlacement: 'group-b-2nd',
      lohRank: 'gold-4',
      dailyCaratPack: true,
      trainingPass: 'free'
    },
    dedicated: {
      monthlyCarats: 19000,
      monthlyTickets: 32,
      teamTrialsClass: 'class-6',
      clubRank: 'a',
      cmPlacement: 'group-a-2nd',
      lohRank: 'platinum-4',
      dailyCaratPack: true,
      trainingPass: 'paid'
    }
  };

  updateCaratSettings(presets[preset]);
}

function Section(props: { title: string; defaultOpen?: boolean; emphasis?: boolean; children: ReactNode }) {
  const { title, defaultOpen = false, emphasis, children } = props;

  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b">
      <CollapsibleTrigger
        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold ${emphasis ? 'text-primary' : ''}`}
      >
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function SwitchRow(props: { label: string; checked: boolean; helper: string; onCheckedChange: (checked: boolean) => void }) {
  const { label, checked, helper, onCheckedChange } = props;

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{helper}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function IncomeSettings() {
  const settings = useCaratStore((state) => state.settings);

  return (
    <aside data-tutorial="carat-settings" className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3 text-sm font-bold">
        <span className="inline-flex items-center gap-1">
          Income & Settings
          <InfoHint label="What are carats?" title="Carats">
            Carats are the main currency used for gacha pulls. One pull costs 150 carats.
          </InfoHint>
        </span>
        <span className="text-xs font-normal text-muted-foreground">Global server</span>
      </div>

      <div className="border-b px-4 py-3">
        <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
          Income presets
          <InfoHint label="About income presets" title="Income presets">
            Presets are rough estimates. Apply one, then adjust the fields below to match your real account.
          </InfoHint>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="xs" variant="outline" onClick={() => applyIncomePreset('casual')}>Casual</Button>
          <Button type="button" size="xs" variant="outline" onClick={() => applyIncomePreset('average')}>Average</Button>
          <Button type="button" size="xs" variant="outline" onClick={() => applyIncomePreset('dedicated')}>Dedicated</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Estimates only — use them as a starting point, not a promise.</p>
      </div>

      <Section title="Starting Balance" emphasis defaultOpen>
        <NumberField label="Free carats" settingKey="startingFreeCarats" hint={<InfoHint label="Free carats help" title="Free carats">Free carats can be spent on standard banners and are the main balance used for affordability.</InfoHint>} />
        <NumberField label="Paid carats" settingKey="startingPaidCarats" />
        <NumberField label="Uma tickets" settingKey="umaTickets" />
        <NumberField label="Support tickets" settingKey="supportTickets" />
      </Section>

      <Section title="Recurring Income" emphasis defaultOpen>
        <NumberField label="Monthly carats (base)" settingKey="monthlyCarats" helper="default 15,000" hint={<InfoHint label="Monthly carats help" title="Monthly carats">Your average free income before event-specific rewards. If unsure, use Average.</InfoHint>} />
        <NumberField label="Monthly tickets" settingKey="monthlyTickets" helper="default 27" hint={<InfoHint label="Pull tickets help" title="Pull tickets">A pull ticket counts like one pull for its banner type. Pulls cost either one ticket or 150 carats.</InfoHint>} />
        <SelectField label="Team Trials class" value={settings.teamTrialsClass} options={teamTrialsOptions} onValueChange={(value) => setCaratSetting('teamTrialsClass', value)} />
        <SelectField label="Club rank" value={settings.clubRank} options={clubRankOptions} onValueChange={(value) => setCaratSetting('clubRank', value)} />
      </Section>

      <Section title="Champion's Meeting">
        <SelectField label="Expected CM placement" value={settings.cmPlacement} options={cmOptions} onValueChange={(value) => setCaratSetting('cmPlacement', value)} />
        <SelectField label="Expected League of Heroes rank" value={settings.lohRank} options={lohOptions} onValueChange={(value) => setCaratSetting('lohRank', value)} />
      </Section>

      <Section title="Passes & Packs">
        <SwitchRow label="Daily Carat Pack" checked={settings.dailyCaratPack} helper={`+${DAILY_CARAT_PACK_MONTHLY_CARATS.toLocaleString()}/mo`} onCheckedChange={(checked) => setCaratSetting('dailyCaratPack', checked)} />
        <SelectField label="Training Pass" value={settings.trainingPass} options={Object.entries(TRAINING_PASS_MONTHLY_CARATS).map(([value, carats]) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), suffix: `${carats.toLocaleString()}/mo` }))} onValueChange={(value) => setCaratSetting('trainingPass', value as CaratSettings['trainingPass'])} />
        <SwitchRow label="Track paid carats" checked={settings.trackPaidCarats} helper="For paid selector planning later" onCheckedChange={(checked) => setCaratSetting('trackPaidCarats', checked)} />
      </Section>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-t px-4 py-3 text-left text-sm font-semibold text-primary">
          What do these terms mean?
          <ChevronDown className="size-4 text-muted-foreground transition-transform data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 px-4 pb-4 text-xs leading-5 text-muted-foreground">
          <p><strong className="text-foreground">Pull:</strong> one gacha roll. It costs 150 carats or one matching ticket.</p>
          <p><strong className="text-foreground">Spark / pity:</strong> 200 pulls lets you exchange for one guaranteed pickup copy.</p>
          <p><strong className="text-foreground">LB / MLB:</strong> limit breaks from duplicate copies. MLB usually means five total copies.</p>
          <p><strong className="text-foreground">Selector:</strong> a paid ticket or pack that lets you choose a target from a fixed roster.</p>
          <p><strong className="text-foreground">Step-up:</strong> a paid banner with fixed steps and special guaranteed slots.</p>
          <p><strong className="text-foreground">Confidence badges:</strong> confirmed dates are official; estimated/predicted dates come from timeline spacing.</p>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Pull cost: 150 carats/pull</span>
        <span>Spark/pity: 200 pulls</span>
      </div>
    </aside>
  );
}
