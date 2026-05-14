/**
 * Tutorial Overlay Component
 *
 * Creates a semi-transparent backdrop with an SVG-based spotlight cutout
 * that highlights the target element. Animates between steps smoothly.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ElementBounds } from './types';

type TutorialOverlayProps = {
  /** CSS selector for the element to highlight */
  targetSelector?: string;
  /** Padding around the highlighted element */
  padding?: number;
  /** Corner radius of the spotlight cutout */
  radius?: number;
};

/**
 * Calculates the bounds of a target element with padding
 */
function getElementBounds(element: Element | null, padding: number): ElementBounds | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    bottom: rect.bottom + padding,
    right: rect.right + padding
  };
}

function restoreTargetElement(element: Element | null) {
  if (!element) {
    return;
  }

  const el = element as HTMLElement;
  const originalZIndex = el.dataset.originalZIndex || '';
  const originalPosition = el.dataset.originalPosition || '';

  Object.assign(el.style, {
    zIndex: originalZIndex,
    position: originalPosition
  });
  delete el.dataset.tutorialHighlighted;
  delete el.dataset.originalZIndex;
  delete el.dataset.originalPosition;
}

export function TutorialOverlay({
  targetSelector,
  padding = 10,
  radius = 8
}: TutorialOverlayProps) {
  const [overlay, setOverlay] = useState<{
    bounds: ElementBounds | null;
    visible: boolean;
  }>({ bounds: null, visible: false });
  const targetElementRef = useRef<Element | null>(null);

  // Calculate bounds when target changes
  useLayoutEffect(() => {
    restoreTargetElement(targetElementRef.current);
    targetElementRef.current = null;

    if (!targetSelector) {
      setOverlay({ bounds: null, visible: true });
      return;
    }

    const element = document.querySelector(targetSelector);
    const newBounds = getElementBounds(element, padding);

    if (newBounds && element) {
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Boost z-index of highlighted element and create stacking context
      const htmlEl = element as HTMLElement;
      const originalZIndex = htmlEl.style.zIndex;
      const originalPosition = htmlEl.style.position;

      Object.assign(htmlEl.style, {
        zIndex: '5050',
        position: 'relative' // Create stacking context for children
      });
      htmlEl.dataset.tutorialHighlighted = 'true';

      // Store original values for cleanup
      htmlEl.dataset.originalZIndex = originalZIndex;
      htmlEl.dataset.originalPosition = originalPosition;
    }

    targetElementRef.current = element;
    setOverlay({ bounds: newBounds, visible: true });
  }, [targetSelector, padding]);

  // Cleanup: restore original styles when component unmounts
  useEffect(() => {
    return () => {
      restoreTargetElement(targetElementRef.current);
      targetElementRef.current = null;
    };
  }, []);

  // Listen for window resize and scroll to update bounds
  useEffect(() => {
    if (!targetSelector || !overlay.bounds) return;

    const updateBounds = () => {
      const element = document.querySelector(targetSelector);
      const newBounds = getElementBounds(element, padding);
      if (newBounds) {
        setOverlay((current) => ({ ...current, bounds: newBounds }));
      }
    };

    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
    };
  }, [targetSelector, padding, overlay.bounds]);

  return createPortal(
    <div
      className="fixed inset-0 z-5000 transition-opacity duration-200"
      style={{
        opacity: overlay.visible ? 1 : 0
      }}
      data-tutorial-overlay
    >
      {/* SVG overlay with spotlight cutout */}
      <svg
        width="100%"
        height="100%"
        className="pointer-events-none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {overlay.bounds && (
            <mask id="tutorial-spotlight-mask">
              {/* White background makes everything visible */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cutout makes the target area transparent */}
              <rect
                x={overlay.bounds.left}
                y={overlay.bounds.top}
                width={overlay.bounds.width}
                height={overlay.bounds.height}
                rx={radius}
                ry={radius}
                fill="black"
              />
            </mask>
          )}
        </defs>

        {/* Semi-transparent overlay with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="color-mix(in srgb, var(--color-black) 90%, transparent)"
          mask={overlay.bounds ? 'url(#tutorial-spotlight-mask)' : undefined}
          className="transition-all duration-300 ease-in-out"
        />

        {/* Highlighted element outline */}
        {overlay.bounds && (
          <rect
            x={overlay.bounds.left}
            y={overlay.bounds.top}
            width={overlay.bounds.width}
            height={overlay.bounds.height}
            rx={radius}
            ry={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="transition-all duration-300 ease-in-out pointer-events-none"
          />
        )}
      </svg>
    </div>,
    document.body
  );
}
