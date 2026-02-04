# Gold Skill Bundled Cost Fix

## Date: 2026-02-04

## Issue Reported

Gold skills that require purchasing their white base tiers were displaying incorrect costs in the UI and optimization calculations.

### Example

**Professor of Curvature** (gold skill):

- Requires: **Corner Adept ○** (white base tier) - 180 pts
- Gold upgrade: **Professor of Curvature** - 180 pts
- **Total bundled cost: 360 pts**

But the UI was showing only **180 pts** ❌

## Root Cause

The code had infrastructure for calculating bundled costs (`calculateDisplayCost` function) but was never actually using it:

1. **`createCandidate`** set `displayCost = effectiveCost` by default
2. **No recalculation** of `displayCost` when obtained skills changed
3. **UI components** used `effectiveCost` instead of `displayCost`
4. **Optimization logic** used `effectiveCost` for cost calculations

This caused:

- Incorrect costs displayed in the candidate list
- Budget constraints not properly enforced in optimization
- Optimization recommending gold skills without accounting for white tier costs

## Solution

### 1. Calculate displayCost When Creating Candidates

Updated `addCandidate` to calculate and set the proper `displayCost` using the existing `calculateDisplayCost` function:

```typescript
// Calculate display cost for this candidate
const allCandidates = { ...candidates, [skillId]: candidate };
candidate.displayCost = calculateDisplayCost(
  skillId,
  allCandidates,
  obtainedSkills,
  hasFastLearner,
);
```

### 2. Recalculate displayCost When State Changes

Added `recalculateDisplayCosts()` helper function that's called whenever:

- Obtained skills are added/removed (`addObtainedSkill`, `removeObtainedSkill`, `setObtainedSkills`)
- Hint levels change (`setCandidateHintLevel`)
- Fast Learner toggle changes (`setHasFastLearner`)

### 3. Update UI to Use displayCost

Updated components to use `displayCost ?? effectiveCost`:

- **CandidateSkillList.tsx** (lines 210, 218)
- **SkillPlannerResults.tsx** (line 124)

### 4. Update Optimization to Use displayCost

Updated optimization functions to use `displayCost`:

- **`calculateCombinationCost`** in optimizer.ts - total cost calculation
- **`generateCombinations`** in optimizer.ts - budget constraint checking

## How It Works Now

### Gold Skill Without White Base Tier Obtained

**Example:** Professor of Curvature (gold) without Corner Adept ○ obtained

```
displayCost = white base tier (180) + white upgrade tier (0) + gold (180)
            = 360 pts ✅
```

### Gold Skill With White Base Tier Obtained

**Example:** On Your Left! (gold) with white base tier marked as obtained

```
displayCost = gold cost only = 180 pts ✅
```

### Regular White Skill

```
displayCost = effectiveCost = 180 pts ✅
```

## Files Modified

1. **src/modules/skill-planner/skill-planner.store.ts**
   - Import `calculateDisplayCost`
   - Update `addCandidate` to set `displayCost`
   - Add `recalculateDisplayCosts()` helper
   - Call `recalculateDisplayCosts()` in state update functions

2. **src/modules/skill-planner/optimizer.ts**
   - Update `generateCombinations` to use `displayCost` for budget checking
   - Update `calculateCombinationCost` to use `displayCost` for totals

3. **src/modules/skill-planner/components/CandidateSkillList.tsx**
   - Change `candidate.effectiveCost` to `candidate.displayCost ?? candidate.effectiveCost`

4. **src/modules/skill-planner/components/SkillPlannerResults.tsx**
   - Change `candidate.effectiveCost` to `candidate.displayCost ?? candidate.effectiveCost`

## Testing

To verify the fix:

1. Add a gold skill to candidates (e.g., "Professor of Curvature")
2. Make sure its white base tier is NOT in obtained skills
3. Check that the displayed cost is the bundled cost (360 pts, not 180 pts)
4. Run optimization and verify budget constraints are properly enforced

## Impact

This fix ensures:
✅ Accurate cost display for gold skills
✅ Correct budget enforcement in optimization
✅ Better user understanding of skill costs
✅ Optimization recommends valid combinations within budget

## Technical Notes

The `calculateDisplayCost` function in `cost-calculator.ts` correctly handles:

- Bundling all white tiers (base ○ and upgrade ◎) for gold skills
- Applying hint discounts to each tier independently
- Applying Fast Learner discount to the total bundled cost
- Checking if any white tier is already obtained (then only charge gold cost)
