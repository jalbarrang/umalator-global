---
name: Improve Stamina Analysis
overview: Leverage existing simulation/lib infrastructure (ConditionParser, ActivationConditions, RaceSolverBuilder) to accurately evaluate skill conditions and calculate effective stats for stamina analysis, including green skills stat bonuses, recovery skills, and debuffs.
todos: []
---

# Improve Stamina Analysis with Simulation Infrastructure

## Problem

Currently, stamina analysis uses simplified calculations that don't account for:

1. **Green skills** (nac type) that add stat bonuses when conditions match
2. **Conditional recovery/debuff skills** - shows skills that won't activate for the race
3. **Inaccurate position estimates** - uses simple phase regex matching instead of full condition evaluation
4. **Missing effective stats** - calculations use base stats, not base + green skill bonuses

This results in inaccurate stamina estimates and misleading skill displays.

## Solution Overview

**Leverage existing [`simulation/lib`](src/modules/simulation/lib) infrastructure** already used for race simulation:

1. Use [`ConditionParser.ts`](src/modules/simulation/lib/ConditionParser.ts) + [`ActivationConditions.ts`](src/modules/simulation/lib/ActivationConditions.ts) to evaluate skill conditions
2. Use [`RaceSolverBuilder.ts`](src/modules/simulation/lib/RaceSolverBuilder.ts) patterns for stat calculation
3. Filter skills based on actual race parameters (track, ground, weather, strategy, distance)
4. Calculate effective stats (base + matching green skills)

## Implementation Steps

### 1. Create Skill Condition Evaluation Utility

**File**: Create `src/modules/skills/skillConditionEvaluator.ts`

Core infrastructure leveraging existing simulation code:

```typescript
import { getParser } from '@simulation/lib/ConditionParser';
import { Conditions } from '@simulation/lib/ActivationConditions';
import { Region, RegionList } from '@simulation/lib/Region';
import { buildBaseStats, parseStrategy, parseAptitude } from '@simulation/lib/RaceSolverBuilder';
import { getCourseById } from '@/modules/racetrack/courses';
import { getSkillDataById } from './utils';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';

// Build HorseParameters from RunnerState
// Uses buildBaseStats to properly apply mood/motivation
function buildHorseParameters(runner: RunnerState): HorseParameters {
  const horseDesc = {
    speed: runner.speed,
    stamina: runner.stamina,
    power: runner.power,
    guts: runner.guts,
    wisdom: runner.wisdom,
    mood: runner.mood, // Affects base stats via motivation coefficient
    strategy: runner.strategy,
    distanceAptitude: runner.distanceAptitude,
    surfaceAptitude: runner.surfaceAptitude,
    strategyAptitude: runner.strategyAptitude,
  };

  return buildBaseStats(horseDesc);
}

// Evaluate if skill conditions match race parameters
export function evaluateSkillConditions(
  skillId: string,
  courseId: number,
  runner: RunnerState,
  raceParams: {
    groundCondition: number;
    weather?: number;
    season?: number;
    time?: number;
    grade?: number;
  }
): {
  matches: boolean;
  activationRegions: RegionList; // Where skill can activate
} {
  const course = getCourseById(courseId);
  const horse = buildHorseParameters(runner); // Includes mood and aptitudes
  const fullRaceParams = {
    mood: runner.mood,
    groundCondition: raceParams.groundCondition,
    weather: raceParams.weather ?? 1,
    season: raceParams.season ?? 1,
    time: raceParams.time ?? 1,
    grade: raceParams.grade ?? 500,
    popularity: 1,
    skillId: skillId,
  };

  const parser = getParser(Conditions);
  const skillData = getSkillDataById(skillId);
  if (!skillData?.alternatives?.[0]) return { matches: false, activationRegions: new RegionList() };

  const condition = skillData.alternatives[0].condition;

  const op = parser.parse(parser.tokenize(condition));
  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));
  const [regions] = op.apply(wholeCourse, course, horse, fullRaceParams);

  return {
    matches: regions.length > 0,
    activationRegions: regions,
  };
}

// Get activation position estimate (midpoint of first region)
export function estimateSkillActivationPosition(
  skillId: string,
  courseId: number,
  runner: RunnerState,
  raceParams: RaceParams,
): number | null

// Check if skill is green/nac type (stat-boosting skills)
// Identified by having stat boost effects (type 1-5)
export function isGreenSkill(skillId: string): boolean {
  const skillData = getSkillDataById(skillId);
  if (!skillData?.alternatives?.[0]?.effects) return false;

  const effects = skillData.alternatives[0].effects;
  // Check if any effect is a stat boost (type 1-5)
  return effects.some((e: any) => e.type >= 1 && e.type <= 5);
}

// Extract stat bonuses from skill effects (from skill_data.json)
// Modifier values need to be divided by 10000 (same format as recovery skills)
export function getSkillStatBonuses(skillId: string): {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
} {
  const skillData = getSkillDataById(skillId);
  const bonuses = { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 };

  if (!skillData?.alternatives?.[0]?.effects) return bonuses;

  const effects = skillData.alternatives[0].effects;
  for (const effect of effects) {
    // Stat modifiers stored as value * 10000, divide to get actual stat bonus
    // e.g., 600000 / 10000 = 60 stat points
    const statValue = effect.modifier / 10000;

    switch (effect.type) {
      case 1: bonuses.speed += statValue; break;
      case 2: bonuses.stamina += statValue; break;
      case 3: bonuses.power += statValue; break;
      case 4: bonuses.guts += statValue; break;
      case 5: bonuses.wisdom += statValue; break;
    }
  }

  return bonuses;
}

// Main export: calculate effective stats including green skill bonuses
// Returns base stats (with mood applied) + matching green skill bonuses
export function calculateEffectiveStats(
  runner: RunnerState,
  courseId: number,
  raceParams: RaceParams,
): {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  activeGreenSkills: string[]; // IDs of matching green skills
}
```

