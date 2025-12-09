import type { SkillBasinResponse } from '@simulation/types';
import type { WorkBatch } from './types';

export type StageConfig = {
  stage: 1 | 2 | 3 | 4;
  nsamples: number;
  includeRunData: boolean;
};

export const STAGE_CONFIGS: StageConfig[] = [
  { stage: 1, nsamples: 5, includeRunData: false },
  { stage: 2, nsamples: 20, includeRunData: false },
  { stage: 3, nsamples: 50, includeRunData: false },
  { stage: 4, nsamples: 200, includeRunData: true },
];

export class WorkQueue {
  private skills: string[] = [];
  private currentStageIndex = 0;
  private batchSize: number;
  private nextBatchId = 0;
  private pendingBatches = new Map<number, string[]>(); // batchId -> skills
  private completedBatches = new Map<number, SkillBasinResponse>();
  private stageResults: SkillBasinResponse = new Map();

  constructor(skills: string[], batchSize = 10) {
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
  completeBatch(batchId: number, results: SkillBasinResponse): void {
    this.pendingBatches.delete(batchId);
    this.completedBatches.set(batchId, results);

    // Merge results into stage results
    results.forEach((value, key) => {
      const existing = this.stageResults.get(key);
      if (existing) {
        // Merge with existing results
        const combinedResults = existing.results
          .concat(value.results)
          .sort((a, b) => a - b);

        const mid = Math.floor(combinedResults.length / 2);
        const newMedian =
          combinedResults.length % 2 === 0
            ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
            : combinedResults[mid];

        const combinedMean =
          (existing.mean * existing.results.length +
            value.mean * value.results.length) /
          combinedResults.length;

        this.stageResults.set(key, {
          ...value,
          results: combinedResults,
          min: Math.min(existing.min, value.min),
          max: Math.max(existing.max, value.max),
          mean: combinedMean,
          median: newMedian,
          runData: value.runData || existing.runData,
          filterReason: value.filterReason || existing.filterReason,
        });
      } else {
        this.stageResults.set(key, value);
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
    const nextSkills: string[] = [];

    // Apply filter based on current stage
    this.stageResults.forEach((result, skillId) => {
      if (currentStage === 1) {
        // Stage 1 filter: max > 0.1
        if (result.max > 0.1) {
          nextSkills.push(skillId);
        } else {
          // Create new object with filterReason since result might be frozen
          this.stageResults.set(skillId, {
            ...result,
            filterReason: 'negligible-effect',
          });
        }
      } else if (currentStage === 2) {
        // Stage 2 filter: spread > 0.1
        if (Math.abs(result.max - result.min) > 0.1) {
          nextSkills.push(skillId);
        } else {
          // Create new object with filterReason since result might be frozen
          this.stageResults.set(skillId, {
            ...result,
            filterReason: 'low-variance',
          });
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
    return (
      this.currentStageIndex >= STAGE_CONFIGS.length - 1 &&
      this.isStageComplete()
    );
  }

  /**
   * Get the current accumulated results
   */
  getResults(): SkillBasinResponse {
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
