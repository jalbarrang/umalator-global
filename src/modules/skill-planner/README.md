# Skill Purchase Planner

A powerful optimization tool that helps players maximize their Bashin (race distance) gains when purchasing skills after completing a career in Uma Musume: Pretty Derby.

## 📖 Overview

When finishing a career in Uma Musume, players receive skill hints that provide discounts on specific skills (10-40% off). The Skill Purchase Planner helps you decide which skills to buy by:

1. **Testing all possible combinations** of candidate skills within your budget
2. **Running full race simulations** to account for skill synergies
3. **Finding the optimal set** that maximizes your expected Bashin gain

## 🎯 Use Case

Perfect for situations like:
- "I have 1000 skill points and 15 skills with various hint levels - which should I buy?"
- "Some skills are already obtained (free) - how should I spend my remaining budget?"
- "I have the rare 'Fast Learner' condition - what's the best purchase strategy?"
- "Should I stack the same skill twice or buy different skills?"

## 🚀 How to Use

### 1. Navigate to Skill Planner

Click the **"Skill Planner"** tab in the main navigation (top-level tab alongside Umalator and Veterans).

### 2. Configure Your Runner

**Left Panel - Top Section: Runner Configuration**

Set up your runner's stats and aptitudes:
- Select your Uma character
- Configure Speed, Stamina, Power, Guts, Wisdom stats
- Set Distance, Surface, and Strategy aptitudes
- Choose running strategy and mood

This ensures the optimizer tests skills with your actual runner configuration.

### 3. Add Candidate Skills

**Left Panel - Bottom Section: Candidate Skills**

Click **"Add Skills"** to open the skill picker and select skills you want to consider purchasing. For each skill:

- **Hint Level** (dropdown): Select the discount level from the game
  - `No hint` = 0% off
  - `Lvl 1` = 10% off
  - `Lvl 2` = 20% off
  - `Lvl 3` = 30% off
  - `Lvl 4` = 35% off
  - `Lvl Max` = 40% off (maximum discount)

