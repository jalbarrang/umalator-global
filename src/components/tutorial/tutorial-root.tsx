/**
 * Tutorial Root Component
 *
 * Main composition component that renders the tutorial overlay and popover.
 * Manages keyboard navigation (Escape to skip, arrows to navigate).
 */

import { useEffect } from 'react';
import { useCurrentStep, useTutorial } from './tutorial-context';
import { TutorialOverlay } from './tutorial-overlay';
import { TutorialPopover } from './tutorial-popover';

export function TutorialRoot() {
  const { isActive, close, next, previous } = useTutorial();
  const currentStep = useCurrentStep();

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previous();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, next, previous, close]);

  if (!isActive || !currentStep) {
    return null;
  }

  return (
    <>
      {/* Overlay with spotlight */}
      <TutorialOverlay targetSelector={currentStep.element} padding={10} radius={8} />

      {/* Popover with step content */}
      <TutorialPopover />
    </>
  );
}
