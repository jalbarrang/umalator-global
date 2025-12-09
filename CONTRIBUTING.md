# Contributing to Umalator-Global

## Introduction

This guide will help you set up a development environment, understand the codebase structure, and contribute to the Umalator-Global project. Whether you're updating game data, fixing bugs, or adding new features, this document provides the information you need.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Bun** (v1.0 or later)
   - JavaScript runtime with native SQLite support
   - Download from [bun.sh](https://bun.sh)
   - Replaces Node.js for this project
   - Used for both development and data extraction

### Game Data Access

You need access to the game's `master.mdb` file for data extraction:

**Location (Windows):**

```
%APPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb
```

Full path typically:

```
C:\Users\[YourUsername]\AppData\LocalLow\Cygames\Umamusume\master\master.mdb
```

**Location (Steam Deck / Linux via Proton):**

```
~/.local/share/Steam/steamapps/compatdata/[AppID]/pfx/drive_c/users/steamuser/AppData/LocalLow/Cygames/Umamusume/master/master.mdb
```

**How to Find:**

1. Ensure Uma Musume is installed
2. Run the game at least once to generate the master.mdb file
3. Navigate to the path above
4. The file is a SQLite database containing all game data

**Note:** The `master.mdb` file updates with game patches. You'll need to re-extract data after game updates to keep the simulator current.

## Project Structure

Understanding the project layout:

```
umalator-global/
├── src/                          # Main application source
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Root component with routing
│   ├── app.css                   # Application styles
│   ├── styles.css                # Global styles
│   │
│   ├── modules/                  # Feature modules
│   │   ├── simulation/           # Race simulation engine
│   │   │   ├── lib/              # Core simulation logic
│   │   │   │   ├── RaceSolver.ts           # Main race simulator
│   │   │   │   ├── RaceSolverEnhanced.ts   # Enhanced position keeping
│   │   │   │   ├── RaceSolverBuilder.ts    # Builder pattern
│   │   │   │   ├── ConditionParser.ts      # Skill condition parsing
│   │   │   │   ├── CourseData.ts           # Course/track data handling
│   │   │   │   ├── HorseTypes.ts           # Uma musume type definitions
│   │   │   │   ├── RaceParameters.ts       # Race configuration types
│   │   │   │   └── tools/
│   │   │   │       └── ConditionMatcher.ts # Condition matching logic
│   │   │   ├── hooks/            # Simulation React hooks
│   │   │   ├── stores/           # Module-specific Zustand stores
│   │   │   ├── tabs/             # Result visualization tabs
│   │   │   └── types.ts          # Type definitions
│   │   │
│   │   ├── skills/               # Skill system
│   │   │   ├── components/       # Skill UI components
│   │   │   ├── store.ts          # Skill state management
│   │   │   ├── query.ts          # Skill data queries
│   │   │   └── utils.ts          # Skill utilities
│   │   │
│   │   ├── racetrack/            # Course visualization
│   │   │   ├── components/       # Track UI components
│   │   │   │   ├── RaceTrack.tsx         # Main track visualization
│   │   │   │   ├── skill-marker.tsx      # Skill activation markers
│   │   │   │   ├── slope-visualization.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/            # Track-related hooks
│   │   │   └── courses.ts        # Course data utilities
│   │   │
│   │   ├── runners/              # Uma musume configuration
│   │   │   ├── components/       # Runner UI components
│   │   │   │   ├── runners-panel.tsx
│   │   │   │   ├── StatInput.tsx
│   │   │   │   ├── StrategySelect.tsx
│   │   │   │   └── ...
│   │   │   ├── ocr/              # OCR import functionality
│   │   │   └── utils.ts
│   │   │
│   │   └── data/                 # Game data files (JSON)
│   │       ├── skill_data.json   # Extracted skill data
│   │       ├── skillnames.json   # Skill name translations
│   │       ├── skill_meta.json   # Skill metadata (icons, rarity)
│   │       ├── course_data.json  # Extracted course data
│   │       ├── umas.json         # Uma musume character data
│   │       └── tracknames.json   # Track name translations
│   │
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # Radix UI components
│   │   ├── bassin-chart/         # Skill efficacy chart
│   │   └── ...
│   │
│   ├── store/                    # Global Zustand stores
│   │   ├── runners.store.ts      # Runner state management
│   │   ├── settings.store.ts     # Application settings
│   │   ├── theme.store.ts        # Theme management
│   │   └── ui.store.ts           # UI state
│   │
│   ├── workers/                  # Web Workers for simulations
│   │   ├── simulator.worker.ts   # Main simulation worker
│   │   ├── skill-basin.worker.ts # Skill basin worker
│   │   ├── uma-basin.worker.ts   # Uma basin worker
│   │   ├── ocr.worker.ts         # OCR processing worker
│   │   └── pool/                 # Worker pool management
│   │
│   ├── layout/                   # Layout components
│   ├── pages/                    # Page components
│   ├── hooks/                    # Shared React hooks
│   ├── i18n/                     # Internationalization
│   └── utils/                    # Utility functions
│
├── cli/                          # Command-line tools
│   ├── skillgrep.ts              # Search skills by name/condition
│   ├── dump.ts                   # Dump race simulation data
│   ├── speedguts.ts              # Speed/guts analysis tool
│   └── data/                     # CLI data utilities
│
├── scripts/                      # Data extraction Perl scripts
│   ├── update.bat                # Windows: Update all data
│   ├── make_global_skill_data.pl       # Extract skill data
│   ├── make_global_skillnames.pl       # Extract skill names
│   ├── make_global_skill_meta.pl       # Extract skill metadata
│   ├── make_global_uma_info.pl         # Extract uma data
│   └── make_global_course_data.pl      # Extract course data
│
├── courseeventparams/            # Course event parameter JSONs
│   └── [course files].json       # Course geometry data
│
├── public/                       # Static assets
│   ├── fonts/                    # Font files
│   └── icons/                    # Icon images
│
├── dist/                         # Build output (generated)
│   ├── index.html
│   └── assets/                   # Bundled JS, CSS, and workers
│
└── Configuration files
    ├── package.json              # Dependencies and scripts
    ├── tsconfig.json             # TypeScript configuration
    ├── vite.config.ts            # Vite build configuration
    ├── eslint.config.mjs         # ESLint configuration
    ├── components.json           # Radix UI components config
    └── .prettierrc               # Prettier code formatting
```

## Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone [repository-url]
cd umalator-global

# Install Node.js dependencies
npm install
```

### 2. Extract Game Data

**Extract all data at once:**

```bash
bun run extract:all
```

The script will automatically find `master.mdb` in the default location, or you can specify a custom path:

```bash
bun run extract:all /path/to/master.mdb
```

**Extract individual data files:**

```bash
bun run extract:skill-meta      # Skill metadata
bun run extract:skillnames       # Skill names (EN/JP)
bun run extract:skill-data       # Skill mechanics
bun run extract:uma-info         # Uma musume data
bun run extract:course-data      # Course/track data
```

**Note on Course Data:**
The course extraction requires course event parameter JSON files in the `courseeventparams/` directory. These files contain detailed course geometry (corners, slopes, etc.) and must be extracted separately from the game assets.

**Legacy Perl Scripts:**
Legacy Perl scripts are preserved in `scripts/legacy/` for reference but are no longer maintained. The new Bun-based TypeScript scripts are 3-6x faster and don't require Perl installation.

### 3. Build and Run the Application

**Development Server (with hot reload):**

```bash
npm run dev
```

Default port is typically 5173. Access at `http://localhost:5173`

The dev server automatically rebuilds when source files change.

**Production Build:**

```bash
npm run build
```

Generates optimized output in the `dist/` directory.

**Preview Production Build:**

```bash
npm run preview
```

Serves the production build locally for testing.

**Other Useful Commands:**

```bash
npm run typecheck    # Check TypeScript types without building
npm run lint         # Run ESLint to check code quality
npm run format       # Format code with Prettier
npm run test         # Run tests with Vitest
npm run test:watch   # Run tests in watch mode
```

### Build Configuration

The build uses **Vite** with the following configuration (`vite.config.ts`):

**Plugins:**

- **@vitejs/plugin-react**: Enables React support with React Compiler (babel-plugin-react-compiler)
- **@tailwindcss/vite**: Integrates Tailwind CSS

**Path Aliases:**

- `@` → `./src`
- `@data` → `./src/modules/data`
- `@simulation` → `./src/modules/simulation`
- `@skills` → `./src/modules/skills`

These aliases can be used in imports:

```typescript
import { RaceSolver } from '@simulation/lib/RaceSolver';
import skillData from '@data/skill_data.json';
```

**Global Constants:**

- `CC_DEBUG`: Set to `true` in development, `false` in production

## Data Update Workflow

When the game updates, you'll need to refresh the data:

### Step-by-Step Update Process

1. **Update the game** and ensure `master.mdb` is current

2. **Extract new data:**

   ```bash
   bun run extract:all
   # or run individual scripts as needed
   ```

3. **Verify the data:**
   - Check that JSON files in `src/modules/data/` are valid
   - Look for new skills, umas, or courses
   - Test with the dev server

4. **Rebuild the application:**

   ```bash
   npm run build
   ```

5. **Test thoroughly:**
   - Test new skills for correct behavior
   - Verify course data accuracy
   - Check for any breaking changes

### Data Extraction Scripts

All scripts are TypeScript files in the `scripts/` directory using Bun's native SQLite support. They output to `src/modules/data/`.

See [`scripts/README.md`](scripts/README.md) for detailed documentation.

#### `extract-skill-data.ts`

Extracts skill effects, conditions, and parameters from the database.

**Key Features:**

- Applies 1.2x modifier to scenario skills
- Handles split alternatives (Seirios special case)
- Processes up to 2 alternatives and 3 effects per skill

**Output:** `src/modules/data/skill_data.json`

#### `extract-skillnames.ts`

Extracts skill names in both Japanese and English. Automatically generates inherited versions for unique skills.

**Output:** `src/modules/data/skillnames.json`

#### `extract-skill-meta.ts`

Generates metadata for skills (icon IDs, SP costs, display order).

**Output:** `src/modules/data/skill_meta.json`

#### `extract-uma-info.ts`

Extracts uma musume character data. Filters out unimplemented umas by checking if their unique skills exist.

**Output:** `src/modules/data/umas.json`

#### `extract-course-data.ts`

Processes course geometry, corners, slopes, and track characteristics.

**Requirements:**

- `master.mdb` for track metadata
- `courseeventparams/*.json` for course geometry

**Output:** `src/modules/data/course_data.json`

#### `extract-all.ts`

Master script that runs all extraction scripts in sequence with error handling and progress reporting.

## Code Structure and Key Components

### Technology Stack

The application uses modern web technologies:

- **React 19**: UI framework with concurrent features
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI component primitives
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing
- **i18next**: Internationalization (EN/JP)
- **Vitest**: Unit testing framework
- **ESLint + Prettier**: Code quality and formatting

### Application Entry Point

**`src/main.tsx`**

Main entry point that sets up:

- React root rendering
- React Router (BrowserRouter)
- PostHog analytics provider (optional)
- Global CSS imports
- Toast notifications

**`src/App.tsx`**

Root component containing:

- React Router routes configuration
- Layout components
- Page routing (Compare, Skill Basin, Uma Basin)

### State Management

The application uses **Zustand** for state management with stores organized by concern:

**Global Stores (`src/store/`):**

- `runners.store.ts`: Uma musume configuration state
- `settings.store.ts`: Application settings
- `theme.store.ts`: Theme (light/dark mode)
- `ui.store.ts`: UI state (modals, panels)

**Module Stores:**

- `src/modules/simulation/stores/`: Simulation-specific state
- `src/modules/skills/store.ts`: Skill selection state

### Web Worker Threads

**`src/workers/`**

Simulations run in background threads to keep the UI responsive:

**Main Workers:**

- `simulator.worker.ts`: Single race simulations
- `skill-basin.worker.ts`: Skill efficacy comparisons
- `uma-basin.worker.ts`: Uma performance analysis
- `ocr.worker.ts`: OCR image processing

**Worker Pool:**

- `pool/`: Worker pool management for parallel simulations
- Distributes work across multiple worker instances

**Message Protocol:**

- Workers receive: Configuration (horse, course, parameters)
- Workers return: Simulation results (velocities, skill activations, statistics)

### Core Simulation Engine

**`src/modules/simulation/lib/`**

Contains the race simulation logic implementing Uma Musume game mechanics.

#### Main Simulation Files

**`RaceSolver.ts`**

Core race simulation logic:

- Physics calculations (velocity, acceleration)
- Stamina/HP management
- Skill activation checking
- Base position keeping simulation

**`RaceSolverEnhanced.ts`**

Enhanced version with:

- Improved position keeping algorithm
- Virtual pacemaker support
- Spot struggle simulation
- Lane movement approximation

**`RaceSolverBuilder.ts`**

Builder pattern for constructing race solvers with different configurations.

#### Supporting Files

**`ConditionParser.ts`**

Parses and evaluates skill activation conditions:

- Distance ranges (`>=`, `<=`, phase-based)
- Race conditions (weather, ground, season, etc.)
- Positioning conditions (order, blocked, surrounded)
- Random conditions (`corner_random`, `phase_random`, etc.)

**`tools/ConditionMatcher.ts`**

Advanced condition matching logic for complex skill conditions.

**`CourseData.ts`**

Course/track data handling:

- Loading course JSON data
- Course geometry calculations
- Region detection (corners, slopes, straights)

**`HorseTypes.ts`**

Type definitions for uma musume:

- Stats structure
- Strategy enums
- Aptitude enums
- Motivation levels

**`RaceParameters.ts`**

Race configuration types:

- Course selection
- Weather conditions
- Ground conditions
- Season and time of day

**`ActivationConditions.ts`**

Skill activation condition implementations.

**`SpurtCalculator.ts`**

Last spurt speed calculation logic.

**`HpPolicy.ts` / `EnhancedHpPolicy.ts`**

HP consumption and management strategies.

### Skill System

**`src/modules/skills/`**

Manages skill data, selection, and display:

**Components:**

- `components/SkillList.tsx`: Skill selector interface
- `components/ExpandedSkillDetails.tsx`: Detailed skill information

**Data Management:**

- `store.ts`: Skill selection state (Zustand)
- `query.ts`: Skill data queries and searches
- `filters.ts`: Skill filtering logic
- `utils.ts`: Skill utilities

### Course Visualization

**`src/modules/racetrack/`**

Renders race courses with skill activation markers:

**Main Components:**

- `components/RaceTrack.tsx`: Main track visualization
- `components/skill-marker.tsx`: Skill activation markers
- `components/slope-visualization.tsx`: Slope indicators
- `components/distance-marker.tsx`: Distance markers
- `components/section-bar.tsx`: Section indicators

**Utilities:**

- `courses.ts`: Course data utilities
- `hooks/`: Track-related React hooks

### Uma Musume Configuration

**`src/modules/runners/`**

UI for configuring uma musume:

**Components:**

- `components/runners-panel.tsx`: Main runner configuration panel
- `components/runner-card/`: Individual runner card
- `components/StatInput.tsx`: Stat input fields
- `components/StrategySelect.tsx`: Strategy selection
- `components/StrategySelect.tsx`: Aptitude selection
- `components/MoodSelect.tsx`: Mood/motivation selection

**OCR Import:**

- `ocr/`: OCR functionality for importing from screenshots
- `components/ocr-import-dialog.tsx`: OCR import UI

### Shared UI Components

**`src/components/ui/`**

Radix UI component wrappers with Tailwind styling:

- Button, Dialog, Select, Checkbox, etc.
- Configured via `components.json`
- Consistent styling with class-variance-authority

**`src/components/bassin-chart/`**

Skill efficacy chart (バ身 chart):

- Statistical analysis display
- Histogram visualization
- Skill comparison tables

## Making Code Changes

### Development Workflow

1. **Make changes** to source files in `src/`

2. **Test with dev server:**

   ```bash
   npm run dev
   ```

3. **Check for TypeScript errors:**

   ```bash
   npm run typecheck
   ```

4. **Run linter:**

   ```bash
   npm run lint
   ```

5. **Format code:**

   ```bash
   npm run format
   ```

6. **Test your changes thoroughly:**
   - Run multiple simulations
   - Test edge cases
   - Verify UI responsiveness

7. **Build for production:**
   ```bash
   npm run build
   ```

### Code Style and Conventions

- **Formatting**: Enforced by Prettier
  - 2 spaces for indentation
  - Single quotes for strings
  - Semicolons required
  - 80 character line width
- **Linting**: Enforced by ESLint
- **TypeScript**: Strict type checking enabled
- **Components**: Use functional components with hooks
- **Styling**: Use Tailwind CSS utility classes
- **Imports**: Use path aliases (`@`, `@simulation`, etc.)
- **Comments**: Add comments for complex logic
- **Performance**: Keep in mind simulations run 500+ times

### Common Development Tasks

#### Adding a New Skill Effect

1. Check if the effect type exists in `src/modules/simulation/lib/`
2. Add effect handling in `RaceSolver.ts` or related files:

```typescript
// src/modules/simulation/lib/RaceSolver.ts
import { SkillEffect } from '@simulation/lib/HorseTypes';

// Add handling in the appropriate calculation method
private applySkillEffects() {
  for (const skill of this.activeSkills) {
    if (skill.type === 'new_effect_type') {
      // Implement effect logic
    }
  }
}
```

3. Update condition parsing if needed in `ConditionParser.ts`
4. Test with known skills that use the effect

#### Adding a New UI Feature

1. Create or modify components in `src/components/` or module directories:

```typescript
// src/components/new-feature.tsx
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@simulation/stores/...';

export function NewFeature() {
  const { state, action } = useSimulationStore();

  return (
    <div className="flex gap-2">
      <Button onClick={action}>Click me</Button>
    </div>
  );
}
```

2. Update state management in Zustand stores if needed
3. Add Tailwind CSS classes for styling
4. Ensure the feature works with the web worker architecture

#### Updating Course Data

1. Ensure `courseeventparams/` has the latest course JSONs
2. Re-run the extraction script:

```bash
cd scripts
perl make_global_course_data.pl /path/to/master.mdb ../courseeventparams > ../src/modules/data/course_data.json
```

3. Verify course geometry in the visualization
4. Test skill activations on the updated course

#### Fixing a Bug

1. Reproduce the bug with specific parameters
2. Add debugging output if needed (check `CC_DEBUG` flag)
3. Fix the issue in the appropriate module
4. Test to confirm the fix
5. Test related functionality for regressions

#### Working with Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of:
import { RaceSolver } from '../../../modules/simulation/lib/RaceSolver';

// Use:
import { RaceSolver } from '@simulation/lib/RaceSolver';

// Available aliases:
import something from '@/...'; // src/
import data from '@data/...'; // src/modules/data/
import { Simulator } from '@simulation/...'; // src/modules/simulation/
import { SkillQuery } from '@skills/...'; // src/modules/skills/
```

## CLI Tools

The `cli/` directory contains command-line tools for advanced analysis. See `cli/README.md` for detailed usage.

**Available Tools:**

- **skillgrep.ts**: Search skills by name or condition

  ```bash
  npx tsx cli/skillgrep.ts --name "Acceleration"
  ```

- **dump.ts**: Simulate races and collect detailed position/velocity/acceleration data

  ```bash
  npx tsx cli/dump.ts [options]
  ```

- **speedguts.ts**: Analyze different combinations of speed and guts stats
  ```bash
  npx tsx cli/speedguts.ts [options]
  ```

Refer to `cli/README.md` for full options and usage examples.

## Testing Your Changes

### Manual Testing Checklist

- [ ] Simulations complete without errors
- [ ] Results are consistent with game behavior
- [ ] UI is responsive and doesn't freeze
- [ ] Skill activations appear correct on the chart
- [ ] Statistics (min/median/mean/max) are reasonable
- [ ] Changes work in both development and production builds

### Automated Testing

Run the test suite:

```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

Add tests for new functionality in corresponding `*.test.ts` files.

### Regression Testing

After changes, test:

- Multiple running styles (Runaway, Front Runner, Pace Chaser, Late Surger, End Closer)
- Various courses (short, mile, medium, long)
- Different skill types (acceleration, speed, special conditions)
- Edge cases (very low stamina, extreme stats)

## Submitting Contributions

### Preparing Your Contribution

1. **Document your changes:**
   - Update changelog in `src/data/changelog.ts` if user-facing
   - Add code comments explaining complex logic
   - Update this guide if adding new workflows

2. **Ensure code quality:**

   ```bash
   npm run typecheck  # No TypeScript errors
   npm run lint       # No linting errors
   npm run format     # Code is formatted
   npm run test       # Tests pass
   ```

3. **Test thoroughly:**
   - Run simulations with your changes
   - Verify accuracy against in-game results
   - Check for performance regressions

4. **Create a pull request:**
   - Describe what you changed and why
   - Include test cases or examples
   - Reference any related issues

### Code Review

Be prepared to:

- Explain your implementation choices
- Make requested changes
- Provide additional testing if needed

## Troubleshooting

### Build Errors

**"Cannot find module":**

- Run `npm install` to ensure all dependencies are installed
- Check that import paths are correct
- Verify path aliases are configured in `vite.config.ts`

**"Command not found: bun":**

- Install Bun from [bun.sh](https://bun.sh)

### Data Extraction Issues

**"Can't open master.mdb":**

- Verify the file path is correct
- Ensure the game is not running (file may be locked)
- Check file permissions

**Empty or invalid JSON:**

- Check for Perl script errors in the console
- Verify `master.mdb` is from the current game version
- Ensure required Perl modules are installed

### Runtime Errors

**Worker thread crashes:**

- Check browser console for error messages
- Verify all data files in `src/modules/data/` are valid JSON
- Test with default parameters to isolate the issue

**Simulations freeze:**

- Check for infinite loops in race solver
- Verify stamina is sufficient for the course
- Use the development build (`npm run dev`) for more detailed error messages

**Type errors during development:**

- Run `npm run typecheck` to see all type errors
- Check that types are imported correctly
- Verify path aliases are working

### Vite-Specific Issues

**Port already in use:**

- Vite will automatically try the next available port
- Or specify a port: `npm run dev -- --port 3000`

**Hot reload not working:**

- Check if files are being watched correctly
- Try restarting the dev server
- Clear browser cache

## Getting Help

- Review existing documentation and code comments
- Check the changelog in `src/data/changelog.ts` for recent changes
- Search for similar issues in the repository
- Ask questions in the community

## Additional Resources

### Original Umalator

The simulator is based on the original Umalator project:

- **Simulator Engine**: [github.com/alpha123/uma-skill-tools](https://github.com/alpha123/uma-skill-tools)
- **UI Components**: [github.com/alpha123/uma-tools](https://github.com/alpha123/uma-tools)

Enhanced with features by the community (see README.md for credits).

---

Thank you for contributing to Umalator-Global! Your efforts help make the simulator better for everyone.
