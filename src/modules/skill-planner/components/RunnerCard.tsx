import { useState } from 'react';
import { Import } from 'lucide-react';
import type { StatsKey } from '@/modules/runners/components/runner-card/stats-table';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { cn } from '@/lib/utils';
import { StatsTable } from '@/modules/runners/components/runner-card/stats-table';
import { UmaSelector } from '@/modules/runners/components/runner-selector';
import { AptitudesTable } from '@/modules/runners/components/runner-card/aptitudes-table';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { ImportVeteranDialog } from './ImportVeteranDialog';
import { Button } from '@/components/ui/button';

type RunnerCardProps = {
  value: RunnerState;
  onChange: (runner: Partial<RunnerState>) => void;
  onReset: () => void;
  onImportVeteran?: (runner: RunnerState) => void;
  className?: string;
};

export const RunnerCard = (props: RunnerCardProps) => {
  const { value, onChange, onReset, onImportVeteran, className, ...rest } = props;
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleUpdateOutfitId = (outfitId: string) => {
    onChange({ outfitId });
  };

  const handleUpdateStat = (stat: StatsKey) => (newValue: number) => {
    onChange({ [stat]: newValue });
  };

  const handleUpdateAptitude = (runnerState: RunnerState) => {
    onChange(runnerState);
  };

  const handleUpdateRunawayStrategy = () => {
    onChange({ strategy: 'Runaway' });
  };

  const handleResetRunner = () => {
    onReset();
  };

  const hasRunawaySkill = value.skills.includes(runawaySkillId);

  return (
    <>
      <ImportVeteranDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportRunner={(runner) => onImportVeteran?.(runner)}
      />

      <div className={cn('flex flex-col gap-4', className)} {...rest}>
        <div className="flex flex-col md:flex-row gap-4">
          <UmaSelector
            value={value.outfitId}
            select={handleUpdateOutfitId}
            onReset={() => handleUpdateOutfitId('')}
          />

          <div className="flex flex-col shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              disabled={!onImportVeteran}
            >
              <Import className="mr-2 h-4 w-4" />
              Import from Veterans
            </Button>

            <Button variant="outline" size="sm" onClick={handleResetRunner}>
              Reset Runner
            </Button>
          </div>
        </div>

        <StatsTable value={value} onChange={handleUpdateStat} />

        <AptitudesTable
          value={value}
          onChange={handleUpdateAptitude}
          hasRunawaySkill={hasRunawaySkill}
          onRunawayStrategy={handleUpdateRunawayStrategy}
        />
      </div>
    </>
  );
};