**Key Implementation Details**:

- Parse conditions using `getParser(Conditions)` (same as simulation)
- Build `HorseParameters` using `buildBaseStats` helper (applies mood/aptitudes)
- Build `RaceParameters` object with ground, weather, season, time, grade
- Evaluate conditions to get activation regions
- Green skills match if regions are non-empty (can activate anywhere in race)
- Stat bonuses from effect types 1-5, dividing `effect.modifier` by 10000 (same as recovery skills)

### 2. Update Recovery Skills Hook

**File**: [`src/modules/simulation/tabs/stamina/hooks/useRecoverySkills.ts`](src/modules/simulation/tabs/stamina/hooks/useRecoverySkills.ts)

**Changes**:

1. Replace `estimateSkillActivationPhase` with condition evaluation
2. Filter out skills that don't match race conditions
3. Use activation regions to estimate position more accurately
```typescript
import {
  evaluateSkillConditions,
  estimateSkillActivationPosition
} from '@/modules/skills/skillConditionEvaluator';

// Replace lines 68-85 (estimateSkillActivationPosition)
function getEstimatedPosition(
  skillId: string,
  courseId: number,
  runner: RunnerState,
  raceParams: RaceParams,
): number | null {
  return estimateSkillActivationPosition(skillId, courseId, runner, raceParams);
}

// Update useTheoreticalRecoverySkills (lines 167-199)
export function useTheoreticalRecoverySkills(
  runner: RunnerState,
  maxHp: number,
  courseId: number,
  raceParams: RaceParams, // Add race params
): RecoverySkillActivation[] {
  return useMemo(() => {
    const skills: RecoverySkillActivation[] = [];

    for (const skillId of runner.skills) {
      const { isRecovery, selfHealModifier, hasSelfHeal } =
        getRecoverySkillInfo(skillId);

      if (!isRecovery || !hasSelfHeal) continue;

      // NEW: Check if conditions match
      const { matches } = evaluateSkillConditions(
        skillId, courseId, runner, raceParams
      );
      if (!matches) continue; // Skip non-matching skills

      const [skillName] = getSkillNameById(skillId);
      const hpRecovered = (selfHealModifier / 10000) * maxHp;
      const position = getEstimatedPosition(skillId, courseId, runner, raceParams);

      if (position !== null) {
        skills.push({ skillId, skillName, position, hpRecovered, isEstimated: true, isDebuff: false });
      }
    }

    return skills.sort((a, b) => a.position - b.position);
  }, [runner, maxHp, courseId, raceParams]);
}
```


Similar updates for `useTheoreticalDebuffsReceived`.

### 3. Update Stamina Analysis Hook

**File**: [`src/modules/simulation/tabs/stamina/hooks/useStaminaAnalysis.ts`](src/modules/simulation/tabs/stamina/hooks/useStaminaAnalysis.ts)

**Changes**:

