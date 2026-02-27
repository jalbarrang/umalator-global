import { AptitudeSelect } from '../AptitudeSelect';
import { MoodSelect } from '../MoodSelect';
import { StrategySelect } from '../StrategySelect';
import type { RunnerState } from './types';
import type { IMood } from '@/lib/sunday-tools/runner/definitions';
import { Label } from '@/components/ui/label';

export type Aptitude =
  | 'surfaceAptitude'
  | 'distanceAptitude'
  | 'strategy'
  | 'strategyAptitude'
  | 'mood';

type AptitudesTableProps = {
  value: RunnerState;
  onChange: (value: RunnerState) => void;
  hasRunawaySkill: boolean;
  onRunawayStrategy: () => void;
};

export const AptitudesTable = (props: AptitudesTableProps) => {
  const { value, onChange, hasRunawaySkill, onRunawayStrategy } = props;

  const handleUpdateAptitude = (prop: Aptitude) => (newValue: string) => {
    onChange({ ...value, [prop]: newValue });
  };

  const handleUpdateStrategy = (prop: Aptitude) => (newValue: string | null) => {
    if (!newValue) {
      return;
    }

    onChange({ ...value, [prop]: newValue });

    if (newValue === 'Runaway') {
      onRunawayStrategy();
    }
  };

  const handleUpdateMood = (prop: Aptitude) => (newValue: IMood) => {
    onChange({ ...value, [prop]: newValue });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="flex items-center gap-2 justify-between border rounded-xl">
        <Label className="pl-2">Surface aptitude:</Label>
        <AptitudeSelect
          value={value.surfaceAptitude}
          onChange={handleUpdateAptitude('surfaceAptitude')}
        />
      </div>

      <div className="flex items-center gap-2 justify-between border rounded-xl">
        <Label className="pl-2">Distance aptitude:</Label>
        <AptitudeSelect
          value={value.distanceAptitude}
          onChange={handleUpdateAptitude('distanceAptitude')}
        />
      </div>

      <div className="flex items-center gap-2 justify-between border rounded-xl">
        <Label className="pl-2">Style:</Label>
        <StrategySelect
          value={value.strategy}
          onChange={handleUpdateStrategy('strategy')}
          disabled={hasRunawaySkill}
        />
      </div>

      <div className="flex items-center gap-2 justify-between border rounded-xl">
        <Label className="pl-2">Style aptitude:</Label>
        <AptitudeSelect
          value={value.strategyAptitude}
          onChange={handleUpdateAptitude('strategyAptitude')}
        />
      </div>

      <div className="flex items-center gap-2 justify-between border rounded-xl">
        <Label className="pl-2">Mood:</Label>
        <MoodSelect value={value.mood} onChange={handleUpdateMood('mood')} />
      </div>
    </div>
  );
};
