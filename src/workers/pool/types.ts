import type { CourseData } from '@/modules/simulation/lib/courses/types';
import type { RaceParameters } from '@simulation/lib/RaceParameters';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SimulationOptions, SkillBasinResponse } from '@simulation/types';

export type WorkerState = 'idle' | 'busy' | 'terminated';

export type WorkBatch = {
  batchId: number;
  skills: string[];
  stage: 1 | 2 | 3 | 4;
  nsamples: number;
  includeRunData: boolean;
};

export type SimulationParams = {
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  pacer: RunnerState | null;
  options: SimulationOptions;
};

// Messages from main thread to worker
export type WorkerInMessage =
  | { type: 'init'; workerId: number; params: SimulationParams }
  | { type: 'work-batch'; batch: WorkBatch }
  | { type: 'terminate' };

// Messages from worker to main thread
export type WorkerOutMessage =
  | { type: 'worker-ready'; workerId: number }
  | {
      type: 'batch-complete';
      workerId: number;
      batchId: number;
      results: SkillBasinResponse;
    }
  | { type: 'request-work'; workerId: number }
  | { type: 'worker-error'; workerId: number; error: string };

// Skill Basin specific messages
export type SkillBasinWorkerInMessage = WorkerInMessage;
export type SkillBasinWorkerOutMessage = WorkerOutMessage;

// Uma Basin specific messages
export type UmaBasinWorkerInMessage = WorkerInMessage;
export type UmaBasinWorkerOutMessage = WorkerOutMessage;
