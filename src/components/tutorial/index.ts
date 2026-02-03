/**
 * Tutorial System
 *
 * Custom tutorial library built with React and Base UI components.
 * Provides guided tours with spotlight highlighting and positioned popovers.
 *
 * @example
 * ```tsx
 * import { TutorialProvider, useTutorial } from '@/components/tutorial';
 * import { tutorialSteps } from './steps';
 *
 * function App() {
 *   return (
 *     <TutorialProvider>
 *       <MyApp />
 *       <TutorialRoot />
 *     </TutorialProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { start } = useTutorial();
 *
 *   return (
 *     <button onClick={() => start('my-tutorial', tutorialSteps)}>
 *       Start Tutorial
 *     </button>
 *   );
 * }
 * ```
 */

export {
  TutorialProvider,
  useTutorial,
  useCurrentStep,
  useTutorialProgress,
} from './tutorial-context';
export { TutorialRoot } from './tutorial-root';
export { TutorialOverlay } from './tutorial-overlay';
export { TutorialPopover } from './tutorial-popover';
export type { TutorialStep, TutorialConfig, TutorialId } from './types';
