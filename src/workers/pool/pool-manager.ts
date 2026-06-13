import { STAGE_CONFIGS, WorkQueue } from './work-queue';
import { compileUmaSimWasmModule } from '@/lib/uma-sim-wasm/loader';
import { buildSkillSamplingPlan } from '@/modules/simulation/simulators/wasm-skill-compare-plan';
import type { Run1RoundParams } from '@/modules/simulation/types';
import type { SkillSamplingPlan } from '@/modules/simulation/simulators/wasm-skill-compare';

/** Resolves a batch's skills into a data-free sampling plan (injectable for tests). */
export type SkillSamplingPlanBuilder = (params: Run1RoundParams) => SkillSamplingPlan;

/** Opt-in pool perf logging: `localStorage.torena_perf = '1'`. */
function perfEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem('torena_perf') === '1';
  } catch {
    return false;
  }
}
import type { PoolMetrics, SkillComparisonResponse } from '@/modules/simulation/types';
import type {
  SimulationParams,
  SimulationProgress,
  WorkerInMessage,
  WorkerOutMessage,
  WorkerState
} from './types';

export type PoolManagerCallbacks = {
  onProgress?: (results: SkillComparisonResponse, progress: SimulationProgress) => void;
  onStageComplete?: (
    stage: number,
    results: SkillComparisonResponse,
    progress: SimulationProgress
  ) => void;
  onComplete?: (results: SkillComparisonResponse, metrics: PoolMetrics) => void;
  onError?: (error: Error) => void;
};

export class PoolManager {
  private workers: Array<Worker> = [];
  private workerStates: Map<number, WorkerState> = new Map();
  private workQueue: WorkQueue | null = null;
  private callbacks: PoolManagerCallbacks = {};
  private startTime = 0;
  private totalSkills = 0;
  private workerGenerator: (options: { name: string }) => Worker;
  private poolSize: number;
  private isRunning = false;
  private params: SimulationParams | null = null;
  private planBuilder: SkillSamplingPlanBuilder;
  // Perf counters (only meaningful when perfEnabled()).
  private perfPlanBuildMs = 0;
  private perfWorkerBusyMs = 0;
  private perfBatches = 0;
  private perfDispatchAt = new Map<number, number>();

  constructor(
    workerGenerator: (options: { name: string }) => Worker,
    poolSize = navigator.hardwareConcurrency || 4,
    planBuilder: SkillSamplingPlanBuilder = buildSkillSamplingPlan
  ) {
    this.workerGenerator = workerGenerator;
    this.poolSize = Math.max(2, Math.min(poolSize, 16)); // Clamp between 2 and 16
    this.planBuilder = planBuilder;
  }

  /**
   * Initialize the worker pool
   */
  private initializeWorkers(): void {
    this.disposeWorkers();

    this.workers = Array.from({ length: this.poolSize }, (_, id) => {
      const worker = this.workerGenerator({
        name: `pool-worker-${id}`
      });

      worker.addEventListener('message', (event: MessageEvent<WorkerOutMessage>) => {
        this.handleWorkerMessage(id, event.data);
      });

      worker.addEventListener('error', (event) => {
        console.error(`Worker ${id} error:`, event);
        this.workerStates.set(id, 'terminated');
        this.callbacks.onError?.(new Error(`Worker ${id} crashed: ${event.message}`));
      });

      this.workerStates.set(id, 'busy');
      return worker;
    });
  }

  private disposeWorkers(): void {
    this.workers.forEach((worker, id) => {
      worker.terminate();
      this.workerStates.set(id, 'terminated');
    });
    this.workers = [];
    this.workerStates.clear();
  }

