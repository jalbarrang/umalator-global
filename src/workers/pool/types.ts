import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SimulationOptions, SkillComparisonResponse } from '@/modules/simulation/types';
import type { WorkerSyncPayload } from '@/workers/runtime-data-protocol';

export type WorkerState = 'idle' | 'busy' | 'terminated';

export type SimulationProgress = {
  currentStage: 1 | 2 | 3 | 4;
  totalStages: 4;
  skillsCompletedInStage: number;
  totalSkillsInStage: number;
};

export type WorkBatch = {
  batchId: number;
  skills: Array<string>;
  stage: 1 | 2 | 3 | 4;
  nsamples: number;
};

export type SimulationParams = {
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  options: SimulationOptions;
};

// Messages from main thread to worker
export type WorkerInMessage =
  | { type: 'init'; workerId: number; params: SimulationParams; syncPayload: WorkerSyncPayload }
  | { type: 'work-batch'; batch: WorkBatch }
  | { type: 'terminate' };

// Messages from worker to main thread
export type WorkerOutMessage =
  | { type: 'worker-ready'; workerId: number; resourceVersion: string }
  | {
      type: 'batch-complete';
      workerId: number;
      batchId: number;
      results: SkillComparisonResponse;
    }
  | { type: 'request-work'; workerId: number }
  | { type: 'worker-error'; workerId: number; error: string };

// Skill Basin specific messages
export type SkillBasinWorkerInMessage = WorkerInMessage;
export type SkillBasinWorkerOutMessage = WorkerOutMessage;

// Uma Basin specific messages
export type UmaBasinWorkerInMessage = WorkerInMessage;
export type UmaBasinWorkerOutMessage = WorkerOutMessage;
