import type { TutorialStep } from '@/components/tutorial';

export const umaBassinSteps: Array<TutorialStep> = [
  {
    title: 'Welcome to Uma Chart! 📈',
    description: (
      <>
        <p className="mb-3">
          The Uma Chart provides deep analysis of your runner's overall performance across multiple
          simulations.
        </p>
        <p>Let's learn how to use this comprehensive analysis tool!</p>
      </>
    ),
    showButtons: ['next', 'close'],
  },
  {
    element: '[data-tutorial="uma-bassin-controls"]',
    title: 'Running Uma Simulations',
    description: (
      <>
        <p className="mb-3">
          Similar to Skill Chart, but focuses on overall runner performance rather than individual
          skills.
        </p>
        <p className="mb-3">
          This helps you understand your complete build's consistency and effectiveness.
        </p>
        <p>
          Click <strong>"Run Skill Simulations"</strong> to start the analysis.
        </p>
      </>
    ),
    side: 'bottom',
    align: 'start',
    showButtons: ['previous', 'next', 'close'],
  },
  {
    element: '[data-tutorial="uma-bassin-chart"]',
    title: 'Performance Analysis',
    description: (
      <>
        <p className="mb-3">After running simulations, you'll see comprehensive statistics:</p>
        <ul className="list-disc list-inside space-y-1 mb-3">
          <li>
            <strong>Overall Performance</strong>: Aggregate metrics across all runs
          </li>
          <li>
            <strong>Consistency</strong>: How stable your build performs
          </li>
          <li>
            <strong>Distribution</strong>: Range of possible outcomes
          </li>
        </ul>
        <p>Use this data to understand the reliability of your runner configuration.</p>
      </>
    ),
    side: 'top',
    align: 'center',
    showButtons: ['previous', 'next', 'close'],
  },
  {
    title: 'Putting It All Together 🎯',
    description: (
      <>
        <p className="mb-3">Now you have access to three powerful tools:</p>
        <h4 className="font-semibold mb-2">Umalator (Compare Runners)</h4>
        <p className="mb-3">Direct comparison of two runner configurations</p>
        <h4 className="font-semibold mb-2">Skill Chart</h4>
        <p className="mb-3">Individual skill effectiveness analysis</p>
        <h4 className="font-semibold mb-2">Uma Chart</h4>
        <p className="mb-3">Overall build performance and consistency</p>
        <p>
          Use all three in combination to create the optimal runner build for your target races!
        </p>
      </>
    ),
    showButtons: ['close'],
    doneBtnText: 'Start Analyzing!',
  },
];
