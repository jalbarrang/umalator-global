export type ChangelogEntry = {
  version: string;
  date: string;
  changes: Array<{
    type: 'added' | 'changed' | 'fixed' | 'removed';
    items: Array<string>;
  }>;
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
export const changelog: Array<ChangelogEntry> = [
  {
    version: '0.2.1',
    date: '2025-12-09',
    changes: [
      {
        type: 'fixed',
        items: [
          '[Stamina] Fixed dual-effect debuff skills (Stamina Eater, Stamina Siphon) not showing self-healing component',
          '[Stamina] Recovery skills now correctly detect and display healing from skills that both drain HP from opponents and heal self',
        ],
      },
      {
        type: 'changed',
        items: [
          '[Technical] Enhanced getRecoverySkillInfo to process all type 9 effects and distinguish between self-targeting and other-targeting based on target field',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-12-06',
    changes: [
      {
        type: 'added',
        items: [
          '[Runners] Added Copy and Swap buttons to runner cards for quick data transfer between Uma 1 and Uma 2',
          '[Runners] Added tab system in Runners panel to switch between Uma 1, Uma 2, and Pacer (when virtual pacemaker is enabled)',
          '[Runners] Added uma selector for Skill Chart and Uma Chart modes - choose which uma to use as the simulation base',
          '[Runners] Skills and uma changes from chart results now apply to the selected target uma',
        ],
      },
      {
        type: 'changed',
        items: [
          '[UI] Runners panel now uses tabs in all modes - only one runner card is shown at a time for cleaner interface',
          '[UI] Tab colors match uma colors: blue for Uma 1, red for Uma 2, green for Pacer',
        ],
      },
      {
        type: 'fixed',
        items: [
          '[Runners] Random placeholder mob image is now persistent per runner and no longer changes when switching tabs',
        ],
      },
    ],
  },
  {
    version: '0.1.9',
    date: '2025-12-06',
    changes: [
      {
        type: 'added',
        items: [
          '[Simulation] Each simulation mode (Compare, Skill chart, Uma chart) now retains its own data independently',
          '[Simulation] Switching between modes no longer requires re-running simulations',
        ],
      },
    ],
  },
  {
    version: '0.1.8',
    date: '2025-12-05',
    changes: [
      {
        type: 'added',
        items: ['[UI] Moved the tooltip to the top left of the race track'],
      },
      {
        type: 'changed',
        items: [
          '[Skill Chart] Updated to use Shadcn UI components',
          '[Skill Chart] Added a loader when the skill chart is loading',
        ],
      },
    ],
  },
  {
    version: '0.1.7',
    date: '2025-12-05',
    changes: [
      {
        type: 'fixed',
        items: [
          '[UI] Fixed mobile scrolling - content can now be scrolled on mobile devices',
          '[UI] Fixed sidebar to be responsive - full width on mobile, 450px on desktop',
          '[UI] Fixed header buttons to show icons only on mobile screens',
          '[UI] Fixed runner card grids to be single column on mobile for better usability',
        ],
      },
    ],
  },
  {
    version: '0.1.6',
    date: '2025-12-05',
    changes: [
      {
        type: 'added',
        items: [
          '[Simulation] Enabled Dueling (Compete Fight) mechanic on the final straight',
        ],
      },
      {
        type: 'fixed',
        items: [
          '[Simulation] Fixed Dueling to properly check proximity (distance < 3m, lane < 0.25), top 50% placement, and speed gap < 0.6 m/s',
          '[Simulation] Fixed Dueling target speed exponent from 0.709 to 0.708 per race mechanics spec',
          '[Simulation] Fixed Lead Competition (Spot Struggle) to check lane gap proximity (Front Runner: 0.165, Oonige: 0.416)',
        ],
      },
    ],
  },
  {
    version: '0.1.5',
    date: '2025-12-05',
    changes: [
      {
        type: 'added',
        items: [
          '[Stamina] Added tracking for stamina debuffs received from opponents',
          '[Stamina] Added separate display for recovery skills (green) and debuffs received (red)',
          '[Stamina] Added theoretical debuff estimation based on opponent equipped skills',
          '[Stamina] Added net HP effect display when both heals and debuffs are present',
          '[Stamina] Added per-phase debuff breakdown in Phase Breakdown section',
        ],
      },
      {
        type: 'fixed',
        items: [
          '[Stamina] Fixed debuffs from opponents not being tracked or displayed for the affected runner',
          '[Stamina] Fixed HP calculations not accounting for incoming debuffs',
        ],
      },
      {
        type: 'changed',
        items: [
          '[Technical] Added debuffsReceived field to simulation data structure',
          '[Technical] Updated skill tracking to separately record debuffs by affected runner',
        ],
      },
    ],
  },
  {
    version: '0.1.4',
    date: '2025-12-05',
    changes: [
      {
        type: 'added',
        items: [
          '[Runner] Added OCR Import feature (WIP) to extract uma data from screenshots using Tesseract.js',
          '[Runner] Import dialog with drag-and-drop file upload and image previews',
          '[Runner] Auto-detection of Uma identity (outfit name + uma name) with manual selection fallback',
          '[Runner] Auto-extraction of stats (Speed, Stamina, Power, Guts, Wisdom) with inline editing',
          '[Runner] Fuzzy matching for skill names against the skill database',
          '[Runner] Ability to remove incorrectly detected skills before applying',
          '[Runner] Image preprocessing (grayscale, threshold) to improve OCR accuracy',
        ],
      },
      {
        type: 'fixed',
        items: [
          '[Runner] Fixed inherited unique skills showing as original version in OCR import',
        ],
      },
      {
        type: 'changed',
        items: [
          '[Technical] Refactored runner data lookups into dedicated search module with fuzzy matching utilities',
          '[Technical] Split OCR functionality into modular files (parser, stats, uma, skills)',
        ],
      },
    ],
  },
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
