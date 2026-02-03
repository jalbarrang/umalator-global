/**
 * Help Button Component
 *
 * Button that triggers a tutorial when clicked.
 * Displays a help icon and tooltip.
 */

import { HelpCircle } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { useTutorial, type TutorialId, type TutorialStep } from '@/components/tutorial';
import { markVisited } from '@/store/tutorial.store';
import type { FC } from 'react';

interface HelpButtonProps extends Omit<ButtonProps, 'onClick'> {
  tutorialId: TutorialId;
  steps: TutorialStep[];
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
  const { start } = useTutorial();

  const handleClick = () => {
    markVisited(tutorialId);
    start(tutorialId, steps);
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
