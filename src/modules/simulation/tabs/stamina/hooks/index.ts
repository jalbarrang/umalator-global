export {
  useStaminaAnalysis,
  calculateStaminaAnalysis,
  HpStrategyCoefficient,
  type StaminaAnalysis,
  type PhaseBreakdown,
} from './useStaminaAnalysis';

export {
  useActualRecoverySkills,
  useTheoreticalRecoverySkills,
  getRecoverySkillInfo,
  type RecoverySkillActivation,
} from './useRecoverySkills';

// Re-export from skills/utils for convenience
export { estimateSkillActivationPhase } from '@/modules/skills/utils';

export {
  useActualPhaseHp,
  useTheoreticalPhaseHp,
  type ActualPhaseHp,
} from './usePhaseHp';

