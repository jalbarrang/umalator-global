import { useMemo } from 'react';
import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useRaceStore } from '@/store/race/store';
import { getCourseById } from '@/modules/racetrack/courses';
import {
  parseStrategy,
  parseAptitude,
} from '@simulation/lib/RaceSolverBuilder';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { cn } from '@/lib/utils';
import { getSkillDataById, getSkillNameById } from '@/modules/skills/utils';

// Strategy HP coefficients from race mechanics
const HpStrategyCoefficient = [0, 0.95, 0.89, 1.0, 0.995, 0.86] as const;

// Strategy phase coefficients for target speed
const StrategyPhaseCoefficient = [
  [],
  [1.0, 0.98, 0.962], // Nige
  [0.978, 0.991, 0.975], // Senkou
  [0.938, 0.998, 0.994], // Sasi
  [0.931, 1.0, 1.0], // Oikomi
  [1.063, 0.962, 0.95], // Oonige
] as const;

const DistanceProficiencyModifier = [
  1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1,
] as const;

// HP consumption ground modifier
const HpConsumptionGroundModifier = [
  [],
  [0, 1.0, 1.0, 1.02, 1.02], // Turf
  [0, 1.0, 1.0, 1.01, 1.02], // Dirt
] as const;

// Helper to identify recovery skills and extract their recovery amounts
function getRecoverySkillInfo(skillId: string): {
  isRecovery: boolean;
  modifier: number;
} {
  const data = getSkillDataById(skillId);
  const effect = data?.alternatives?.[0]?.effects?.find(
    (e: { type: number }) => e.type === 9,
  );
  return { isRecovery: !!effect, modifier: effect?.modifier ?? 0 };
}

// Interface for recovery skill activation data
interface RecoverySkillActivation {
  skillId: string;
  skillName: string;
  position: number;
  hpRecovered: number;
}

// Interface for actual HP values from simulation at phase boundaries
interface ActualPhaseHp {
  hpAtStart: number;
  hpAtEnd: number;
  hpConsumed: number;
}

// Helper to find HP at a specific position from simulation data
function findHpAtPosition(
  positions: number[],
  hpValues: number[],
  targetPosition: number,
): number | null {
  if (!positions || !hpValues || positions.length === 0) return null;

  // Find the closest position index
  let closestIdx = 0;
  let closestDist = Math.abs(positions[0] - targetPosition);

  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(positions[i] - targetPosition);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
    // Early exit if we've passed the target and distance is increasing
    if (positions[i] > targetPosition && dist > closestDist) break;
  }

  return hpValues[closestIdx];
}

interface PhaseBreakdown {
  phase: string;
  startDistance: number;
  endDistance: number;
  speed: number;
  hpConsumed: number;
  timeSeconds: number;
}

interface StaminaAnalysis {
  maxHp: number;
  totalHpNeeded: number;
  hpRemaining: number;
  canMaxSpurt: boolean;
  requiredStamina: number;
  staminaDeficit: number;
  phases: PhaseBreakdown[];
  maxSpurtSpeed: number;
  baseTargetSpeed2: number;
}

