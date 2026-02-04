import { Activity, Calculator } from 'lucide-react';
import { useMemo } from 'react';
import { calculateStatsWithSkills } from '../utils/calculateStatsWithSkills';
import { RecoverySkillsList } from './RecoverySkillsList';
import { PhaseBreakdown } from './PhaseBreakdown';
import type { StaminaAnalysis } from '../hooks/useStaminaAnalysis';
import type { RecoverySkillActivation } from '../hooks/useRecoverySkills';
import type { ActualPhaseHp } from '../hooks/usePhaseHp';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { parseStrategy } from '@/modules/simulation/lib/core/RaceSolverBuilder';
import { GroundCondition } from '@/modules/simulation/lib/course/definitions';
import { cn } from '@/lib/utils';
import { getCourseById } from '@/modules/racetrack/courses';
import { useSettingsStore } from '@/store/settings.store';

import { Switch } from '@/components/ui/switch';
import { HpStrategyCoefficient } from '@/modules/simulation/lib/runner/health/game.policy';

interface StaminaCardProps {
  runner: RunnerState;
  analysis: StaminaAnalysis;
  label: string;
  color: string;
  recoverySkills: Array<RecoverySkillActivation>;
  debuffsReceived: Array<RecoverySkillActivation>;
  phaseHp: Array<ActualPhaseHp>;
  isTheoretical: boolean;
  hasSimulationData?: boolean;
  onModeToggle?: () => void;
}

