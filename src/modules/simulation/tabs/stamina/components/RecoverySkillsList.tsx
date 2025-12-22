import type { RecoverySkillActivation } from '../hooks/useRecoverySkills';
import { cn } from '@/lib/utils';

type RecoverySkillsListProps = {
  recoverySkills: Array<RecoverySkillActivation>;
  debuffsReceived: Array<RecoverySkillActivation>;
  isTheoretical: boolean;
};

export const RecoverySkillsList = (props: RecoverySkillsListProps) => {
  const { recoverySkills, debuffsReceived, isTheoretical } = props;

  const hasHeals = recoverySkills.length > 0;
  const hasDebuffs = debuffsReceived.length > 0;

  if (!hasHeals && !hasDebuffs) return null;

  const totalRecovery = recoverySkills.reduce((sum, skill) => sum + skill.hpRecovered, 0);

  // debuffsReceived have negative hpRecovered values
  const totalDebuff = debuffsReceived.reduce((sum, skill) => sum + skill.hpRecovered, 0);

  const netEffect = totalRecovery + totalDebuff;

  return (
    <div className="mb-4 space-y-2">
      {/* Recovery Skills (Heals) */}
      {hasHeals && (
        <div
          className={cn(
            'p-3 rounded-lg bg-green-500/5',
            isTheoretical
              ? 'border border-dashed border-green-500/30'
              : 'border border-green-500/20',
          )}
        >
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
            Recovery Skills ({recoverySkills.length})
            {isTheoretical && (
              <span className="text-xs font-normal text-muted-foreground ml-2">(estimated)</span>
            )}
          </div>
          <div className="space-y-1">
            {recoverySkills.map((skill, i) => (
              <div key={`heal-${skill.skillId}-${i}`} className="flex justify-between text-xs">
                <span className="text-foreground truncate mr-2">{skill.skillName}</span>

                <span className="font-mono text-green-500 whitespace-nowrap">
                  +{skill.hpRecovered.toFixed(0)} HP @ {skill.position.toFixed(0)}m
                  {skill.isEstimated && <span className="text-muted-foreground ml-1">(est.)</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-green-500/20 flex justify-between text-xs font-medium">
            <span className="text-green-600 dark:text-green-400">Total Recovery:</span>
            <span className="font-mono text-green-500">+{totalRecovery.toFixed(0)} HP</span>
          </div>
        </div>
      )}

      {/* Debuffs Received (HP Drains) */}
      {hasDebuffs && (
        <div
          className={cn(
            'p-3 rounded-lg bg-red-500/5',
            isTheoretical ? 'border border-dashed border-red-500/30' : 'border border-red-500/20',
          )}
        >
          <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Debuffs Received ({debuffsReceived.length})
            {isTheoretical && (
              <span className="text-xs font-normal text-muted-foreground ml-2">(estimated)</span>
            )}
          </div>
          <div className="space-y-1">
            {debuffsReceived.map((skill, i) => (
              <div key={`debuff-${skill.skillId}-${i}`} className="flex justify-between text-xs">
                <span className="text-foreground truncate mr-2">{skill.skillName}</span>
                <span className="font-mono text-red-500 whitespace-nowrap">
                  {skill.hpRecovered.toFixed(0)} HP @ {skill.position.toFixed(0)}m
                  {skill.isEstimated && <span className="text-muted-foreground ml-1">(est.)</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-red-500/20 flex justify-between text-xs font-medium">
            <span className="text-red-600 dark:text-red-400">Total Drain:</span>
            <span className="font-mono text-red-500">{totalDebuff.toFixed(0)} HP</span>
          </div>
        </div>
      )}

      {/* Net Effect (if both heals and debuffs exist) */}
      {hasHeals && hasDebuffs && (
        <div className="flex justify-between text-xs font-medium px-3">
          <span className="text-muted-foreground">Net HP Effect:</span>
          <span className={cn('font-mono', netEffect >= 0 ? 'text-green-500' : 'text-red-500')}>
            {netEffect >= 0 ? '+' : ''}
            {netEffect.toFixed(0)} HP
          </span>
        </div>
      )}
    </div>
  );
};