function calculateStaminaAnalysis(
  runner: RunnerState,
  courseId: number,
  groundCondition: number,
): StaminaAnalysis {
  const course = getCourseById(courseId);
  const strategy = parseStrategy(runner.strategy);
  const distanceAptitude = parseAptitude(runner.distanceAptitude, 'distance');

  const distance = course.distance;
  const baseSpeed = 20.0 - (distance - 2000) / 1000.0;
  const groundModifier =
    HpConsumptionGroundModifier[course.surface]?.[groundCondition] ?? 1.0;
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * runner.guts);

  // Calculate max HP
  const maxHp =
    0.8 * HpStrategyCoefficient[strategy] * runner.stamina + distance;

  // Calculate speeds for each phase
  const phase0Speed = baseSpeed * StrategyPhaseCoefficient[strategy][0];
  const phase1Speed = baseSpeed * StrategyPhaseCoefficient[strategy][1];
  const baseTargetSpeed2 =
    baseSpeed * StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * runner.speed) *
      DistanceProficiencyModifier[distanceAptitude] *
      0.002;

  // Calculate max spurt speed
  const maxSpurtSpeed =
    (baseTargetSpeed2 + 0.01 * baseSpeed) * 1.05 +
    Math.sqrt(500.0 * runner.speed) *
      DistanceProficiencyModifier[distanceAptitude] *
      0.002 +
    Math.pow(450.0 * runner.guts, 0.597) * 0.0001;

  // Phase distances (matching game terminology)
  // Phase 0 (Early-race): 0 to 1/6
  // Phase 1 (Mid-race): 1/6 to 2/3
  // Phase 2 (Late-race/Final leg): 2/3 to 5/6
  // Phase 3 (Last Spurt): 5/6 to finish
  const phase0Distance = distance / 6;
  const phase1Distance = (distance * 2) / 3 - phase0Distance;
  const phase2Distance = (distance * 5) / 6 - (distance * 2) / 3;
  const phase3Distance = distance - (distance * 5) / 6 - 60; // 60m buffer

  // HP consumption formula: 20 * (velocity - baseSpeed + 12)² / 144 * groundModifier * gutsModifier
  const calcHpPerSecond = (velocity: number, isLatePhase: boolean) => {
    const guts = isLatePhase ? gutsModifier : 1.0;
    return (
      ((20.0 * Math.pow(velocity - baseSpeed + 12.0, 2)) / 144.0) *
      groundModifier *
      guts
    );
  };

  // Phase 0 (Early-race)
  const phase0HpPerSec = calcHpPerSecond(phase0Speed, false);
  const phase0Time = phase0Distance / phase0Speed;
  const phase0Hp = phase0HpPerSec * phase0Time;

  // Phase 1 (Mid-race)
  const phase1HpPerSec = calcHpPerSecond(phase1Speed, false);
  const phase1Time = phase1Distance / phase1Speed;
  const phase1Hp = phase1HpPerSec * phase1Time;

  // Phase 2 (Late-race/Final leg) - uses guts modifier and max spurt speed
  const phase2HpPerSec = calcHpPerSecond(maxSpurtSpeed, true);
  const phase2Time = phase2Distance / maxSpurtSpeed;
  const phase2Hp = phase2HpPerSec * phase2Time;

  // Phase 3 (Last Spurt) - uses guts modifier and max spurt speed
  const phase3HpPerSec = calcHpPerSecond(maxSpurtSpeed, true);
  const phase3Time = phase3Distance / maxSpurtSpeed;
  const phase3Hp = phase3HpPerSec * phase3Time;

  const totalHpNeeded = phase0Hp + phase1Hp + phase2Hp + phase3Hp;
  const hpRemaining = maxHp - totalHpNeeded;
  const canMaxSpurt = hpRemaining >= 0;

  // Calculate required stamina for max spurt
  // Solve: 0.8 * coef * stamina + distance >= totalHpNeeded
  // stamina >= (totalHpNeeded - distance) / (0.8 * coef)
  const requiredStamina = Math.ceil(
    (totalHpNeeded - distance) / (0.8 * HpStrategyCoefficient[strategy]),
  );
  const staminaDeficit = Math.max(0, requiredStamina - runner.stamina);

  // Calculate phase start/end positions
  const phase0Start = 0;
  const phase0End = phase0Distance;
  const phase1Start = phase0End;
  const phase1End = phase1Start + phase1Distance;
  const phase2Start = phase1End;
  const phase2End = phase2Start + phase2Distance;
  const phase3Start = phase2End;
  const phase3End = distance;

  const phases: PhaseBreakdown[] = [
    {
      phase: 'Early-race',
      startDistance: phase0Start,
      endDistance: phase0End,
      speed: phase0Speed,
      hpConsumed: phase0Hp,
      timeSeconds: phase0Time,
    },
    {
      phase: 'Mid-race',
      startDistance: phase1Start,
      endDistance: phase1End,
      speed: phase1Speed,
      hpConsumed: phase1Hp,
      timeSeconds: phase1Time,
    },
    {
      phase: 'Final leg',
      startDistance: phase2Start,
      endDistance: phase2End,
      speed: maxSpurtSpeed,
      hpConsumed: phase2Hp,
      timeSeconds: phase2Time,
    },
    {
      phase: 'Last Spurt',
      startDistance: phase3Start,
      endDistance: phase3End,
      speed: maxSpurtSpeed,
      hpConsumed: phase3Hp,
      timeSeconds: phase3Time,
    },
  ];

  return {
    maxHp,
    totalHpNeeded,
    hpRemaining,
    canMaxSpurt,
    requiredStamina,
    staminaDeficit,
    phases,
    maxSpurtSpeed,
    baseTargetSpeed2,
  };
}

