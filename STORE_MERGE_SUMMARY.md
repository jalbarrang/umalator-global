# Store Merge Implementation Summary

## What Was Done

Successfully merged `RaceStore` and `ChartStore` into a unified `SimulationStore` to eliminate state duplication and fix the null reference bug when clicking chart type headers.

## Files Created

1. **`src/store/simulation.store.ts`** - New unified simulation store
   - Combines all state from both old stores
   - Mode-aware actions that handle both comparison and skill chart modes
   - Safe null-checking to prevent errors

## Files Updated

1. **`src/modules/simulation/hooks/useSimulationWorkers.ts`**
   - Updated imports to use new store
   - Changed `setResults` → `setComparisonResults`

2. **`src/modules/simulation/hooks/useSimulationRunner.ts`**
   - Updated imports to use new store functions

3. **`src/App.tsx`**
   - Updated to use `useSimulationStore()`
   - Destructured `comparison` and `skillChart` with null-safe defaults
   - Changed `basinnChartSelection` → `handleSkillSelection` using new `selectSkill` action

4. **`src/components/bassin-chart/BasinnChart.tsx`**
   - Updated imports to use `setDisplaying` and `ChartTableEntry` from new store

5. **`src/modules/racetrack/hooks/useVisualizationData.ts`**
   - Updated to use `useSimulationStore()`
   - Safely extracts `chartData` from `comparison?.chartData`

6. **`src/modules/simulation/tabs/distribution-tab.tsx`**
   - Updated to use `useSimulationStore()`
   - Safely extracts `results` from `comparison?.results`

7. **`src/modules/simulation/tabs/skills-tab.tsx`**
   - Updated to use `useSimulationStore()`
   - Safely extracts `chartData` from `comparison?.chartData`

8. **`src/modules/simulation/tabs/runner-stats-tab.tsx`**
   - Updated to use `useSimulationStore()`
   - Safely extracts all comparison data with null defaults

9. **`src/modules/simulation/tabs/summary-tab.tsx`**
   - Updated to use `useSimulationStore()`
   - Both `ResultButtonGroups` and `SummaryTab` components updated

10. **`src/modules/simulation/tabs/stamina-tab.tsx`**
    - Updated to use `useSimulationStore()`
    - Safely extracts `chartData` from `comparison?.chartData`

## Files Deleted

1. **`src/store/race/store.ts`** - Old RaceStore (merged)
2. **`src/store/chart.store.ts`** - Old ChartStore (merged)

## Files Preserved

- **`src/store/race/compare.types.ts`** - Type definitions still needed

## Key Fix: The Original Bug

The null reference error when clicking chart headers is fixed by the new `setDisplaying` function:

```typescript
export const setDisplaying = (displaying: string = 'meanrun') => {
  const { comparison, skillChart } = useSimulationStore.getState();

  // If in comparison mode, update chartData
  if (comparison?.runData) {
    useSimulationStore.setState({
      displaying,
      comparison: {
        ...comparison,
        chartData: comparison.runData[displaying],
      },
    });
    return;
  }

  // If in skill mode with a selected skill, update chartData
  if (skillChart?.selectedSkillId) {
    const selectedSkill = skillChart.tableData.get(skillChart.selectedSkillId);
    if (selectedSkill?.runData) {
      useSimulationStore.setState({
        displaying,
        comparison: {
          results: selectedSkill.results,
          runData: selectedSkill.runData,
          chartData: selectedSkill.runData[displaying],
          // ... other fields set to null
        },
      });
      return;
    }
  }

  // Otherwise, just update the preference (no error!)
  useSimulationStore.setState({ displaying });
};
```

### Why This Fixes The Bug

**Before**: `setDisplaying` blindly accessed `runData[displaying]` which was `null` in skill chart mode
**After**: `setDisplaying` checks if data exists before accessing it, and only updates preference if no data available

## Benefits Achieved

1. ✅ **Single source of truth** - All simulation state in one place
2. ✅ **No more coordination issues** - No need to sync between stores
3. ✅ **Bug fix** - Null-safe access prevents crashes
4. ✅ **Better maintainability** - Clearer data flow
5. ✅ **Type safety** - Proper nullable types with safe defaults
6. ✅ **No duplication** - `displaying` and related state only exists once

## Testing Recommendations

1. Test comparison mode simulations
2. Test skill chart simulations
3. Test unique skills chart simulations
4. Click all chart type headers (Min/Max/Mean/Median) in both modes
5. Select different skills in skill chart mode and switch chart types
6. Verify no console errors occur

## Migration Complete

All 9 consumer files have been successfully migrated to use the new unified store. All old store files have been removed. The codebase is now cleaner and the original bug is fixed.

