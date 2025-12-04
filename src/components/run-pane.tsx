import { useSimulationRunner } from '@/modules/simulation/hooks/useSimulationRunner';
import { useUIStore } from '@/store/ui.store';
import { Mode } from '@/utils/settings';
import { Button } from './ui/button';

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
