import type { TutorialStep } from '@/components/tutorial';

export const umaBassinSteps: Array<TutorialStep> = [
  {
    title: 'Welcome to Compare Uniques! 📈',
    description: (
      <div className="flex flex-col gap-2 text-muted-foreground">
        <div>
          Compare Uniques helps you analyze and compare the effectiveness of each Uma's Unique Skill
          for your race settings.
        </div>
        <div>Let's learn how to use this comprehensive analysis tool!</div>
      </div>
    ),
    showButtons: ['next', 'close']
  },
  {
    element: '[data-tutorial="uma-bassin-controls"]',
    title: 'Running Uma Simulations',
    description: (
      <div className="flex flex-col gap-2 text-muted-foreground">
        <div>
          Similar to Compare Skills, but focuses only on the Uma's Unique Skill's effectiveness.
        </div>

        <div>
          This helps you understand and pick which Uniques work best for the selected race settings.
        </div>

        <div>
          Click <strong className="text-foreground">"Run Skill Simulations"</strong> to start the
          analysis.
        </div>
      </div>
    ),
    side: 'bottom',
    align: 'start',
    showButtons: ['previous', 'next', 'close']
  },
  {
    element: '[data-tutorial="uma-bassin-chart"]',
    title: 'Performance Analysis',
    description: (
      <div className="flex flex-col gap-2 text-muted-foreground">
        <div>
          After running simulations, you'll see the same statistics as Compare Skills, but only for
          the Uma's Unique Skill.
        </div>
      </div>
    ),
    side: 'top',
    align: 'center',
    showButtons: ['previous', 'next', 'close']
  },
  {
    title: 'Finishing Up 🎯',
    description: (
      <div className="flex flex-col gap-2 text-muted-foreground">
        Like Compare Skills, you can combine this with the main Umalator comparison to measure two
        runners so you can choose which runner works best for the race settings.
      </div>
    ),
    showButtons: ['close', 'next'],
    doneBtnText: 'Got it!'
  }
];
