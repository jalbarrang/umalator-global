export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Candidate skill with purchase metadata
export interface CandidateSkill {
  /**
   * ID of the skill
   */
  skillId: string;
  /**
   * Cost of the skill
   */
  cost: number;
  /**
   * Hint level of the skill
   */
  hintLevel: HintLevel;

  // Stackable support
  isStackable: boolean; // Can be purchased twice
  tierLevel?: 1 | 2; // 1=base (○), 2=upgrade (◎)
  nextTierId?: string; // ID of next tier (upgrade tier)
  previousTierId?: string; // ID of previous tier (base tier)

  // Gold/White relationship
  // Note: I think these values should be calculated on the fly, not stored in the candidate or handle this in a different way.
  //       The only alternative that comes to mind is to record the skill group only and calculate it that way.
  isGold: boolean; // rarity=2 (gold) or rarity=1 (white)
  whiteSkillId?: string; // White version of this gold skill
  goldSkillId?: string; // Gold version of this white skill
  baseTierIdForGold?: string; // For gold skills, the base tier white skill ID
}

// Optimization result
export type OptimizationResult = {
  skillsToBuy: ReadonlyArray<string>;
  totalCost: Readonly<number>;
  bashinStats: Readonly<{
    min: number;
    max: number;
    mean: number;
    median: number;
  }>;
  simulationCount: Readonly<number>;
  timeTaken: Readonly<number>;
  allResults: ReadonlyArray<CombinationResult>; // For showing alternative combinations
};

// Individual combination result during optimization
export interface CombinationResult {
  skills: Array<string>;
  cost: number;
  bashin: number;
}

// Progress update from worker
export interface OptimizationProgress {
  completed: number;
  total: number;
  currentBest: CombinationResult | null;
}

// Cost breakdown for individual skills
export interface CostBreakdown {
  skillId: string;
  baseCost: number;
  hintDiscount: number;
  bundledWhiteCost?: number; // For gold skills when white not obtained
  finalCost: number;
}