1. Calculate effective stats using green skills
2. Use effective stats for all calculations
3. Accept full race parameters
```typescript
import { calculateEffectiveStats } from '@/modules/skills/skillConditionEvaluator';

export function calculateStaminaAnalysis(
  runner: RunnerState,
  courseId: number,
  raceParams: {
    groundCondition: number;
    weather?: number;
    mood?: number;
  },
): StaminaAnalysis {
  const course = getCourseById(courseId);

  // NEW: Calculate effective stats (base + green skills)
  const effectiveStats = calculateEffectiveStats(runner, courseId, raceParams);

  // Use effective stats instead of runner.X throughout
  const strategy = parseStrategy(runner.strategy);
  const distanceAptitude = parseAptitude(runner.distanceAptitude, 'distance');

  const distance = course.distance;
  const baseSpeed = 20.0 - (distance - 2000) / 1000.0;
  const groundModifier = HpConsumptionGroundModifier[course.surface]?.[raceParams.groundCondition] ?? 1.0;
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * effectiveStats.guts); // Use effective guts

  // Calculate max HP with effective stamina
  const maxHp = 0.8 * HpStrategyCoefficient[strategy] * effectiveStats.stamina + distance;

  // Calculate speeds with effective speed
  const phase0Speed = baseSpeed * StrategyPhaseCoefficient[strategy][0];
  const phase1Speed = baseSpeed * StrategyPhaseCoefficient[strategy][1];
  const baseTargetSpeed2 =
    baseSpeed * StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * effectiveStats.speed) * // Use effective speed
      DistanceProficiencyModifier[distanceAptitude] * 0.002;

  // Max spurt speed with effective speed and guts
  const maxSpurtSpeed =
    (baseTargetSpeed2 + 0.01 * baseSpeed) * 1.05 +
    Math.sqrt(500.0 * effectiveStats.speed) *
      DistanceProficiencyModifier[distanceAptitude] * 0.002 +
    Math.pow(450.0 * effectiveStats.guts, 0.597) * 0.0001;

  // ... rest of calculations using effective stats

  return {
    maxHp,
    totalHpNeeded,
    // ... other fields
    effectiveStats, // NEW: Include in return value
    activeGreenSkills: effectiveStats.activeGreenSkills, // NEW: Show which green skills are active
  };
}
```


### 4. Update Stamina Card Component

**File**: [`src/modules/simulation/tabs/stamina/components/StaminaCard.tsx`](src/modules/simulation/tabs/stamina/components/StaminaCard.tsx)

**Changes**:

1. Pass race parameters from settings to analysis hooks
2. Display active green skills (optional enhancement)
3. Show effective vs base stats (optional enhancement)
```typescript
// Get race settings from store
const { groundCondition, weather } = useRaceSettings();

// Pass to analysis
const analysis = useStaminaAnalysis(runner, courseId, {
  groundCondition,
  weather,
  mood: runner.mood,
});

// Pass to recovery skills
const recoverySkills = useTheoreticalRecoverySkills(
  runner,
  analysis.maxHp,
  courseId,
  { groundCondition, weather, mood: runner.mood }
);
```


## Benefits

1. **Accurate stat calculations**: Green skills properly applied when conditions match
2. **Filtered skill display**: Only show recovery/debuff skills that will actually activate
3. **Better position estimates**: Use activation regions instead of simple phase guessing
4. **Consistent with simulation**: Same logic as actual race simulation uses
5. **Future-proof**: Easy to add more skill types or conditions

## Technical Notes

### Reusing Simulation Infrastructure

The key insight is that **stamina analysis should use the same condition evaluation logic as the race simulation**. This is already implemented in:

- [`ActivationConditions.ts`](src/modules/simulation/lib/ActivationConditions.ts) - All condition evaluators (track_id, ground_condition, weather, distance_type, ground_type, running_style, phase, etc.)
- [`ConditionParser.ts`](src/modules/simulation/lib/ConditionParser.ts) - Parses condition strings into evaluatable operators
- [`RaceSolverBuilder.ts`](src/modules/simulation/lib/RaceSolverBuilder.ts) - Builds HorseParameters from RunnerState

### Green Skills Format

From skill_data.json (same format as all skills):

```json
{
  "rarity": 1,
  "alternatives": [{
    "condition": "ground_condition==1",
    "baseDuration": 0,
    "effects": [{
      "type": 3,        // 1=Speed, 2=Stamina, 3=Power, 4=Guts, 5=Wisdom
      "modifier": 600000, // Stat bonus value * 10000 (divide by 10000 = +60 stat)
      "target": 1       // 1 = Self
    }]
  }]
}
```

Note: Green skills (stat-boosting skills) are identified by having effect types 1-5. The `modifier` value uses the same format as recovery skills - divide by 10000 to get the actual stat bonus.

### Recovery Skills Format

From skill_data.json:

```json
{
  "alternatives": [{
    "condition": "is_finalcorner==1&phase==2",
    "effects": [{
      "type": 9,       // Recovery type
      "modifier": 1500, // 1500 / 10000 = 15% max HP
      "target": 1      // 1 = Self
    }]
  }]
}
```

## Files to Create/Modify

1. **New**: `src/modules/skills/skillConditionEvaluator.ts` - Core utility leveraging simulation/lib
2. [`src/modules/simulation/tabs/stamina/hooks/useRecoverySkills.ts`](src/modules/simulation/tabs/stamina/hooks/useRecoverySkills.ts) - Use condition evaluation
3. [`src/modules/simulation/tabs/stamina/hooks/useStaminaAnalysis.ts`](src/modules/simulation/tabs/stamina/hooks/useStaminaAnalysis.ts) - Use effective stats
4. [`src/modules/simulation/tabs/stamina/components/StaminaCard.tsx`](src/modules/simulation/tabs/stamina/components/StaminaCard.tsx) - Pass race parameters