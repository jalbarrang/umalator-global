/**
 * Tutorial Popover Component
 *
 * Displays tutorial step content positioned relative to the target element.
 * Uses Base UI Popover for positioning or Dialog for centered steps.
 */

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { useCurrentStep, useTutorial, useTutorialProgress } from './tutorial-context';
import type { TutorialStep } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TutorialPopoverProps {
  step: TutorialStep;
}

/**
 * Popover content for steps with target elements
 */
function PopoverContent({ step }: TutorialPopoverProps) {
  const { next, previous, close } = useTutorial();
  const { isFirstStep, isLastStep, currentStep, totalSteps } = useTutorialProgress();
  const [targetElement, setTargetElement] = useState<Element | null>(null);

  useLayoutEffect(() => {
    if (step.element) {
      const element = document.querySelector(step.element);
      setTargetElement(element);
    } else {
      setTargetElement(null);
    }
  }, [step.element]);

  const showButtons = step.showButtons ?? ['previous', 'next', 'close'];
  const showPrevious = showButtons.includes('previous') && !isFirstStep;
  const showNext = showButtons.includes('next');
  const showClose = showButtons.includes('close');

  if (!targetElement) {
    return null;
  }

  return (
    <PopoverPrimitive.Root open={true}>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={targetElement}
          side={step.side ?? 'bottom'}
          align={step.align ?? 'center'}
          sideOffset={12}
          className="isolate z-5100"
        >
          <PopoverPrimitive.Popup
            data-tutorial-popover
            className={cn(
              'bg-background ring-foreground/10',
              'flex flex-col gap-2 rounded-lg p-0 text-sm shadow-lg ring-1',
              'max-w-[500px] w-full',
              'animate-in fade-in-0 zoom-in-95 duration-200',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-border">
              <div className="font-medium">{step.title}</div>

              {/* Close button */}
              {showClose && (
                <Button onClick={close} variant="ghost" size="icon-sm" aria-label="Close tutorial">
                  <XIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="px-4 text-sm">{step.description}</div>

            {/* Footer with navigation buttons */}
            <div
              className={cn(
                'grid grid-cols-3 items-center justify-between gap-2 border-t border-border p-2 bg-muted/50',
              )}
            >
              <div>
                {showPrevious && (
                  <Button
                    onClick={previous}
                    variant="outline"
                    size="default"
                    className="border border-border"
                  >
                    Previous
                  </Button>
                )}
              </div>

              {/* Progress and Skip */}
              <span className="text-muted-foreground text-sm text-center">
                {currentStep} of {totalSteps}
              </span>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={close}
                  className="text-xs underline hover:text-foreground transition-colors"
                >
                  Skip tutorial
                </button>
                {showNext && (
                  <Button onClick={next} variant="default" size="default">
                    {isLastStep ? (step.doneBtnText ?? 'Finish') : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * Dialog content for steps without target elements (centered)
 */
function DialogContent({ step }: TutorialPopoverProps) {
  const { next, previous, close } = useTutorial();
  const { isFirstStep, isLastStep, currentStep, totalSteps } = useTutorialProgress();

  const showButtons = step.showButtons ?? ['previous', 'next', 'close'];
  const showPrevious = showButtons.includes('previous') && !isFirstStep;
  const showNext = showButtons.includes('next');
  const showClose = showButtons.includes('close');

  return (
    <DialogPrimitive.Root open={true}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
            'bg-black/10 duration-100',
            'fixed inset-0 isolate z-5000',
          )}
        />

        {/* Dialog content */}
        <DialogPrimitive.Popup
          data-tutorial-dialog
          className={cn(
            'bg-background ring-foreground/10',
            'data-open:animate-in data-closed:animate-out',
            'data-closed:fade-out-0 data-open:fade-in-0',
            'data-closed:zoom-out-95 data-open:zoom-in-95',
            'flex flex-col gap-4 rounded-xl ring-1 duration-100',
            'fixed top-1/2 left-1/2 z-5100 w-full max-w-[500px]',
            '-translate-x-1/2 -translate-y-1/2 outline-none',
          )}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-2 gap-2 border-b border-border">
            <div className="font-medium">{step.title}</div>

            {showClose && (
              <Button onClick={close} variant="ghost" size="icon-sm" aria-label="Close tutorial">
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col px-4 text-sm">{step.description}</div>

          {/* Footer */}
          <div
            className={cn(
              'grid grid-cols-3 items-center justify-between gap-2 border-t border-border p-2 bg-muted/50',
            )}
          >
            <div>
              {showPrevious && (
                <Button onClick={previous} variant="outline" size="default">
                  Previous
                </Button>
              )}
            </div>

            {/* Progress and Skip */}
            <span className="text-muted-foreground text-sm text-center">
              {currentStep} of {totalSteps}
            </span>

            <div className="flex items-center justify-end gap-2">
              {!isLastStep && (
                <button
                  onClick={close}
                  className="text-xs underline hover:text-foreground transition-colors"
                >
                  Skip tutorial
                </button>
              )}

              {showNext && (
                <Button onClick={next} variant="default" size="default">
                  {isLastStep ? (step.doneBtnText ?? 'Finish') : 'Next'}
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Main tutorial popover component
 * Renders either a positioned popover or centered dialog based on step
 */
export function TutorialPopover() {
  const step = useCurrentStep();

  if (!step) {
    return null;
  }

  // Use popover for steps with target elements, dialog for centered steps
  if (step.element) {
    return createPortal(<PopoverContent step={step} />, document.body);
  }

  return createPortal(<DialogContent step={step} />, document.body);
}
