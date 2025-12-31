import type { StatsKey } from '@/modules/runners/components/runner-card/stats-table';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { cn } from '@/lib/utils';
import { StatsTable } from '@/modules/runners/components/runner-card/stats-table';
import { UmaSelector } from '@/modules/runners/components/runner-selector';
import { AptitudesTable } from '@/modules/runners/components/runner-card/aptitudes-table';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';

type RunnerCardProps = {
  value: RunnerState;
  onChange: (runner: Partial<RunnerState>) => void;
  className?: string;
};

export const RunnerCard = (props: RunnerCardProps) => {
  const { value, onChange, className, ...rest } = props;

  const handleUpdateOutfitId = (outfitId: string) => {
    onChange({ outfitId });
  };

  const handleUpdateStat = (stat: StatsKey) => (value: number) => {
    onChange({ [stat]: value });
  };

  const handleUpdateAptitude = (runnerState: RunnerState) => {
    onChange(runnerState);
  };

  const handleUpdateRunawayStrategy = () => {
    onChange({ strategy: 'Runaway' });
  };

  const hasRunawaySkill = value.skills.includes(runawaySkillId);

  return (
    <div className={cn('flex flex-col gap-4', className)} {...rest}>
      <div>
        <UmaSelector
          value={value.outfitId}
          select={handleUpdateOutfitId}
          onReset={() => handleUpdateOutfitId('')}
        />
      </div>

      <StatsTable value={value} onChange={handleUpdateStat} />
      <AptitudesTable
        value={value}
        onChange={handleUpdateAptitude}
        hasRunawaySkill={hasRunawaySkill}
        onRunawayStrategy={handleUpdateRunawayStrategy}
      />
    </div>
  );
};
