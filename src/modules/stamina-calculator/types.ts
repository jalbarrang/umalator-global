import { GroundCondition } from '@simulation/lib/RaceParameters';
import type { Mood} from '@simulation/lib/RaceParameters';

/**
 * Input state for stamina calculator
 */
export interface StaminaCalculatorInput {
  // Stats
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;

  // Aptitudes
  strategy: string;
  distanceAptitude: string;
  surfaceAptitude: string;
  strategyAptitude: string;
  mood: Mood;

  // Race settings
  courseId: number;
  groundCondition: GroundCondition;

  // Skills
  recoverySkills: Array<string>; // HP recovery skill IDs
  debuffSkills: Array<string>; // HP drain debuff skill IDs

  // Options
  considerSkillProcRate: boolean; // Whether to factor in wisdom-based proc rate
}

/**
 * Individual phase in the race breakdown
 */
export interface PhaseBreakdownRow {
  phaseName: string;
  startSpeed: number; // m/s
  goalSpeed: number; // m/s
  acceleration: number; // m/s²
  timeSeconds: number;
  distanceMeters: number;
  hpConsumption: number;
}

/**
 * Skill effect summary for recovery/debuffs
 */
export interface SkillEffect {
  skillId: string;
  skillName: string;
  hpChange: number; // Positive for recovery, negative for debuffs
  percentage: number; // Percentage of max HP
}

/**
 * Complete calculation results
 */
export interface StaminaCalculationResult {
  // Input echo
  input: StaminaCalculatorInput;

  // Adjusted stats (after motivation, ground, skills)
  adjustedStats: {
    speed: number;
    stamina: number;
    power: number;
    guts: number;
    wisdom: number;
  };

  // HP/Stamina summary
  maxHp: number;
  totalHpNeeded: number;
  hpRemaining: number;
  canMaxSpurt: boolean;

  // Stamina analysis
  requiredStamina: number;
  staminaDeficit: number;

  // Skill effects
  totalRecovery: number;
  totalDrain: number;
  netHpEffect: number;
  recoverySkillEffects: Array<SkillEffect>;
  debuffSkillEffects: Array<SkillEffect>;

  // Rates and probabilities
  skillProcRate: number; // 0-1 (e.g., 0.925 = 92.5%)
  rushingRate: number; // 0-1 (e.g., 0.0974 = 9.74%)

  // Speed information
  maxSpurtSpeed: number;
  baseTargetSpeed2: number;

  // Detailed phase breakdown
  phases: Array<PhaseBreakdownRow>;

  // Calculation timestamp
  calculatedAt: number;
}

/**
 * Calculator store state
 */
export interface StaminaCalculatorState {
  // Input state
  input: StaminaCalculatorInput;

  // Calculation results
  result: StaminaCalculationResult | null;

  // UI state
  isCalculating: boolean;
  error: string | null;

  // Actions
  setInput: (input: Partial<StaminaCalculatorInput>) => void;
  setResult: (result: StaminaCalculationResult) => void;
  setCalculating: (isCalculating: boolean) => void;
  setError: (error: string | null) => void;
  calculate: () => void;
  reset: () => void;
}

/**
 * Default input values
 */
export const DEFAULT_CALCULATOR_INPUT: StaminaCalculatorInput = {
  speed: 1200,
  stamina: 1200,
  power: 900,
  guts: 400,
  wisdom: 400,
  strategy: 'Senkou', // Pace Chaser
  distanceAptitude: 'S',
  surfaceAptitude: 'A',
  strategyAptitude: 'A',
  mood: 2, // Great Mood
  courseId: 10103, // Default to Tokyo 2400m Turf
  groundCondition: GroundCondition.Good,
  recoverySkills: [],
  debuffSkills: [],
  considerSkillProcRate: false,
};
