import type { DriveStep } from 'driver.js';

export const skillBassinSteps: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Skill Chart! 📊',
      description: `
        <p class="mb-3">The Skill Chart helps you analyze and compare the effectiveness of individual skills in your runner's build.</p>
        <p>Let's explore how to use this powerful analysis tool!</p>
      `,
      showButtons: ['next', 'close'],
    },
  },
  {
    element: '[data-tutorial="skill-bassin-controls"]',
    popover: {
      title: 'Running Skill Simulations',
      description: `
        <p class="mb-3">This section allows you to run simulations that analyze individual skills.</p>
        <p class="mb-3">First, make sure your runner has skills configured (go back to the main Umalator tab if needed).</p>
        <p>Click <strong>"Run Skill Simulations"</strong> to start analyzing your runner's skills.</p>
      `,
      side: 'bottom',
      align: 'start',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    element: '[data-tutorial="skill-bassin-table"]',
    popover: {
      title: 'Skill Comparison Table',
      description: `
        <p class="mb-3">After running simulations, this table shows statistics for each skill:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Skill Name</strong>: The skill being analyzed</li>
          <li><strong>Minimum/Maximum</strong>: Best and worst performance with the skill</li>
          <li><strong>Mean</strong>: Average performance improvement</li>
          <li><strong>Median</strong>: Middle value of all runs</li>
        </ul>
        <p>Click on column headers to sort by different metrics.</p>
      `,
      side: 'top',
      align: 'center',
      showButtons: ['previous', 'next', 'close'],
    },
  },
  {
    popover: {
      title: 'Understanding the Results 💡',
      description: `
        <p class="mb-3">The Skill Chart runs multiple simulations comparing your runner <strong>with</strong> and <strong>without</strong> each skill to measure its impact.</p>
        <h4 class="font-semibold mb-2">Tips for Analysis:</h4>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Higher mean values indicate more effective skills</li>
          <li>Large difference between min/max suggests skill inconsistency</li>
          <li>Use this data to optimize your skill selection</li>
        </ul>
        <p>Combine this with the main Umalator comparison for complete build optimization!</p>
      `,
      showButtons: ['close'],
      doneBtnText: 'Got it!',
    },
  },
];
