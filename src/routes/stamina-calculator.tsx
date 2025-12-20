import { createFileRoute } from '@tanstack/react-router';
import { Calculator, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AptitudesPanel,
  CoursePanel,
  PhaseTable,
  ResultsPanel,
  SkillsPanel,
  StatsPanel,
  useStaminaCalculator,
  useStaminaCalculatorStore,
} from '@/modules/stamina-calculator';

export const Route = createFileRoute('/stamina-calculator')({
  component: RouteComponent,
});

function RouteComponent() {
  const { calculate, reset, isCalculating } = useStaminaCalculatorStore();

  // Initialize worker
  useStaminaCalculator();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Stamina Calculator</h1>
        <p className="text-muted-foreground">
          Calculate if your uma can complete a race at full spurt speed
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <Button onClick={calculate} disabled={isCalculating} className="gap-2">
          <Calculator className="w-4 h-4" />
          Calculate
        </Button>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col bg-card border rounded-xl p-4 gap-4">
            <StatsPanel />
            <AptitudesPanel />
            <SkillsPanel />
            <CoursePanel />
          </div>
          <div>
            <ResultsPanel />
          </div>
        </div>

        <PhaseTable />
      </div>
    </div>
  );
}
