import { Check } from 'lucide-react';
import type { WizardStep } from '../types';
import { isStepUnlocked, skillPlannerSteps, useSkillPlannerStore } from '../skill-planner.store';
import { cn } from '@/lib/utils';

const stepLabels: Record<WizardStep, string> = {
  runner: 'Runner',
  shop: 'Shop',
  review: 'Review and Optimize',
};

type SkillPlannerStepperProps = {
  currentStep: WizardStep;
  onStepSelect: (step: WizardStep) => void;
};

export function SkillPlannerStepper(props: Readonly<SkillPlannerStepperProps>) {
  const { currentStep, onStepSelect } = props;
  const completedSteps = useSkillPlannerStore((state) => state.completedSteps);
  const currentStepIndex = skillPlannerSteps.indexOf(currentStep);

  return (
    <div className="flex flex-1 items-center justify-center gap-1">
      {skillPlannerSteps.map((step, index) => {
        const unlocked = isStepUnlocked(step);
        const completed = completedSteps.includes(step);
        const active = currentStep === step;
        const isClickable = unlocked && !active;
        const isPast = index < currentStepIndex;

        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 && (
              <div className={cn('h-px w-6', isPast || completed ? 'bg-primary' : 'bg-border')} />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (isClickable) onStepSelect(step);
              }}
              className={cn('flex items-center gap-1.5', isClickable && 'cursor-pointer')}
            >
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors',
                  completed && !active && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !completed && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {completed && !active ? <Check className="size-3" /> : index + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium lg:block',
                  active ? 'text-foreground' : 'text-muted-foreground',
                  !unlocked && 'text-muted-foreground/50',
                )}
              >
                {stepLabels[step]}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
