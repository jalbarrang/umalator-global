# Contributing to Umalator-Global

## Introduction

This guide will help you set up a development environment, understand the codebase structure, and contribute to the Umalator-Global project. Whether you're updating game data, fixing bugs, or adding new features, this document provides the information you need.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v14 or later)
   - Includes npm for package management
   - Download from [nodejs.org](https://nodejs.org/)

2. **Perl** (v5.12 or later)
   - Required for data extraction scripts
   - Usually pre-installed on macOS/Linux
   - Windows users: Install [Strawberry Perl](https://strawberryperl.com/)

3. **Perl Modules:**
   ```bash
   cpan DBI DBD::SQLite JSON::PP
   ```
   Or using cpanm:
   ```bash
   cpanm DBI DBD::SQLite JSON::PP
   ```

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
kachi-uma-tools/
├── umalator-global/          # Global version build & data
│   ├── build.mjs             # Build configuration (esbuild)
│   ├── update.bat            # Windows: Update all data
│   ├── make_global_*.pl      # Data extraction Perl scripts
│   ├── course_data.json      # Extracted course/track data
│   ├── skill_data.json       # Extracted skill data
│   ├── skill_meta.json       # Skill metadata (icons, rarity)
│   ├── skillnames.json       # Skill name translations
│   ├── umas.json             # Uma musume character data
│   ├── tracknames.json       # Track name translations
│   ├── bundle.js             # Built application (generated)
│   ├── bundle.css            # Built styles (generated)
│   ├── simulator.worker.js   # Built worker thread (generated)
│   ├── index.html            # Entry HTML
│   └── courseeventparams/    # Course event parameter JSONs
│
├── umalator/                 # Main application source
│   ├── app.tsx               # Main application component
│   ├── app.css               # Application styles
│   ├── BasinnChart.tsx       # Skill efficacy chart component
│   ├── IntroText.tsx         # Welcome/changelog text
│   ├── simulator.worker.ts   # Web Worker for simulations
│   └── telemetry.ts          # Analytics (optional)
│
├── uma-skill-tools/          # Core simulation engine
│   ├── RaceSolver.ts         # Main race simulation logic
│   ├── RaceSolverEnhanced.ts # Enhanced position keeping
│   ├── ConditionParser.ts    # Skill condition parsing
│   ├── CourseData.ts         # Course/track data handling
│   ├── RaceParameters.ts     # Race configuration types
│   ├── HorseTypes.ts         # Uma musume type definitions
│   └── data/                 # Default data files
│
├── components/               # Shared UI components
│   ├── HorseDef.tsx          # Horse configuration UI
│   ├── SkillList.tsx         # Skill selection/display
│   ├── RaceTrack.tsx         # Course visualization
│   ├── Language.tsx          # Language selector
│   └── Tooltip.tsx           # Tooltip component
```

### Key Configuration Files

- **`package.json`**: Project dependencies and metadata
- **`tsconfig.json`**: TypeScript compiler configuration
- **`.gitignore`**: Files excluded from version control

## Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone [repository-url]
cd kachi-uma-tools

# Install Node.js dependencies
npm install
```

### 2. Extract Game Data

Navigate to the `umalator-global` directory:

```bash
cd umalator-global
```

**Option A: Windows Batch Script**

```batch
update.bat [path\to\master.mdb]
```

If you omit the path, it defaults to:

```
%APPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb
```

**Option B: Manual Extraction**

```bash
# Extract skill data
perl make_global_skill_data.pl /path/to/master.mdb > skill_data.json

# Extract skill names (JP and EN)
perl make_global_skillnames.pl /path/to/master.mdb > skillnames.json

# Extract skill metadata (icons, rarity, etc.)
perl make_global_skill_meta.pl /path/to/master.mdb > skill_meta.json

# Extract uma musume data
perl make_global_uma_info.pl /path/to/master.mdb

# Extract course data (requires courseeventparams/)
perl make_global_course_data.pl /path/to/master.mdb courseeventparams > course_data.json
```

**Note on Course Data:**
The `make_global_course_data.pl` script requires course event parameter JSON files in the `courseeventparams/` directory. These files contain detailed course geometry (corners, slopes, etc.) and must be extracted separately from the game assets.

### 3. Build the Application

**Development Server (with auto-rebuild):**

```bash
node build.mjs --serve [port]
```

Default port is 8000. Access at `http://localhost:8000`

The dev server automatically rebuilds when source files change.

**Production Build:**

```bash
node build.mjs
```

Generates minified `bundle.js`, `bundle.css`, and `simulator.worker.js`

**Debug Build (without minification):**

```bash
node build.mjs --debug
```

### Build Configuration (`build.mjs`)

The build uses esbuild with several custom plugins:

- **`redirectData`**: Redirects data imports to `umalator-global/` directory
- **`mockAssert`**: Removes node:assert in production, uses console.assert in debug
- **`redirectTable`**: Maps `@tanstack/*` imports to local vendor code
- **`seedrandomPlugin`**: Provides browser-compatible seedrandom implementation

**Global Version Flag:**
The build defines `CC_GLOBAL: true`, which enables global-specific features:

- English UI text where applicable
- Different ground condition labels (Firm/Good/Soft/Heavy)
- Different icon paths for season/weather
- Excludes "Late Spring" season

## Data Update Workflow

When the game updates, you'll need to refresh the data:

### Step-by-Step Update Process

1. **Update the game** and ensure `master.mdb` is current

2. **Extract new data:**

   ```bash
   cd umalator-global
   update.bat
   # or run Perl scripts manually
   ```

3. **Verify the data:**
   - Check that JSON files are valid
   - Look for new skills, umas, or courses
   - Test with the dev server

4. **Rebuild the application:**

   ```bash
   node build.mjs
   ```

5. **Test thoroughly:**
   - Test new skills for correct behavior
   - Verify course data accuracy
   - Check for any breaking changes

### Data Extraction Scripts

#### `make_global_skill_data.pl`

Extracts skill effects, conditions, and parameters from the database.

**Key Features:**

- Patches scenario skill modifiers
- Handles skill variations (e.g., Sirius unique variations)
- Exports skill conditions and effect values

#### `make_global_skillnames.pl`

Extracts skill names in both Japanese and English.

**Output:** `skillnames.json`

#### `make_global_skill_meta.pl`

Generates metadata for skills (icon paths, rarity).

**Output:** `skill_meta.json`

#### `make_global_uma_info.pl`

Extracts uma musume character data (names, IDs, running styles).

**Output:** `umas.json`

#### `make_global_course_data.pl`

Processes course geometry, corners, slopes, and track characteristics.

**Requirements:**

- `master.mdb` for track metadata
- `courseeventparams/*.json` for course geometry

**Output:** `course_data.json`

## Code Structure and Key Components

### Application Entry Point

**`../umalator/app.tsx`** (shared with umalator)

Main application component containing:

- Race parameter state management
- Horse configuration UI
- Simulation orchestration
- Result visualization

**Key State:**

- `RaceParams`: Course, weather, ground, etc.
- `HorseState`: Stats, skills, running style
- `SimulationResults`: Race outcomes and statistics

### Web Worker Thread

**`simulator.worker.ts`**

Runs simulations in a background thread to keep the UI responsive.

**Message Protocol:**

- Receives: Configuration (horse, course, parameters)
- Returns: Simulation results (velocities, skill activations, statistics)

### Core Simulation Engine

**`../uma-skill-tools/RaceSolver.ts`**

Main race simulation logic:

- Physics calculations (velocity, acceleration)
- Stamina management
- Skill activation checking
- Position keeping simulation

**Enhanced Features in `RaceSolverEnhanced.ts`:**

- Improved position keeping algorithm
- Virtual pacemaker support
- Spot struggle simulation
- Lane movement approximation

### Skill System

**`../uma-skill-tools/ConditionParser.ts`**

Parses and evaluates skill activation conditions:

- Distance ranges (`>=`, `<=`, phase-based)
- Race conditions (weather, ground, season, etc.)
- Positioning conditions (order, blocked, surrounded)
- Random conditions (corner_random, phase_random, etc.)

### UI Components

**`../components/HorseDef.tsx`**
Horse configuration interface (stats, skills, running style)

**`../components/SkillList.tsx`**
Skill selector and skill detail display

**`../components/RaceTrack.tsx`**
Course visualization with regions (corners, slopes)

**`./BasinnChart.tsx`**
Skill efficacy table and statistics display

## Making Code Changes

### TypeScript and Preact

The application uses:

- **TypeScript** for type safety
- **Preact** as a lightweight React alternative
- **Preact Hooks** for state management

### Development Workflow

1. **Make changes** to source files in `umalator/`, `uma-skill-tools/`, or `components/`

2. **Test with dev server:**

   ```bash
   cd umalator-global
   node build.mjs --serve
   ```

3. **Check for TypeScript errors:**

   ```bash
   npx tsc --noEmit
   ```

4. **Test your changes thoroughly:**
   - Run multiple simulations
   - Test edge cases
   - Verify UI responsiveness

5. **Build for production:**
   ```bash
   node build.mjs
   ```

### Code Style and Conventions

- Use **tabs for indentation** (existing codebase convention)
- Follow **TypeScript best practices**
- Use **functional components** with hooks
- Add **comments** for complex logic
- Keep **performance in mind** (simulations run 500+ times)

### Common Development Tasks

#### Adding a New Skill Effect

1. Check if the effect type exists in `uma-skill-tools/`
2. Add effect handling in `RaceSolver.ts` or related files
3. Update condition parsing if needed in `ConditionParser.ts`
4. Test with known skills that use the effect

#### Adding a New UI Feature

1. Create or modify components in `components/` or `umalator/`
2. Update state management in `app.tsx` if needed
3. Add CSS in corresponding `.css` files
4. Ensure the feature works with the web worker architecture

#### Updating Course Data

1. Ensure `courseeventparams/` has the latest course JSONs
2. Re-run `make_global_course_data.pl`
3. Verify course geometry in the visualization
4. Test skill activations on the updated course

#### Fixing a Bug

1. Reproduce the bug with specific parameters
2. Add debugging output if needed (check `CC_DEBUG` flag)
3. Fix the issue in the appropriate module
4. Test to confirm the fix
5. Test related functionality for regressions

## Testing Your Changes

### Manual Testing Checklist

- [ ] Simulations complete without errors
- [ ] Results are consistent with game behavior
- [ ] UI is responsive and doesn't freeze
- [ ] Skill activations appear correct on the chart
- [ ] Statistics (min/median/mean/max) are reasonable
- [ ] Changes work in both debug and production builds

### Regression Testing

After changes, test:

- Multiple running styles
- Various courses (short, medium, long)
- Different skill types (acceleration, speed, special conditions)
- Edge cases (very low stamina, extreme stats)

## Submitting Contributions

### Preparing Your Contribution

1. **Document your changes:**
   - Update changelog in `IntroText.tsx` if user-facing
   - Add code comments explaining complex logic
   - Update this guide if adding new workflows

2. **Test thoroughly:**
   - Run simulations with your changes
   - Verify accuracy against in-game results
   - Check for performance regressions

3. **Create a pull request:**
   - Describe what you changed and why
   - Include test cases or examples
   - Reference any related issues

### Code Review

Be prepared to:

- Explain your implementation choices
- Make requested changes
- Provide additional testing if needed

## Additional Resources

### Original Umalator Sources

- **Simulator Engine:** [github.com/alpha123/uma-skill-tools](https://github.com/alpha123/uma-skill-tools)
- **UI Components:** [github.com/alpha123/uma-tools](https://github.com/alpha123/uma-tools)

### Community Resources

- Check the changelog in the application for recent updates
- Review existing issues and pull requests
- Join community discussions about game mechanics

## Troubleshooting

### Build Errors

**"Cannot find module":**

- Run `npm install` to ensure all dependencies are installed
- Check that import paths are correct

**"Command not found: perl":**

- Install Perl (see Prerequisites section)

**"DBD::SQLite module not found":**

- Install Perl modules: `cpan DBD::SQLite`

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
- Verify all data files are valid JSON
- Test with default parameters to isolate the issue

**Simulations freeze:**

- Check for infinite loops in race solver
- Verify stamina is sufficient for the course
- Use the debug build for more detailed error messages

## Getting Help

- Review existing documentation and code comments
- Check the changelog for recent changes
- Search for similar issues in the repository
- Ask questions in the community

---

Thank you for contributing to Umalator-Global! Your efforts help make the simulator better for everyone.
