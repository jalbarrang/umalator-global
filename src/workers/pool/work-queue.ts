import { mergeSkillResults } from '../utils';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { WorkBatch } from './types';

export type StageConfig = {
  stage: 1 | 2 | 3 | 4;
  nsamples: number;
  includeRunData: boolean;
};

export const STAGE_CONFIGS: Array<StageConfig> = [
  { stage: 1, nsamples: 5, includeRunData: true },
  { stage: 2, nsamples: 20, includeRunData: true },
  { stage: 3, nsamples: 50, includeRunData: true },
  { stage: 4, nsamples: 200, includeRunData: true },
];

export class WorkQueue {
  private skills: Array<string> = [];
  private currentStageIndex = 0;
  private batchSize: number;
  private nextBatchId = 0;
  private pendingBatches = new Map<number, Array<string>>(); // batchId -> skills
  private completedBatches = new Map<number, SkillComparisonResponse>();
  private stageResults: SkillComparisonResponse = {};

  constructor(skills: Array<string>, batchSize = 10) {
    this.skills = [...skills];
    this.batchSize = batchSize;
  }

  /**
   * Get the next work batch for a worker
   * Returns null if no more work is available in the current stage
   */
  getNextBatch(): WorkBatch | null {
    if (this.skills.length === 0) {
      return null;
    }

    const stageConfig = STAGE_CONFIGS[this.currentStageIndex];
    const batchSkills = this.skills.splice(0, this.batchSize);

    const batchId = this.nextBatchId++;

    this.pendingBatches.set(batchId, batchSkills);

    return {
      batchId,
      skills: batchSkills,
      stage: stageConfig.stage,
      nsamples: stageConfig.nsamples,
      includeRunData: stageConfig.includeRunData,
    };
  }

  /**
   * Handle a completed batch from a worker
   */
  completeBatch(batchId: number, results: SkillComparisonResponse): void {
    this.pendingBatches.delete(batchId);
    this.completedBatches.set(batchId, results);

    // Merge results into stage results
    Object.entries(results).forEach(([key, value]) => {
      const existing = this.stageResults[key];
      if (existing) {
        this.stageResults[key] = mergeSkillResults(existing, value);
      } else {
        this.stageResults[key] = value;
      }
    });
  }

  /**
   * Check if the current stage is complete
   */
  isStageComplete(): boolean {
    return this.skills.length === 0 && this.pendingBatches.size === 0;
  }

  /**
   * Move to the next stage, applying filters based on results
   */
  advanceToNextStage(): boolean {
    if (this.currentStageIndex >= STAGE_CONFIGS.length - 1) {
      return false; // Already at final stage
    }

    const currentStage = STAGE_CONFIGS[this.currentStageIndex].stage;
    const nextSkills: Array<string> = [];

    // Apply filter based on current stage
    Object.entries(this.stageResults).forEach(([skillId, result]) => {
      if (currentStage === 1) {
        // Stage 1 filter: max > 0.1
        if (result.max > 0.1) {
          nextSkills.push(skillId);
        } else {
          // Create new object with filterReason since result might be frozen
          this.stageResults[skillId] = {
            ...result,
            filterReason: 'negligible-effect',
          };
        }
      } else if (currentStage === 2) {
        // Stage 2 filter: spread > 0.1
        if (Math.abs(result.max - result.min) > 0.1) {
          nextSkills.push(skillId);
        } else {
          // Create new object with filterReason since result might be frozen
          this.stageResults[skillId] = {
            ...result,
            filterReason: 'low-variance',
          };
        }
      } else {
        // Stages 3 and 4: no filtering
        nextSkills.push(skillId);
      }
    });

    this.skills = nextSkills;
    this.currentStageIndex++;
    this.pendingBatches.clear();
    this.completedBatches.clear();

    return true;
  }

  /**
   * Check if all stages are complete
   */
  isComplete(): boolean {
    return this.currentStageIndex >= STAGE_CONFIGS.length - 1 && this.isStageComplete();
  }

  /**
   * Get the current accumulated results
   */
  getResults(): SkillComparisonResponse {
    return this.stageResults;
  }

  /**
   * Get the current stage number
   */
  getCurrentStage(): number {
    return STAGE_CONFIGS[this.currentStageIndex].stage;
  }

  /**
   * Get remaining skills count
   */
  getRemainingSkillsCount(): number {
    return this.skills.length;
  }

  /**
   * Get pending batches count
   */
  getPendingBatchesCount(): number {
    return this.pendingBatches.size;
  }
}