interface StaminaCardProps {
  runner: RunnerState;
  analysis: StaminaAnalysis;
  label: string;
  color: string;
  recoverySkills: RecoverySkillActivation[];
  actualPhaseHp: ActualPhaseHp[] | null;
}

const StaminaCard = ({
  runner,
  analysis,
  label,
  color,
  recoverySkills,
  actualPhaseHp,
}: StaminaCardProps) => {
  const totalRecovery = recoverySkills.reduce(
    (sum, skill) => sum + skill.hpRecovered,
    0,
  );

  // Calculate adjusted required stamina accounting for recovery skills
  // Formula: stamina >= (totalHpNeeded - recovery - distance) / (0.8 * coef)
  const strategy = parseStrategy(runner.strategy);
  const course = getCourseById(useSettingsStore.getState().courseId);
  const adjustedHpNeeded = Math.max(0, analysis.totalHpNeeded - totalRecovery);
  const adjustedRequiredStamina = Math.ceil(
    (adjustedHpNeeded - course.distance) /
      (0.8 * HpStrategyCoefficient[strategy]),
  );
  const adjustedStaminaDeficit = Math.max(
    0,
    adjustedRequiredStamina - runner.stamina,
  );
  const canMaxSpurtWithRecovery =
    analysis.maxHp + totalRecovery >= analysis.totalHpNeeded;

  const hasActualData = actualPhaseHp && actualPhaseHp.length > 0;

  return (
    <div className="bg-background border-2 rounded-lg p-4">
      <h4 className={cn('text-sm font-semibold mb-3', color)}>{label}</h4>

      {/* Max Spurt Status */}
      <div
        className={cn(
          'mb-4 p-3 rounded-lg text-center font-semibold',
          canMaxSpurtWithRecovery
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30',
        )}
      >
        {canMaxSpurtWithRecovery ? (
          <span>
            ✓ Can Max Spurt (
            {(analysis.maxHp + totalRecovery - analysis.totalHpNeeded).toFixed(
              0,
            )}{' '}
            HP remaining)
          </span>
        ) : (
          <span>
            ✗ Cannot Max Spurt (need +{adjustedStaminaDeficit} stamina)
          </span>
        )}
      </div>

      {/* HP Overview */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Current Stamina:</span>
          <span className="font-mono font-medium">{runner.stamina}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Required Stamina:</span>
          <span
            className={cn(
              'font-mono font-medium',
              adjustedRequiredStamina > runner.stamina
                ? 'text-red-500'
                : 'text-green-500',
            )}
          >
            {adjustedRequiredStamina}
            {totalRecovery > 0 && (
              <span className="text-muted-foreground text-xs ml-1">
                (w/ heals)
              </span>
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Max HP:</span>
          <span className="font-mono font-medium">
            {analysis.maxHp.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">HP Needed:</span>
          <span className="font-mono font-medium">
            {analysis.totalHpNeeded.toFixed(0)}
          </span>
        </div>
        {totalRecovery > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground">HP Recovered:</span>
            <span className="font-mono font-medium text-green-500">
              +{totalRecovery.toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* Recovery Skills */}
      {recoverySkills.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
            Recovery Skills ({recoverySkills.length})
          </div>
          <div className="space-y-1">
            {recoverySkills.map((skill, i) => (
              <div
                key={`${skill.skillId}-${i}`}
                className="flex justify-between text-xs"
              >
                <span className="text-foreground truncate mr-2">
                  {skill.skillName}
                </span>
                <span className="font-mono text-green-500 whitespace-nowrap">
                  +{skill.hpRecovered.toFixed(0)} HP @{' '}
                  {skill.position.toFixed(0)}m
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-green-500/20 flex justify-between text-xs font-medium">
            <span className="text-green-600 dark:text-green-400">
              Total Recovery:
            </span>
            <span className="font-mono text-green-500">
              +{totalRecovery.toFixed(0)} HP
            </span>
          </div>
        </div>
      )}

      {/* HP After Race Bar */}
      <div className="mb-4">
        <div className="text-sm text-foreground mb-1">HP after race</div>
        {(() => {
          const hpRemaining =
            analysis.maxHp + totalRecovery - analysis.totalHpNeeded;
          const hpRemainingPercent = Math.max(
            0,
            (hpRemaining / analysis.maxHp) * 100,
          );
          const isPositive = hpRemaining >= 0;

          return (
            <>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                {/* Remaining HP (green) or deficit indicator (red) */}
                <div
                  className={cn(
                    'h-full transition-all',
                    isPositive ? 'bg-green-500' : 'bg-red-500',
                  )}
                  style={{
                    width: isPositive
                      ? `${Math.min(100, hpRemainingPercent)}%`
                      : '100%',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span
                  className={cn(
                    'font-mono',
                    isPositive ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {isPositive ? '+' : ''}
                  {hpRemaining.toFixed(0)} HP ({hpRemainingPercent.toFixed(1)}%)
                </span>
                <span>{analysis.maxHp.toFixed(0)}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Phase Breakdown - HP depletion visualization */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">
          Phase Breakdown
          {hasActualData && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (Actual from simulation)
            </span>
          )}
        </div>
        {analysis.phases.map((phase, i) => {
          // Get actual HP data if available, otherwise use theoretical
          const actual = actualPhaseHp?.[i];

          // Theoretical values (without heals)
          const theoreticalHpUsedBefore = analysis.phases
            .slice(0, i)
            .reduce((sum, p) => sum + p.hpConsumed, 0);
          const theoreticalHpAtStart = analysis.maxHp - theoreticalHpUsedBefore;
          const theoreticalHpAfterPhase =
            theoreticalHpAtStart - phase.hpConsumed;

          // Use actual values if available, otherwise theoretical
          const hpAtStart = actual?.hpAtStart ?? theoreticalHpAtStart;
          const hpAfterPhase = actual?.hpAtEnd ?? theoreticalHpAfterPhase;
          const hpConsumed = actual?.hpConsumed ?? phase.hpConsumed;

          // Percentages relative to maxHp
          const hpAtStartPercent = Math.max(
            0,
            (hpAtStart / analysis.maxHp) * 100,
          );
          const hpConsumedPercent = (hpConsumed / analysis.maxHp) * 100;
          const hpRemainingPercent = (hpAfterPhase / analysis.maxHp) * 100;

          // Calculate heals that actually activated during THIS phase
          const healsDuringPhase = recoverySkills
            .filter(
              (skill) =>
                skill.position >= phase.startDistance &&
                skill.position < phase.endDistance,
            )
            .reduce((sum, skill) => sum + skill.hpRecovered, 0);

          return (
            <div key={i} className="text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">{phase.phase}</span>
                <span className="font-mono">
                  <span
                    className={cn({
                      'text-red-500': hpAfterPhase < 0,
                      'text-blue-400': hpAfterPhase > 0,
                      'text-muted-foreground': hpAfterPhase === 0,
                    })}
                  >
                    {hpAfterPhase.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    / {analysis.maxHp.toFixed(0)} HP
                  </span>
                  <span className="text-blue-600 ml-1">
                    (-{hpConsumed.toFixed(0)})
                  </span>
                  {healsDuringPhase > 0 && (
                    <span className="text-green-500 ml-1">
                      (+{healsDuringPhase.toFixed(0)})
                    </span>
                  )}
                </span>
              </div>

              {/* HP bar showing remaining (light) and consumed this phase (dark) */}
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                {/* Light blue: HP remaining after this phase */}
                {hpRemainingPercent > 0 && (
                  <div
                    className="absolute left-0 h-full bg-blue-400"
                    style={{ width: `${Math.max(0, hpRemainingPercent)}%` }}
                  />
                )}
                {/* Dark blue: HP consumed during this phase */}
                <div
                  className="absolute h-full bg-blue-600"
                  style={{
                    left: `${Math.max(0, hpRemainingPercent)}%`,
                    width: `${Math.min(hpConsumedPercent, hpAtStartPercent)}%`,
                  }}
                />
                {/* Red: HP deficit (negative HP) */}
                {hpAfterPhase < 0 && (
                  <div
                    className="absolute right-0 h-full bg-red-500"
                    style={{
                      width: `${Math.min(100, Math.abs(hpRemainingPercent))}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-muted-foreground mt-0.5">
                <span>
                  {phase.startDistance.toFixed(0)}m -{' '}
                  {phase.endDistance.toFixed(0)}m @ {phase.speed.toFixed(2)} m/s
                </span>
                <span>{phase.timeSeconds.toFixed(1)}s</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Speed Info */}
      <div className="mt-4 pt-3 border-t border-border space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Spurt Speed:</span>
          <span className="font-mono">
            {analysis.maxSpurtSpeed.toFixed(3)} m/s
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Base Target Speed (Phase 2):
          </span>
          <span className="font-mono">
            {analysis.baseTargetSpeed2.toFixed(3)} m/s
          </span>
        </div>
      </div>
    </div>
  );
};

export const StaminaTab = () => {
  const { uma1, uma2 } = useRunnersStore();
  const { courseId, racedef } = useSettingsStore();
  const { chartData } = useRaceStore();

  const analysis1 = useMemo(() => {
    return calculateStaminaAnalysis(uma1, courseId, racedef.ground);
  }, [uma1, courseId, racedef.ground]);

  const analysis2 = useMemo(() => {
    return calculateStaminaAnalysis(uma2, courseId, racedef.ground);
  }, [uma2, courseId, racedef.ground]);

  // Extract recovery skills from simulation results
  const recoverySkills1 = useMemo(() => {
    if (!chartData?.sk?.[0]) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, positions] of chartData.sk[0].entries()) {
      const { isRecovery, modifier } = getRecoverySkillInfo(skillId);
      if (isRecovery) {
        const [skillName] = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP
        const hpRecovered = (modifier / 10000) * analysis1.maxHp;

        positions.forEach(([start]) => {
          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered,
          });
        });
      }
    }
    return skills.sort((a, b) => a.position - b.position);
  }, [chartData, analysis1.maxHp]);

  const recoverySkills2 = useMemo(() => {
    if (!chartData?.sk?.[1]) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, positions] of chartData.sk[1].entries()) {
      const { isRecovery, modifier } = getRecoverySkillInfo(skillId);
      if (isRecovery) {
        const [skillName] = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP
        const hpRecovered = (modifier / 10000) * analysis2.maxHp;

        positions.forEach(([start]) => {
          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered,
          });
        });
      }
    }
    return skills.sort((a, b) => a.position - b.position);
  }, [chartData, analysis2.maxHp]);

  // Calculate actual HP values from simulation for Uma 1
  const actualPhaseHp1 = useMemo((): ActualPhaseHp[] | null => {
    if (!chartData?.p?.[0] || !chartData?.hp?.[0]) return null;

    const positions = chartData.p[0];
    const hpValues = chartData.hp[0];

    return analysis1.phases.map((phase) => {
      const hpAtStart =
        findHpAtPosition(positions, hpValues, phase.startDistance) ??
        analysis1.maxHp;
      const hpAtEnd =
        findHpAtPosition(positions, hpValues, phase.endDistance) ?? 0;
      const hpConsumed = Math.max(0, hpAtStart - hpAtEnd);

      return { hpAtStart, hpAtEnd, hpConsumed };
    });
  }, [chartData, analysis1.phases, analysis1.maxHp]);

  // Calculate actual HP values from simulation for Uma 2
  const actualPhaseHp2 = useMemo((): ActualPhaseHp[] | null => {
    if (!chartData?.p?.[1] || !chartData?.hp?.[1]) return null;

    const positions = chartData.p[1];
    const hpValues = chartData.hp[1];

    return analysis2.phases.map((phase) => {
      const hpAtStart =
        findHpAtPosition(positions, hpValues, phase.startDistance) ??
        analysis2.maxHp;
      const hpAtEnd =
        findHpAtPosition(positions, hpValues, phase.endDistance) ?? 0;
      const hpConsumed = Math.max(0, hpAtStart - hpAtEnd);

      return { hpAtStart, hpAtEnd, hpConsumed };
    });
  }, [chartData, analysis2.phases, analysis2.maxHp]);

  const course = getCourseById(courseId);

  return (
    <div className="space-y-4">
      {/* Course Info */}
      <div className="bg-background border-2 rounded-lg p-3 text-center">
        <span className="text-sm text-muted-foreground">
          Analyzing stamina for {course.distance}m course
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaminaCard
          runner={uma1}
          analysis={analysis1}
          label="Uma 1"
          color="text-[#2a77c5] dark:text-blue-500"
          recoverySkills={recoverySkills1}
          actualPhaseHp={actualPhaseHp1}
        />
        <StaminaCard
          runner={uma2}
          analysis={analysis2}
          label="Uma 2"
          color="text-[#c52a2a] dark:text-red-500"
          recoverySkills={recoverySkills2}
          actualPhaseHp={actualPhaseHp2}
        />
      </div>
    </div>
  );
};