- **Obtained** (checkbox): Check if you already have this skill (it's free but will be included in simulations)

### 4. Set Budget & Modifiers

**Right Panel - Top Section: Budget & Modifiers**

- **Skill Points**: Enter your total available skill points
- **Fast Learner**: Check if your runner has the rare "Fast Learner" condition (reduces all costs by 10%)
- **Optimize Button**: Click to start the exhaustive search

### 5. Review & Apply Results

**Right Panel - Bottom Section: Results**

Once complete, you'll see:
- **Expected Gain**: How many Bashin you'll improve by
- **Total Cost**: Total skill points used vs. your budget
- **Recommended Skills**: The optimal skills to purchase
- **Stats**: Number of combinations tested and time taken

Click **"Apply to Runner"** to add the recommended skills to your Umalator runner for testing.

## 💡 Key Features

### Integrated Runner Configuration

Unlike other simulation modes, Skill Planner has its own runner configuration:
- **Self-contained**: Doesn't affect your Umalator runners
- **Career-focused**: Configure the runner you're planning skills for
- **Independent settings**: Has its own course and seed settings

### Synergy-Aware Optimization

The Skill Planner runs **full race simulations** for each combination:
- Skills that work together (e.g., multiple acceleration skills) are properly evaluated
- Activation conditions and race phases are considered
- Real-world performance, not just theoretical values

### Smart Budget Pruning

The exhaustive search algorithm uses **branch-and-bound** to:
- Skip combinations that exceed budget early
- Generate up to 1000 valid combinations efficiently
- Sort candidates by cost-effectiveness for better early results

### Comprehensive Cost Modeling

Accurately calculates costs with:
```
Final Cost = Base Cost × (1 - Hint Discount) × (Has Fast Learner ? 0.9 : 1.0)
```

Examples:
- Skill with 110 base cost, Hint Lvl 3 (30% off): `110 × 0.7 = 77 pts`
- Same skill + Fast Learner: `110 × 0.7 × 0.9 = 69 pts`

### Stackable Skills Support

Some skills can be purchased twice in the game. The optimizer:
- Allows the same skill to appear twice in recommendations
- Tests stacking vs. buying different skills
- Accounts for diminishing returns

## 🔧 Technical Details

### Architecture

```
┌─────────────────────┐
│  Runner Config      │ ← Configure runner stats/aptitudes
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Candidate Skills   │ ← Add skills with hint levels
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Budget & Modifiers │ ← Set budget, Fast Learner
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Web Worker         │ ← Runs optimization in background
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Race Simulation    │ ← Tests each combination (25-200 samples)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Best Result        │ ← Returns optimal skill set
└─────────────────────┘
```

### Optimization Algorithm

**Exhaustive Search with Budget Pruning**

1. Generate all valid combinations using recursive branch-and-bound
2. Prune branches where cumulative cost exceeds budget
3. Handle stackable skills by allowing duplicates
4. Filter out obtained skills from budget calculation
5. Run quick simulations (25 samples) for all combinations
6. Run full simulation (200 samples) on the best result

**Performance**: For 15 candidate skills, typically generates 100-500 valid combinations in 20-100 seconds.

### Data Flow

```typescript
// Input
Runner + CandidateSkill[] + Budget + FastLearner
  ↓
// Generate combinations
string[][] (filtered by budget)
  ↓
// Simulate each combination
BaselineRunner + Combination → runComparison() → Bashin gain
  ↓
// Find optimal
max(bashin) → OptimizationResult
```

### Simulation Method

Each combination is tested by:
1. Creating a baseline runner (configured runner + runner.skills + obtained skills)
2. Creating a test runner (baseline + combination)
3. Running `runComparison()` with 25 samples
4. Calculating median Bashin difference
5. Final result gets 200-sample simulation for accuracy

## 📁 File Structure

```
src/modules/skill-planner/
├── types.ts                          # Type definitions
├── store.ts                          # Zustand state management (with runner state)
├── cost-calculator.ts                # Cost calculation utilities
├── optimizer.ts                      # Combination generation algorithm
├── hooks/
│   └── useSkillPlannerWorker.ts     # Worker communication hook
├── components/
│   ├── SkillPlannerLayout.tsx       # Main layout component
│   ├── runner-card.tsx              # Integrated runner configuration
│   ├── CandidateSkillList.tsx       # Skill management UI
│   ├── CostModifiersPanel.tsx       # Budget & modifiers UI
│   ├── SkillPlannerResults.tsx      # Results display UI
│   └── HelpDialog.tsx               # First-time help dialog
└── __tests__/
    ├── cost-calculator.test.ts      # Cost calculation tests (20 tests)
    ├── optimizer.test.ts            # Optimizer tests (23 tests)
    └── store.test.ts                # Store tests (36 tests)

src/workers/
└── skill-planner.worker.ts          # Optimization worker

src/routes/
└── skill-planner.tsx                # Main page route (top-level)
```

## 🧪 Testing

Run the test suite:

```bash
bun test src/modules/skill-planner/__tests__/
```

**Coverage**: 79 tests covering:
- Cost calculations with all discount combinations
- Combination generation and budget pruning
- State management and lifecycle
- Integration scenarios

All tests pass ✅

## 🎮 Example Workflow

**Scenario**: Player finishes career with 1000 skill points

1. **Configure runner** with final career stats (e.g., 1200 Speed, 1000 Stamina)
2. **Add 10 candidate skills** from the career skill shop
3. **Set hint levels** based on in-game hints:
   - 3 skills with Hint Lvl 4 (35% off)
   - 4 skills with Hint Lvl 2 (20% off)
   - 2 skills with Hint Lvl 1 (10% off)
   - 1 skill already obtained (free)
4. **Enable Fast Learner** if applicable (rare condition)
5. **Set budget to 1000** skill points
6. **Click Optimize**
7. **Review results**: "Expected gain: +15.3 Bashin for 950 points"
8. **Apply to Runner** to test in Umalator

## 🔍 Algorithm Details

### Branch-and-Bound Pruning

```javascript
function* generate(index, currentCombo, currentCost, usedCounts) {
  // Yield current combination
  if (currentCombo.length > 0) yield currentCombo;

  // Try adding each skill
  for (let i = index; i < candidates.length; i++) {
    const newCost = currentCost + candidate.cost;

    // Prune: skip if over budget
    if (newCost > budget) continue;

    // Prune: check stackable limits
    if (usedCount >= maxUses) continue;

    // Recurse with skill added
    yield* generate(i, [...currentCombo, skillId], newCost, ...);
  }
}
```

### Cost Calculation

```typescript
// Example: Base cost 110, Hint Lvl 3, Fast Learner
const hintDiscount = 0.30;        // 30% off
const flMultiplier = 0.9;         // 10% off
const finalCost = Math.floor(
  110 * (1 - 0.30) * 0.9
); // = Math.floor(110 × 0.7 × 0.9) = 69 pts
```

## ⚡ Performance Considerations

### Optimization Speed

| Candidates | Budget | Est. Combinations | Est. Time |
|-----------|--------|------------------|-----------|
| 5 skills  | Any    | 10-50           | 5-10s     |
| 10 skills | 500    | 50-200          | 15-40s    |
| 15 skills | 1000   | 100-500         | 30-100s   |
| 20 skills | 1500   | 200-1000        | 60-180s   |

**Tips for faster results**:
- Mark obviously weak skills as "Already Obtained" instead of adding them
- Use higher hint levels (skills with better discounts are tested first)
- Limit candidates to 10-15 most promising skills

### Simulation Samples

- **Quick pass**: 25 samples per combination (~200ms each)
- **Final result**: 200 samples for best combination (~2s)
- **Total**: Mostly depends on number of valid combinations

## 🎨 UI Design

The interface uses a responsive two-column layout:

### Left Column (500px fixed width)
1. **Runner Card** - Configure your runner's stats and aptitudes
2. **Candidate Skills Panel** - Add/manage skills with hint levels
   - Action buttons: Add Skills, Clear All, Help
   - Skill cards with inline hint level selector
   - Obtained checkbox
   - Cost display

### Right Column (Flexible)
1. **Budget & Modifiers** - Horizontal bar with:
   - Skill Points input
   - Fast Learner checkbox
   - Budget summary
   - Optimize/Cancel button
2. **Results Display** - Shows optimization results and progress

## 🆕 What's Different from Original Design

### Major Improvements

1. **Top-Level Navigation**: Now a separate tab (not under Umalator simulation modes)
2. **Integrated Runner**: Configure runner directly in the planner
3. **Self-Contained State**: Has its own runner, course, and seed (doesn't affect Umalator)
4. **Cleaner API**: `hasFastLearner` is now a direct boolean, not nested in `modifiers`
5. **Better UX**: Left-to-right workflow (Runner → Skills → Budget → Results)
6. **Help Dialog**: Auto-shows on first visit with "don't show again" option
7. **Simplified UI**: Removed "Can buy twice" toggle (backend still supports it)

### Store Structure

```typescript
interface SkillPlannerState {
  runner: RunnerState;           // Integrated runner config
  candidates: Map<string, CandidateSkill>;
  budget: number;
  hasFastLearner: boolean;       // Direct boolean (not nested)
  isOptimizing: boolean;
  progress: OptimizationProgress | null;
  result: OptimizationResult | null;
  skills: {                      // Skill picker state
    open: boolean;
    selected: Array<string>;
  };
  course: {                      // Independent course settings
    id: number;
    params: RaceConditions;
  };
  seed: number;                  // Independent seed
}
```

## 🛠️ Developer Notes

### Adding New Cost Modifiers

To add new cost modifiers (similar to Fast Learner):

1. Add new boolean field to store state (e.g., `hasSpecialBonus`)
2. Add setter action (e.g., `setHasSpecialBonus()`)
3. Update `calculateSkillCost()` in `cost-calculator.ts`
4. Update `CostModifiersPanel.tsx` UI
5. Add tests in `cost-calculator.test.ts`

### Modifying Optimization Algorithm

The optimizer is in `optimizer.ts`. Key functions:
- `generateValidCombinations()`: Main generator with branch-and-bound
- `calculateCombinationCost()`: Sum costs for a combination
- `pruneObviouslyBadCombinations()`: Limit total combinations tested

### Worker Communication

The worker (`skill-planner.worker.ts`) sends these message types:
- `combinations-generated`: Total combinations to test
- `progress`: Update with current progress and best result
- `complete`: Final optimization result
- `error`: Error message

### Store Actions

**Runner Management**:
- `setRunner(runner)` - Update runner configuration

**Candidate Management**:
- `addCandidate(skillId, hintLevel)` - Add skill to candidates
- `removeCandidate(skillId)` - Remove skill from candidates
- `updateCandidate(skillId, updates)` - Update candidate properties
- `clearCandidates()` - Remove all candidates

**Budget & Modifiers**:
- `setBudget(amount)` - Set skill point budget
- `setHasFastLearner(enabled)` - Toggle Fast Learner (recalculates all costs)

**Optimization State**:
- `setIsOptimizing(boolean)` - Control optimization state
- `setProgress(progress)` - Update progress during optimization
- `setResult(result)` - Set final optimization result
- `clearResult()` - Clear result only
- `clearAll()` - Reset candidates, progress, and result

**Skill Picker**:
- `setSkillsOpen(boolean)` - Control skill picker visibility
- `setSkillsSelected(skills)` - Track selected skills

## 📊 Comparison with Other Tools

| Feature | Skill Chart | Skill Planner |
|---------|------------|---------------|
| **Purpose** | Compare individual skills | Find best skill combination |
| **Input** | All available skills | Selected candidates with costs |
| **Output** | Bashin per skill | Optimal purchase set |
| **Budget** | N/A | Considers skill point budget |
| **Synergies** | Individual only | Combination synergies |
| **Runner Config** | Uses Umalator runner | Independent runner |
| **Use Case** | "Which skill is best?" | "Which skills should I buy?" |
| **Navigation** | Under Umalator | Top-level tab |

## 🎨 UI Components

### SkillPlannerLayout

Main layout component that orchestrates:
- Runner card for stats/aptitudes
- Candidate skill list with management
- Budget and modifiers panel
- Results display
- Help dialog integration
- Skill picker drawer

### RunnerCard (Simplified)

Lightweight version of the main runner card:
- Uma selector
- Stats table (Speed, Stamina, Power, Guts, Wisdom)
- Aptitudes table (Distance, Surface, Strategy)
- No skill management (handled separately)

### CandidateSkillList

Displays candidate skills with:
- Inline hint level selector (dropdown)
- Obtained checkbox
- Remove button
- Effective cost display
- Summary statistics

### CostModifiersPanel

Horizontal control bar with:
- Skill points input
- Fast Learner checkbox
- Budget summary
- Optimize/Cancel button

### SkillPlannerResults

Shows optimization results:
- Progress bar during optimization
- Current best result preview
- Final results with expected Bashin gain
- List of recommended skills
- Apply to Runner button

### HelpDialog

First-time user guide:
- Auto-shows on first visit
- Explains workflow and features
- Hint level reference table
- Tips for best results
- Stores dismissal in localStorage
- Reopenable via Help button

## 🐛 Known Limitations

1. **Computation Time**: Large candidate sets (20+) may take 2-3 minutes
2. **Combination Limit**: Caps at 1000 combinations to prevent excessive wait times
3. **Simulation Samples**: Uses 25 samples for speed (vs 200+ for Skill Chart)
4. **Stackable UI Hidden**: Backend supports it, but UI simplified for most users

## 🔮 Future Enhancements

Potential improvements:
- [ ] Course/race condition selector (currently uses defaults)
- [ ] Seed control for reproducible results
- [ ] Heuristic pre-filtering (eliminate clearly weak skills automatically)
- [ ] Multiple result recommendations (show top 5 combinations)
- [ ] Save/load candidate sets as presets
- [ ] Export results to share with other players
- [ ] Parallel worker processing for faster optimization
- [ ] Screenshot import for candidate skills (OCR integration)

## 🤝 Contributing

When adding features to the Skill Planner:
1. Update types in `types.ts` first
2. Add store actions in `store.ts`
3. Implement UI components
4. Write comprehensive unit tests
5. Update this README

### Running Tests

```bash
# Run all skill planner tests
bun test src/modules/skill-planner/__tests__/

# Run specific test file
bun test src/modules/skill-planner/__tests__/cost-calculator.test.ts

# Run with coverage
bun test --coverage src/modules/skill-planner/__tests__/
```

### Code Style

- Follow existing ESLint rules
- Use `Array<T>` instead of `T[]` for arrays
- Sort imports alphabetically
- Use Immer for state updates (MapSet enabled)

## 📝 License

Part of the Umalator Global project. See main LICENSE file.
