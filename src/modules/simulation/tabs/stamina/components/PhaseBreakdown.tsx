import { cn } from '@/lib/utils';
import { StaminaAnalysis } from '../hooks/useStaminaAnalysis';
import { ActualPhaseHp } from '../hooks/usePhaseHp';
import { RecoverySkillActivation } from '../hooks/useRecoverySkills';

interface PhaseBreakdownProps {
  analysis: StaminaAnalysis;
  phaseHp: ActualPhaseHp[];
  recoverySkills: RecoverySkillActivation[];
  debuffsReceived: RecoverySkillActivation[];
  isTheoretical: boolean;
}

export const PhaseBreakdown = ({
  analysis,
  phaseHp,
  recoverySkills,
  debuffsReceived,
}: PhaseBreakdownProps) => {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">Phase Breakdown</div>
      {analysis.phases.map((phase, i) => {
        const hp = phaseHp[i];
        const hpAtStart = hp?.hpAtStart ?? analysis.maxHp;
        const hpAfterPhase = hp?.hpAtEnd ?? 0;
        const hpConsumed = hp?.hpConsumed ?? phase.hpConsumed;

        // Percentages relative to maxHp
        const hpAtStartPercent = Math.max(
          0,
          (hpAtStart / analysis.maxHp) * 100,
        );
        const hpConsumedPercent = (hpConsumed / analysis.maxHp) * 100;
        const hpRemainingPercent = (hpAfterPhase / analysis.maxHp) * 100;

        // Calculate heals that activated during THIS phase
        const healsDuringPhase = recoverySkills
          .filter(
            (skill) =>
              skill.position >= phase.startDistance &&
              skill.position < phase.endDistance,
          )
          .reduce((sum, skill) => sum + skill.hpRecovered, 0);

        // Calculate debuffs received during THIS phase (hpRecovered is negative)
        const debuffsDuringPhase = debuffsReceived
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
                {debuffsDuringPhase < 0 && (
                  <span className="text-red-500 ml-1">
                    ({debuffsDuringPhase.toFixed(0)})
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
  );
};
