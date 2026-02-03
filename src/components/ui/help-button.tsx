import { HelpCircle } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { startTutorial } from '@/store/tutorial.store';
import type { DriveStep } from 'driver.js';
import type { FC } from 'react';

interface HelpButtonProps extends Omit<ButtonProps, 'onClick'> {
  tutorialId: 'umalator' | 'skill-bassin' | 'uma-bassin';
  steps: DriveStep[];
  tooltipText?: string;
}

export const HelpButton: FC<HelpButtonProps> = ({
  tutorialId,
  steps,
  tooltipText = 'Show tutorial',
  variant = 'ghost',
  size = 'sm',
  ...props
}) => {
  const handleClick = () => {
    startTutorial(tutorialId, steps);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            aria-label={tooltipText}
            {...props}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
      />
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