  private resetRunState(): void {
    this.workQueue = null;
    this.callbacks = {};
    this.startTime = 0;
    this.totalSkills = 0;
    this.isRunning = false;
    this.params = null;
    this.perfPlanBuildMs = 0;
    this.perfWorkerBusyMs = 0;
    this.perfBatches = 0;
    this.perfDispatchAt.clear();
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(workerId: number, message: WorkerOutMessage): void {
    switch (message.type) {
      case 'worker-ready':
        this.workerStates.set(workerId, 'idle');
        this.assignWorkToWorker(workerId);
        break;

      case 'batch-complete': {
        const dispatchedAt = this.perfDispatchAt.get(workerId);
        if (dispatchedAt !== undefined) {
          this.perfWorkerBusyMs += performance.now() - dispatchedAt;
          this.perfDispatchAt.delete(workerId);
        }
        this.workQueue?.completeBatch(message.batchId, message.results);
        this.workerStates.set(workerId, 'idle');

        // Send progress update
        if (this.workQueue) {
          const progress = this.workQueue.getProgress();
          this.callbacks.onProgress?.(message.results, progress);
        }

        // Check if stage is complete
        if (this.workQueue?.isStageComplete()) {
          const currentStage = this.workQueue.getCurrentStage();
          const progress = this.workQueue.getProgress();

          this.callbacks.onStageComplete?.(currentStage, this.workQueue.getResults(), progress);

          // Try to advance to next stage
          if (!this.workQueue.advanceToNextStage()) {
            // All stages complete
            this.completeSimulation();
            return;
          }

          // Distribute work for new stage to all idle workers
          this.distributeWorkToIdleWorkers();
        } else {
          // Assign more work to this worker
          this.assignWorkToWorker(workerId);
        }
        break;
      }

      case 'request-work':
        this.assignWorkToWorker(workerId);
        break;

      case 'worker-error':
        console.error(`Worker ${workerId} reported error:`, message.error);
        this.workerStates.set(workerId, 'terminated');
        break;
    }
  }

  /**
   * Assign work to a specific worker
   */
  private assignWorkToWorker(workerId: number): void {
    if (!this.workQueue || this.workerStates.get(workerId) !== 'idle') {
      return;
    }

    const batch = this.workQueue.getNextBatch();

    if (batch && this.params) {
      this.workerStates.set(workerId, 'busy');
      // Resolve this batch's skills into a data-free plan on the main thread;
      // the worker runs it without importing the dataset.
      const planStart = performance.now();
      const plan = this.planBuilder({
        nsamples: batch.nsamples,
        skills: batch.skills,
        course: this.params.course,
        racedef: this.params.racedef,
        uma: this.params.uma,
        options: this.params.options
      });
      this.perfPlanBuildMs += performance.now() - planStart;
      this.perfBatches += 1;
      this.perfDispatchAt.set(workerId, performance.now());
      this.sendToWorker(workerId, { type: 'work-batch', batchId: batch.batchId, plan });
    }
  }

  /**
   * Distribute work to all idle workers
   */
  private distributeWorkToIdleWorkers(): void {
    this.workerStates.forEach((state, workerId) => {
      if (state === 'idle') {
        this.assignWorkToWorker(workerId);
      }
    });
  }

  /**
   * Send a message to a specific worker
   */
  private sendToWorker(workerId: number, message: WorkerInMessage): void {
    const worker = this.workers[workerId];
    if (worker) {
      worker.postMessage(message);
    }
  }

  /**
   * Complete the simulation and report metrics
   */
  private completeSimulation(): void {
    if (!this.workQueue) return;

    const timeTaken = performance.now() - this.startTime;
    const results = this.workQueue.getResults();

    // Calculate total samples (estimate based on skill progression through stages)
    const totalSamples = this.calculateTotalSamples();

    const metrics: PoolMetrics = {
      timeTaken: Math.round(timeTaken),
      totalSamples,
      workerCount: this.poolSize,
      skillsProcessed: this.totalSkills
    };

    if (perfEnabled()) {
      const wall = Math.round(timeTaken);
      const planBuild = Math.round(this.perfPlanBuildMs);
      const workerBusy = Math.round(this.perfWorkerBusyMs);
      console.info(
        `[pool-perf] wall=${wall}ms | main-thread plan-build=${planBuild}ms (${
          wall > 0 ? Math.round((planBuild / wall) * 100) : 0
        }% of wall) | worker-busy(sum)=${workerBusy}ms across ${this.perfBatches} batches | ` +
          `parallelism=${workerBusy > 0 ? (workerBusy / Math.max(wall, 1)).toFixed(1) : '0'}x | ` +
          `skills=${this.totalSkills} pool=${this.poolSize}`
      );
    }

    this.callbacks.onComplete?.(results, metrics);
    this.resetRunState();
  }

  /**
   * Calculate total samples run (estimate)
   */
  private calculateTotalSamples(): number {
    // Simplified calculation: assume all skills run through all stages
    // In reality, filtered skills run fewer samples
    return this.totalSkills * STAGE_CONFIGS.reduce((sum, s) => sum + s.nsamples, 0);
  }

  /**
   * Run simulation with given skills and parameters
   */
  run(skills: Array<string>, params: SimulationParams, callbacks: PoolManagerCallbacks): void {
    if (this.isRunning) {
      throw new Error('Simulation already running');
    }

    this.isRunning = true;
    this.callbacks = callbacks;
    this.startTime = performance.now();
    this.totalSkills = skills.length;
    this.params = params;

    // Calculate batch size based on skill count and worker count
    const approximateSkillsBatchSize = Math.ceil(skills.length / (this.poolSize * 4));
    // Minimum batch size is 5
    const batchSize = Math.max(5, approximateSkillsBatchSize);

    this.workQueue = new WorkQueue(skills, batchSize);

    // Initialize workers
    this.initializeWorkers();

    // Compile the WASM module ONCE on the main thread and share the compiled
    // module with every worker, so the pool pays a single compile instead of
    // one per worker (reduces startup delay/jank). If compilation fails we send
    // the init without a module and each worker self-compiles as before.
    compileUmaSimWasmModule()
      .then((compiledModule) => this.broadcastInit(compiledModule))
      .catch((error) => {
        console.warn('Shared WASM compile failed; workers will self-compile.', error);
        this.broadcastInit(undefined);
      });
  }

  /** Send the init message (optionally with a shared compiled module) to all workers. */
  private broadcastInit(compiledModule?: WebAssembly.Module): void {
    this.workers.forEach((worker, id) => {
      worker.postMessage({
        type: 'init',
        workerId: id,
        compiledModule
      } as WorkerInMessage);
    });
  }

  /**
   * Terminate all workers
   */
  terminateWorkers(): void {
    this.disposeWorkers();
    this.resetRunState();
  }

  /**
   * Get the current running state
   */
  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the pool size
   */
  getPoolSize(): number {
    return this.poolSize;
  }
}
