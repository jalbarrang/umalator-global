import type { DriveStep } from 'driver.js';

export const umalatorSteps: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Umalator! 🏇',
      description: `
        <p class="mb-3">Umalator is a horse racing simulator that helps you optimize runner builds and compare performance.</p>
        <p>Let's run your first simulation together!</p>
      `,
      showButtons: ['next', 'close'],
    },
  },
  {
    element: '[data-tutorial="runner-stats"]',
    popover: {
      title: 'Configure Your Runner',
      description: `
        <p class="mb-3">These stats represent your horse's abilities:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Speed</strong>: Affects acceleration and top speed</li>
          <li><strong>Stamina</strong>: Determines how long you can maintain speed</li>
          <li><strong>Power</strong>: Hill climbing and acceleration power</li>
          <li><strong>Guts</strong>: Endurance in the final stretch</li>
          <li><strong>Wit</strong>: Skill activation and positioning</li>
        </ul>
        <p>The default values are already set - we'll use these for now.</p>
      `,
      side: 'right',
      align: 'start',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="skills-section"]',
    popover: {
      title: 'Add Skills',
      description: `
        <p class="mb-3">Skills give your runner special abilities during the race.</p>
        <p class="mb-3">Click the <strong>"Add Skills"</strong> button to select from available skills. Skills can activate at different race phases and provide various bonuses.</p>
        <p>For this tutorial, you can continue without adding skills, or add some to test their effects!</p>
      `,
      side: 'right',
      align: 'start',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="race-settings"]',
    popover: {
      title: 'Race Conditions',
      description: `
        <p class="mb-3">Different conditions affect performance:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Track</strong>: Venue and distance</li>
          <li><strong>Weather</strong>: Sunny, Cloudy, Rainy, Snowy</li>
          <li><strong>Season</strong>: Affects weather likelihood</li>
          <li><strong>Ground</strong>: Surface firmness (Firm is fastest)</li>
        </ul>
        <p>We'll use the default conditions for this demo.</p>
      `,
      side: 'top',
      align: 'center',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="simulation-controls"]',
    popover: {
      title: 'Run Your First Simulation',
      description: `
        <p class="mb-3">Time to run the simulation!</p>
        <p class="mb-3"><strong>"Run all samples"</strong> will simulate the race multiple times (50+ runs) to get accurate statistics. This is recommended for reliable results.</p>
        <p class="mb-3"><strong>"Run one sample"</strong> runs a single quick simulation for testing.</p>
        <p>Click the green <strong>"Run all samples"</strong> button to begin.</p>
      `,
      side: 'bottom',
      align: 'start',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="race-visualization"]',
    popover: {
      title: 'Race Visualization',
      description: `
        <p class="mb-3">This visualization shows the race track with phase markers:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Early-race</strong>: Initial positioning</li>
          <li><strong>Mid-race</strong>: Main race portion</li>
          <li><strong>Late-race</strong>: Approaching finish</li>
          <li><strong>Last spurt</strong>: Final sprint</li>
        </ul>
        <p>After running a simulation, you'll see the runner's position plotted throughout the race.</p>
      `,
      side: 'bottom',
      align: 'center',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="results-tabs"]',
    popover: {
      title: 'View Your Results',
      description: `
        <p class="mb-3">After simulation, explore these tabs to analyze performance:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Runner Stats</strong>: Finish times, top speeds, HP usage</li>
          <li><strong>Distribution</strong>: Statistical spread of results</li>
          <li><strong>Skills</strong>: When and how often skills activated</li>
        </ul>
        <p>The race visualization above shows your runner's position throughout the race.</p>
      `,
      side: 'top',
      align: 'center',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    popover: {
      title: "You're All Set! 🎉",
      description: `
        <p class="mb-3">Now you know the basics! Here are some next steps:</p>
        <h4 class="font-semibold mb-2">Compare Runners</h4>
        <p class="mb-3">• Click "Uma 2" to configure a second runner<br/>• Both will race together for direct comparison</p>
        <h4 class="font-semibold mb-2">Optimize Your Build</h4>
        <p class="mb-3">• Try different skill combinations<br/>• Adjust stats to find the best balance</p>
        <h4 class="font-semibold mb-2">Advanced Analysis</h4>
        <p class="mb-3">• Use "Skill Chart" to analyze individual skill effectiveness<br/>• Use "Uma Chart" for deep performance metrics</p>
        <h4 class="font-semibold mb-2">Save Your Work</h4>
        <p>• Use "Save to Veterans" to store favorite builds<br/>• Load presets to quickly test different races</p>
      `,
      showButtons: ['close'],
      doneBtnText: 'Get Started!',
    },
  },
];
