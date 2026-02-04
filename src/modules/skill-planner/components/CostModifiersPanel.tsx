import { useMemo } from 'react';
import { PlayIcon, XIcon } from 'lucide-react';
import { setBudget, setHasFastLearner, useSkillPlannerStore } from '../skill-planner.store';
import { useSkillPlannerOptimizer } from '../hooks/useSkillPlannerOptimizer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CostModifiersPanelProps = React.HTMLAttributes<HTMLDivElement>;

export function CostModifiersPanel(props: CostModifiersPanelProps) {
  const { className, ...rest } = props;

  const { budget, hasFastLearner, candidates, isOptimizing } = useSkillPlannerStore();
  const { handleOptimize, handleCancel } = useSkillPlannerOptimizer();

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);
  const canOptimize = useMemo(
    () => candidateList.length > 0 && budget > 0,
    [candidateList, budget],
  );

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;

    setBudget(value);
  };

  const handleFastLearnerChange = (checked: boolean) => {
    setHasFastLearner(checked);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 ',
        'border rounded-lg p-4 bg-card',
        'md:flex-row',
        className,
      )}
      {...rest}
    >
      {/* Budget Input */}
      <div className="flex gap-2 items-center">
        <Label htmlFor="budget" className="whitespace-nowrap">
          Skill Points
        </Label>
        <Input
          id="budget"
          type="number"
          min="0"
          value={budget}
          onChange={handleBudgetChange}
          placeholder="e.g., 1000"
          className="w-full md:w-auto"
        />
      </div>

      {/* Fast Learner Toggle */}
      <div className="flex gap-2 items-center">
        <div className="flex items-center gap-2">
          <Checkbox
            id="fast-learner"
            checked={hasFastLearner}
            onCheckedChange={handleFastLearnerChange}
          />
          <Label htmlFor="fast-learner" className="cursor-pointer font-normal gap-1">
            Fast Learner
          </Label>
        </div>
      </div>

      <Separator orientation="vertical" className="hidden md:block" />
      <Separator className="md:hidden" />

      <div className="flex gap-2 flex-1 items-center">
        {!isOptimizing && (
          <Button onClick={handleOptimize} size="lg" disabled={!canOptimize} className="flex-1">
            <PlayIcon className="w-4 h-4 mr-2" />
            Optimize
          </Button>
        )}

        {isOptimizing && (
          <Button onClick={handleCancel} variant="destructive" size="lg" className="flex-1">
            <XIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
