export type ChangelogEntry = {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    items: string[];
  }[];
};

/**
 * Changelog entries for the Umalator project.
 * Add new entries at the TOP of this array (newest first).
 *
 * Example entry:
 * {
 *   version: '1.1.0',
 *   date: '2025-02-01',
 *   changes: [
 *     { type: 'added', items: ['New feature X', 'New feature Y'] },
 *     { type: 'changed', items: ['Improved performance of Z'] },
 *     { type: 'fixed', items: ['Bug where A happened'] },
 *     { type: 'removed', items: ['Deprecated feature B'] },
 *   ],
 * },
 */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.3',
    date: '2025-12-04',
    changes: [
      {
        type: 'added',
        items: [
          '[UI] Added empty states to simulation result tabs (Distribution, Runner Stats, Skills) with contextual guidance',
          '[Simulation] Added toggle to switch between Theoretical and Actual data in Stamina tab after running a simulation',
          '[Simulation] Added theoretical recovery skill estimation based on equipped skills and phase conditions',
        ],
      },
      {
        type: 'changed',
        items: [
          '[Technical] Refactored Stamina tab into modular hooks (useStaminaAnalysis, useRecoverySkills, usePhaseHp) and presentation components',
        ],
      },
    ],
  },
  {
    version: '0.1.2',
    date: '2025-12-04',
    changes: [
      {
        type: 'changed',
        items: [
          '[UI] Reorganized settings into separate panels: Race Settings (track/weather) and Advanced Settings (simulation options)',
          '[UI] Moved Simulation Mode toggle (Compare/Skill chart/Uma chart) beside track title for better context',
          '[UI] Integrated Wit Variance settings inline in Advanced Settings panel',
        ],
      },
      {
        type: 'removed',
        items: ['[UI] Removed Wit Variance modal in favor of inline settings'],
      },
    ],
  },
  {
    version: '0.1.1',
    date: '2025-12-04',
    changes: [
      {
        type: 'added',
        items: [
          '[UI] Added a "Race Settings" button next to the track title for easier access to the settings panel',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-12-04',
    changes: [
      {
        type: 'added',
        items: [
          '[App] Initial release of Umalator Global',
          '[Simulation] Added post simulation Stamina calculator for both runners',
        ],
      },
      {
        type: 'changed',
        items: [
          '[UI] Started new UI design for easier use',
          '[UI] Revamped the skill list into a skill picker modal for quick skill selection',
        ],
      },
      {
        type: 'changed',
        items: [
          '[Technical] Refactored all UI code from Preact to React',
          '[Technical] Added Shadcn UI components to the project for consistent styling',
        ],
      },
    ],
  },
];
