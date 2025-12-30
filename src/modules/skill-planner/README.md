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
- "Two skills can be bought twice - should I stack them or buy different skills?"

## 🚀 How to Use

### 1. Navigate to Skill Planner

Click the **"Skill Planner"** tab in the Umalator section (alongside Compare Runners, Skill Chart, Uma Chart).

### 2. Add Candidate Skills

**Left Panel: Candidate Skills**

Click **"Add Skill"** to open the skill picker and select skills you want to consider purchasing. For each skill:

- **Hint Level** (0-5): Select the discount level from the game
  - `0` = No hint (0% off)
  - `1` = Hint Lvl 1 (10% off)
  - `2` = Hint Lvl 2 (20% off)
  - `3` = Hint Lvl 3 (30% off)
  - `4` = Hint Lvl 4 (35% off)
  - `5` = Hint Lvl 5 (40% off)

- **Already Obtained**: Check if you already have this skill (it's free but will be included in simulations)
- **Can buy twice**: Check if this skill can be purchased multiple times (stackable)

### 3. Set Budget & Modifiers

**Right Panel: Budget & Modifiers**

- **Skill Points Available**: Enter your total available skill points
- **Fast Learner**: Check if your runner has the rare "Fast Learner" condition (reduces all costs by 10%)

### 4. Run Optimization

Click **"Optimize"** to start the exhaustive search:

- Progress bar shows testing status
- Current best combination is displayed during optimization
- Typically takes 30 seconds to 2 minutes depending on candidates

### 5. Review & Apply Results

Once complete, you'll see:
- **Expected Gain**: How many Bashin you'll improve by
- **Total Cost**: Total skill points used vs. your budget
- **Recommended Skills**: The optimal skills to purchase
- **Stats**: Number of combinations tested and time taken

Click **"Apply to Runner"** to add the recommended skills to your current runner in Umalator.

## 💡 Key Features

### Synergy-Aware Optimization

Unlike simple calculators, the Skill Planner runs **full race simulations** for each combination, meaning:
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
┌─────────────────┐
│  UI Components  │ ← User adds candidates & sets budget
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Web Worker     │ ← Runs optimization in background
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Race Simulation │ ← Tests each combination (25-200 samples)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Best Result    │ ← Returns optimal skill set
└─────────────────┘
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
CandidateSkill[] + Budget + Modifiers
  ↓
// Generate combinations
string[][] (filtered by budget)
  ↓
// Simulate each combination
RunnerState + Combination → runComparison() → Bashin gain
  ↓
// Find optimal
max(bashin) → OptimizationResult
```

### Simulation Method

Each combination is tested by:
1. Creating a baseline runner (current skills + obtained skills)
2. Creating a test runner (baseline + combination)
3. Running `runComparison()` with 25 samples
4. Calculating median Bashin difference
5. Final result gets 200-sample simulation for accuracy

## 📁 File Structure

```
src/modules/skill-planner/
├── types.ts                          # Type definitions
├── store.ts                          # Zustand state management
├── cost-calculator.ts                # Cost calculation utilities
├── optimizer.ts                      # Combination generation algorithm
├── hooks/
│   └── useSkillPlannerWorker.ts     # Worker communication hook
├── components/
│   ├── CandidateSkillList.tsx       # Skill management UI
│   ├── CostModifiersPanel.tsx       # Budget & modifiers UI
│   └── SkillPlannerResults.tsx      # Results display UI
└── __tests__/
    ├── cost-calculator.test.ts      # Cost calculation tests (20 tests)
    ├── optimizer.test.ts            # Optimizer tests (23 tests)
    └── store.test.ts                # Store tests (36 tests)

src/workers/
└── skill-planner.worker.ts          # Optimization worker

src/routes/_simulation/
└── skill-planner.tsx                # Main page component
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

1. **Add 10 candidate skills** from the career skill shop
2. **Set hint levels** based on in-game hints:
   - 3 skills with Hint Lvl 4 (35% off)
   - 4 skills with Hint Lvl 2 (20% off)
   - 2 skills with Hint Lvl 1 (10% off)
   - 1 skill already obtained (free)
3. **Enable Fast Learner** if applicable (rare condition)
4. **Set budget to 1000** skill points
5. **Click Optimize**
6. **Review results**: "Expected gain: +15.3 Bashin for 950 points"
7. **Apply to Runner** to test in Umalator

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

The interface is split into two panels:

**Left Panel** (Candidate Management)
- Add/remove skills
- Configure hint levels
- Mark obtained/stackable flags
- View effective costs

**Right Panel** (Optimization)
- Set budget and modifiers
- Run optimization
- View progress and results
- Apply recommendations

## 🛠️ Developer Notes

### Adding New Cost Modifiers

To add new cost modifiers (similar to Fast Learner):

1. Update `CostModifiers` interface in `types.ts`
2. Add calculation logic to `calculateSkillCost()` in `cost-calculator.ts`
3. Update `CostModifiersPanel.tsx` UI
4. Add tests in `cost-calculator.test.ts`

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

## 📊 Comparison with Other Tools

| Feature | Skill Chart | Skill Planner |
|---------|------------|---------------|
| **Purpose** | Compare individual skills | Find best skill combination |
| **Input** | All available skills | Selected candidates with costs |
| **Output** | Bashin per skill | Optimal purchase set |
| **Budget** | N/A | Considers skill point budget |
| **Synergies** | Individual only | Combination synergies |
| **Use Case** | "Which skill is best?" | "Which skills should I buy?" |

## 🐛 Known Limitations

1. **Computation Time**: Large candidate sets (20+) may take 2-3 minutes
2. **Combination Limit**: Caps at 1000 combinations to prevent excessive wait times
3. **Simulation Samples**: Uses 25 samples for speed (vs 200+ for Skill Chart)
4. **No OCR Import**: Screenshot import planned but not yet implemented

## 🔮 Future Enhancements

Potential improvements:
- [ ] Screenshot import for candidate skills (OCR integration)
- [ ] Heuristic pre-filtering (eliminate clearly weak skills automatically)
- [ ] Multiple result recommendations (show top 5 combinations)
- [ ] Save/load candidate sets as presets
- [ ] Export results to share with other players
- [ ] Parallel worker processing for faster optimization

## 🤝 Contributing

When adding features to the Skill Planner:
1. Update types in `types.ts` first
2. Add store actions in `store.ts`
3. Implement UI components
4. Write comprehensive unit tests
5. Update this README

## 📝 License

Part of the Umalator Global project. See main LICENSE file.

