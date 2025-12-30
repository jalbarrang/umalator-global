import { InfoIcon } from 'lucide-react';
import { setBudget, setModifiers, useSkillPlannerStore } from '../store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function CostModifiersPanel() {
  const { budget, modifiers } = useSkillPlannerStore();

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setBudget(value);
  };

  const handleFastLearnerChange = (checked: boolean) => {
    setModifiers({ hasFastLearner: checked });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <h3 className="font-semibold text-sm">Budget & Modifiers</h3>

      {/* Budget Input */}
      <div className="space-y-2">
        <Label htmlFor="budget">Skill Points Available</Label>
        <Input
          id="budget"
          type="number"
          min="0"
          value={budget}
          onChange={handleBudgetChange}
          placeholder="e.g., 1000"
        />
        <p className="text-xs text-muted-foreground">
          Total skill points you have available to spend
        </p>
      </div>

      {/* Fast Learner Toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="fast-learner"
            checked={modifiers.hasFastLearner}
            onCheckedChange={handleFastLearnerChange}
          />
          <Label htmlFor="fast-learner" className="cursor-pointer font-normal flex items-center gap-1">
            Fast Learner
            <Tooltip>
              <TooltipTrigger render={
                <InfoIcon className="w-3 h-3 text-muted-foreground" />
              } />
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  A rare condition in career mode that reduces all skill costs by 10%.
                  Enable this if your runner has this condition.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Reduces all skill costs by 10%
        </p>
      </div>

      {/* Summary */}
      <div className="border-t pt-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Budget:</span>
          <span className="font-medium text-foreground">{budget} pts</span>
        </div>
        {modifiers.hasFastLearner && (
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Fast Learner:</span>
            <span className="text-green-600 font-medium">-10% on all skills</span>
          </div>
        )}
      </div>
    </div>
  );
}

