# Skill Planner Optimization - Testing Guide

## Implementation Complete

The skill planner optimization feature has been successfully integrated with the following components:

### Files Created

1. **`combination-generator.ts`** - Generates skill combinations within budget constraints
2. **`workers/skill-planner.worker.ts`** - Web worker for optimization with adaptive sampling
3. **`hooks/useSkillPlannerOptimizer.ts`** - React hook for worker lifecycle management

### Files Modified

1. **`components/CostModifiersPanel.tsx`** - Integrated optimization controls

## Testing Scenarios

### Scenario 1: Basic Optimization (Happy Path)

**Setup:**

1. Navigate to Skill Planner page
2. Select a runner (outfit)
3. Add 5 candidate skills (mix of costs: 80, 110, 130, 160, 170)
4. Set budget to 500 points
5. Configure race settings (track, weather, etc.)

**Actions:**

1. Click "Optimize" button

**Expected Results:**

- Button changes to "Cancel" with red destructive variant
- Progress bar appears showing "Testing combinations..."
- Progress updates every ~5 combinations
- Current best combination shown during optimization
- After 30-60 seconds, optimization completes
- Results panel shows:
  - Recommended skills to buy
  - Total cost (≤ 500)
  - Bashin gain statistics (min, max, mean, median)
  - Combinations tested count
  - Time taken
- RaceTrack visualization should NOT appear (as per plan)

### Scenario 2: Empty Baseline Comparison

**Setup:**

1. Add 3 candidate skills
2. Mark all as NOT obtained
3. Set budget to 300 points

**Expected:**

- Empty combination (baseline) is tested
- Other combinations are compared against baseline
- Best performing combination is selected

### Scenario 3: Obtained Skills Handling

**Setup:**

1. Add 5 candidate skills
2. Mark 2 as "obtained" (isObtained = true, cost = 0)
3. Set budget to 400 points

**Expected:**

- Obtained skills always included in baseline
- Only purchasable skills counted toward budget
- Optimization finds best NEW skills to buy
- Obtained skills not shown in "skills to buy" list

### Scenario 4: Budget Constraints

**Setup:**

1. Add 5 expensive skills (all 200+ points)
2. Set budget to 100 points

**Expected:**

- Very few or no valid combinations generated
- May return empty result or single cheapest skill
- No errors or crashes

### Scenario 5: Cancellation

**Setup:**

1. Add 10 candidate skills
2. Set budget to 1000 points
3. Click "Optimize"

**Actions:**

1. Wait for progress to reach ~30%
2. Click "Cancel" button

**Expected:**

- Optimization stops immediately
- Progress bar disappears
- Button returns to "Optimize"
- Worker is terminated and recreated
- No result is displayed

### Scenario 6: Fast Learner Toggle

**Setup:**

1. Add 3 skills with different hint levels
2. Toggle "Fast Learner" checkbox

**Expected:**

- Effective costs recalculate (10% discount applied)
- More combinations fit within budget
- Optimization uses updated costs

### Scenario 7: Race Settings Integration

**Setup:**

1. Change track selection
2. Change weather/ground conditions
3. Add candidate skills
4. Run optimization

**Expected:**

- Optimization uses current race settings from global store
- Skills evaluated with correct track and conditions
- Results reflect actual race scenario

### Scenario 8: Multiple Optimization Runs

**Setup:**

1. Run optimization
2. Get results
3. Modify candidate skills or budget
4. Run optimization again

**Expected:**

- Previous results cleared
- New optimization starts fresh
- New results replace old results
- No interference between runs

## Edge Cases to Test

### Edge Case 1: No Candidates

- **Setup:** Click Optimize with no candidate skills added
- **Expected:** Button disabled, cannot start optimization

### Edge Case 2: Zero Budget

- **Setup:** Set budget to 0
- **Expected:** Button disabled OR only tests baseline (no purchases)

### Edge Case 3: All Skills Obtained

- **Setup:** Add 5 skills, mark all as obtained, budget 500
- **Expected:** Tests different combinations of obtained skills, no cost charged

### Edge Case 4: Worker Error

- **Setup:** Simulate worker error (corrupt data)
- **Expected:** Error message logged, optimization stops gracefully, state reset

## Performance Expectations

### Adaptive Sampling Performance

**Stage 1 (10 samples):**

- ~150 combinations × 10 samples = 1,500 simulations
- Estimated: 15-20 seconds

**Stage 2 (50 samples):**

- ~30 combinations (top 20%) × 50 samples = 1,500 simulations
- Estimated: 15-20 seconds

**Stage 3 (100 samples):**

- 1 combination × 100 samples = 100 simulations
- Estimated: 1-2 seconds

**Total Expected Runtime:** 30-45 seconds for typical scenario

### Combination Generation

- 150 max combinations (bounded enumeration)
- Up to 5 skills per combination
- Generation time: < 1 second

## Verification Checklist

- [ ] Worker initializes on component mount
- [ ] Worker terminates on component unmount
- [ ] Optimize button triggers worker message
- [ ] Progress updates received and displayed
- [ ] Final result received and displayed
- [ ] Cancel terminates worker and resets state
- [ ] No memory leaks (worker properly cleaned up)
- [ ] Console logs show proper message flow
- [ ] Race settings correctly passed to simulator
- [ ] Obtained skills excluded from budget calculations
- [ ] Cost calculations match expected values
- [ ] Bashin statistics make sense (positive gains for good skills)
- [ ] UI responsive during optimization (not blocking)
- [ ] Apply to Runner button adds skills correctly

## Console Debugging

Expected console output during optimization:

```
skill-planner:handleWorkerMessage { type: 'skill-planner-progress', data: { completed: 5, total: 150, currentBest: {...} } }
skill-planner:handleWorkerMessage { type: 'skill-planner-progress', data: { completed: 10, total: 150, currentBest: {...} } }
...
skill-planner:handleWorkerMessage { type: 'skill-planner-result', result: {...} }
skill-planner:handleWorkerMessage { type: 'skill-planner-done' }
```

## Known Limitations

1. **No RaceTrack Visualization:** Winner combination does not generate detailed runData for visualization (as per plan)
2. **Fixed Sample Counts:** Adaptive sampling uses hardcoded 10/50/100 samples (not configurable)
3. **Combination Limit:** Maximum 150 combinations generated (prevents exponential explosion)
4. **Max Skills Per Combo:** Limited to 5 skills per combination

## Future Enhancements (Not in Current Scope)

1. Add "Simulate Winner" button for detailed RaceTrack visualization
2. Configurable sample counts per stage
3. Save/load optimization results
4. Compare multiple optimization results
5. Export results to CSV
6. Advanced filtering options for candidate skills
7. Cost-efficiency scoring for individual skills
8. Multi-objective optimization (cost vs bashin vs reliability)
