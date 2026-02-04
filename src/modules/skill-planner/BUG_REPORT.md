# Skill Planner Optimization Bugs - Fixed

## Date: 2026-02-04

## Summary

Critical bugs were discovered in the skill planner optimization logic that caused incorrect simulation comparisons. The bugs have been fixed and tests have been added to prevent regression.

---

## Bug #1: Duplicate Skills in Simulation Baseline ⚠️ CRITICAL

### Location

`src/workers/skill-planner.worker.ts` (all three stages)

### The Problem

The original code was setting `baseRunner.skills` to include BOTH obtained skills AND candidate skills, then passing the candidate skills AGAIN to the simulator:

```typescript
// WRONG CODE (before fix)
const allSkills = [...obtainedSkills, ...combination];
const resolvedSkills = resolveActiveSkills(allSkills);
const baseRunner = cloneDeep(runner);
baseRunner.skills = resolvedSkills; // Contains obtained + candidates

runSkillCombinationComparison({
  baseRunner,              // Already has candidates
  candidateSkills: combination, // Adds candidates AGAIN
  ...
});
```

### What Was Actually Being Compared

- **Base Runner**: `obtainedSkills + combination`
- **Test Runner**: `obtainedSkills + combination + combination` ❌ **DUPLICATE SKILLS!**

### What SHOULD Have Been Compared

- **Base Runner**: `obtainedSkills` only
- **Test Runner**: `obtainedSkills + combination`

### Impact

- All bashin gain calculations were completely wrong
- The optimizer was comparing runners with duplicate skills against runners with even more duplicate skills
- Results were meaningless and misleading

### The Fix

```typescript
// CORRECT CODE (after fix)
const baseRunner = { ...runner, skills: obtainedSkills };

runSkillCombinationComparison({
  baseRunner,              // Only obtained skills
  candidateSkills: combination, // Candidates added to test runner only
  ...
});
```

---

## Bug #2: Wrong Property Name in Result Construction

### Location

`src/modules/skill-planner/optimization-engine.ts` line 135

### The Problem

The `evaluateCombination` function returns an object with a `bashin` property, but the result construction tried to access `mean`:

```typescript
// evaluateCombination returns:
return {
  skills: combination,
  cost: calculateCombinationCost(combination, candidates),
  bashin: result.mean,  // Property is named 'bashin'
  min: result.min,
  max: result.max,
  median: result.median,
};

// But the result was constructed as:
bashinStats: {
  min: finalResult.min,
  max: finalResult.max,
  mean: finalResult.mean,  // ❌ This property doesn't exist!
  median: finalResult.median,
},
```

### Impact

- `result.bashinStats.mean` would always be `undefined`
- Final optimization results would be incomplete

### The Fix

```typescript
bashinStats: {
  min: finalResult.min,
  max: finalResult.max,
  mean: finalResult.bashin,  // ✅ Correct property name
  median: finalResult.median,
},
```

---

## Changes Made

### 1. Extracted Core Logic (`optimization-engine.ts`)

Created a new testable module that contains the pure optimization logic, making it possible to:

- Unit test the optimization algorithm
- Catch bugs early through automated testing
- Reuse the logic in other contexts if needed

### 2. Simplified Worker (`skill-planner.worker.ts`)

The worker now delegates to the optimization engine:

```typescript
function runOptimization(params: OptimizeParams) {
  const { candidates, obtainedSkills, budget, runner, course, racedef, options } = params;

  const candidateArray = Object.values(candidates).filter(
    (c) => !obtainedSkills.includes(c.skillId),
  );

  const result = runAdaptiveOptimization({
    candidates: candidateArray,
    obtainedSkills,
    budget,
    runner,
    course,
    racedef,
    options,
    onProgress: (progress) => {
      postMessage({ type: 'skill-planner-progress', progress });
    },
  });

  postMessage({ type: 'skill-planner-result', result });
  postMessage({ type: 'skill-planner-done' });
}
```

### 3. Added Tests (`__tests__/optimization-engine.test.ts`)

Created comprehensive tests that verify:

1. **Baseline is never polluted with candidate skills** (catches Bug #1)
2. **Combinations are generated correctly within budget**
3. **Results are properly sorted by bashin gain**
4. **All result properties are defined** (catches Bug #2)

All tests pass: ✅ 4/4

---

## Testing

To run the tests:

```bash
bun test src/modules/skill-planner/__tests__/optimization-engine.test.ts
```

---

## Recommendation

Before deploying, run a comparison test:

1. Use the old code to optimize a skill combination
2. Use the fixed code to optimize the same combination
3. Compare results - the fixed version should show different (correct) bashin gains

The old results are invalid and should not be trusted.