export const StaminaCard = (props: StaminaCardProps) => {
  const {
    runner,
    analysis,
    label,
    color,
    recoverySkills,
    debuffsReceived,
    phaseHp,
    isTheoretical,
    hasSimulationData = false,
    onModeToggle,
  } = props;

  const { courseId, racedef } = useSettingsStore();

  const strategy = useMemo(() => parseStrategy(runner.strategy), [runner.strategy]);
  const course = useMemo(() => getCourseById(courseId), [courseId]);

  const groundCondition = useMemo(() => racedef?.ground ?? GroundCondition.Good, [racedef]);

  // Calculate stats with green skills applied (includes both buffs and debuffs)
  const { adjustedStats, greenSkillModifiers } = useMemo(
    () => calculateStatsWithSkills(runner, courseId, groundCondition),
    [runner, courseId, groundCondition],
  );

  // Calculate max HP with green skill-adjusted stamina
  // Formula: MaxHP = 0.8 * StrategyCoefficient * adjustedStamina + CourseDistance
  const adjustedMaxHp = useMemo(() => {
    return 0.8 * HpStrategyCoefficient[strategy] * adjustedStats.stamina + course.distance;
  }, [strategy, adjustedStats.stamina, course.distance]);

  const totalRecovery = useMemo(() => {
    return recoverySkills.reduce((sum, skill) => sum + skill.hpRecovered, 0);
  }, [recoverySkills]);

  // debuffsReceived have negative hpRecovered values
  const totalDebuff = debuffsReceived.reduce((sum, skill) => sum + skill.hpRecovered, 0);

  // Net HP effect from skills (heals - debuffs)
  const netHpEffect = totalRecovery + totalDebuff;

  // Calculate adjusted required stamina accounting for recovery skills, debuffs, and green skills
  // Formula: stamina >= (totalHpNeeded - netEffect - distance) / (0.8 * coef)
  const adjustedHpNeeded = Math.max(0, analysis.totalHpNeeded - netHpEffect);
  const adjustedRequiredStamina = Math.ceil(
    (adjustedHpNeeded - course.distance) / (0.8 * HpStrategyCoefficient[strategy]),
  );

  // Calculate stamina deficit using adjusted stamina (raw stamina + green skill modifiers)
  const adjustedStaminaDeficit = Math.max(0, adjustedRequiredStamina - adjustedStats.stamina);

  // Use adjustedMaxHp for determining if max spurt is achievable
  const canMaxSpurtWithSkills = adjustedMaxHp + netHpEffect >= analysis.totalHpNeeded;

  return (
    <div className="bg-background border-2 rounded-lg p-4">
      {/* Header with label and mode toggle */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={cn('text-sm font-semibold', color)}>{label}</h4>

        {/* Mode indicator/toggle */}
        {hasSimulationData ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                !isTheoretical ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
              )}
            >
              <Activity className="w-3 h-3 inline mr-1" />
              Actual
            </span>
            <Switch
              checked={isTheoretical}
              onCheckedChange={onModeToggle}
              className={cn(
                isTheoretical
                  ? 'data-[state=checked]:bg-amber-500'
                  : 'data-[state=unchecked]:bg-green-500',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                isTheoretical ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            >
              <Calculator className="w-3 h-3 inline mr-1" />
              Theoretical
            </span>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
              'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            <Calculator className="w-3 h-3" />
            <span>Theoretical</span>
          </div>
        )}
      </div>

      {/* Max Spurt Status */}
      <div
        className={cn(
          'mb-4 p-3 rounded-lg text-center font-semibold',
          canMaxSpurtWithSkills
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30',
        )}
      >
        {canMaxSpurtWithSkills ? (
          <span>
            ✓ Can Max Spurt ({(adjustedMaxHp + netHpEffect - analysis.totalHpNeeded).toFixed(0)} HP
            remaining)
          </span>
        ) : (
          <span>✗ Cannot Max Spurt (need +{adjustedStaminaDeficit} stamina)</span>
        )}
      </div>

      {/* HP Overview */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Current Stamina:</span>
          <span className="font-mono font-medium">
            {runner.stamina}
            {greenSkillModifiers.stamina !== 0 && (
              <span
                className={cn(
                  'ml-1',
                  greenSkillModifiers.stamina > 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                ({greenSkillModifiers.stamina > 0 ? '+' : ''}
                {Math.round(greenSkillModifiers.stamina)})
              </span>
            )}
          </span>
        </div>
        {greenSkillModifiers.guts !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Guts Modifier:</span>
            <span className="font-mono font-medium">
              {runner.guts}
              <span
                className={cn(
                  'ml-1',
                  greenSkillModifiers.guts > 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                ({greenSkillModifiers.guts > 0 ? '+' : ''}
                {Math.round(greenSkillModifiers.guts)})
              </span>
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Required Stamina:</span>
          <span
            className={cn(
              'font-mono font-medium',
              adjustedRequiredStamina > adjustedStats.stamina ? 'text-red-500' : 'text-green-500',
            )}
          >
            {adjustedRequiredStamina}
            {(netHpEffect !== 0 || greenSkillModifiers.stamina !== 0) && (
              <span className="text-muted-foreground text-xs ml-1">(w/ skills)</span>
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Max HP:</span>
          <span className="font-mono font-medium">
            {adjustedMaxHp.toFixed(0)}
            {greenSkillModifiers.stamina !== 0 && (
              <span className="text-muted-foreground text-xs ml-1">(w/ greens)</span>
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">HP Needed:</span>
          <span className="font-mono font-medium">{analysis.totalHpNeeded.toFixed(0)}</span>
        </div>
        {totalRecovery > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground">HP Recovered:</span>
            <span className="font-mono font-medium text-green-500">
              +{totalRecovery.toFixed(0)}
            </span>
          </div>
        )}
        {totalDebuff < 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground">HP Lost (Debuffs):</span>
            <span className="font-mono font-medium text-red-500">{totalDebuff.toFixed(0)}</span>
          </div>
        )}
      </div>

      {/* Recovery Skills and Debuffs */}
      <RecoverySkillsList
        recoverySkills={recoverySkills}
        debuffsReceived={debuffsReceived}
        isTheoretical={isTheoretical}
      />

      {/* HP After Race Bar */}
      <div className="mb-4">
        <div className="text-sm text-foreground mb-1">HP after race</div>
        {(() => {
          const hpRemaining = adjustedMaxHp + netHpEffect - analysis.totalHpNeeded;
          const hpRemainingPercent = Math.max(0, (hpRemaining / adjustedMaxHp) * 100);
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
                    width: isPositive ? `${Math.min(100, hpRemainingPercent)}%` : '100%',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span className={cn('font-mono', isPositive ? 'text-green-500' : 'text-red-500')}>
                  {isPositive ? '+' : ''}
                  {hpRemaining.toFixed(0)} HP ({hpRemainingPercent.toFixed(1)}%)
                </span>
                <span>{adjustedMaxHp.toFixed(0)}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Phase Breakdown */}
      <PhaseBreakdown
        analysis={analysis}
        phaseHp={phaseHp}
        recoverySkills={recoverySkills}
        debuffsReceived={debuffsReceived}
        isTheoretical={isTheoretical}
      />

      {/* Speed Info */}
      <div className="mt-4 pt-3 border-t border-border space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Spurt Speed:</span>
          <span className="font-mono">{analysis.maxSpurtSpeed.toFixed(3)} m/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Target Speed (Phase 2):</span>
          <span className="font-mono">{analysis.baseTargetSpeed2.toFixed(3)} m/s</span>
        </div>
      </div>
    </div>
  );
};
