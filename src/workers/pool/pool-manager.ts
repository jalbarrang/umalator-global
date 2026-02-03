import { STAGE_CONFIGS, WorkQueue } from './work-queue';
import type { PoolMetrics, SkillComparisonResponse } from '@/modules/simulation/types';
import type {
  SimulationParams,
  SimulationProgress,
  WorkerInMessage,
  WorkerOutMessage,
  WorkerState,
} from './types';

export type PoolManagerCallbacks = {
  onProgress?: (results: SkillComparisonResponse, progress: SimulationProgress) => void;
  onStageComplete?: (
    stage: number,
    results: SkillComparisonResponse,
    progress: SimulationProgress,
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

  constructor(
    workerGenerator: (options: { name: string }) => Worker,
    poolSize = navigator.hardwareConcurrency || 4,
  ) {
    this.workerGenerator = workerGenerator;
    this.poolSize = Math.max(2, Math.min(poolSize, 16)); // Clamp between 2 and 16
  }

  /**
   * Initialize the worker pool
   */
  private initializeWorkers(): void {
    this.terminateWorkers();

    this.workers = Array.from({ length: this.poolSize }, (_, id) => {
      const worker = this.workerGenerator({
        name: `pool-worker-${id}`,
      });

      worker.addEventListener('message', (event: MessageEvent<WorkerOutMessage>) => {
        this.handleWorkerMessage(id, event.data);
      });

      worker.addEventListener('error', (event) => {
        console.error(`Worker ${id} error:`, event);
        this.workerStates.set(id, 'terminated');
        this.callbacks.onError?.(new Error(`Worker ${id} crashed: ${event.message}`));
      });

      this.workerStates.set(id, 'idle');
      return worker;
    });
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

      case 'batch-complete':
        this.workQueue?.completeBatch(message.batchId, message.results);
        this.workerStates.set(workerId, 'idle');

        // Send progress update
        if (this.workQueue) {
          const progress = this.workQueue.getProgress();
          this.callbacks.onProgress?.(this.workQueue.getResults(), progress);
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

    if (batch) {
      this.workerStates.set(workerId, 'busy');
      this.sendToWorker(workerId, { type: 'work-batch', batch });
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
      skillsProcessed: this.totalSkills,
    };

    this.isRunning = false;
    this.callbacks.onComplete?.(results, metrics);
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

    // Calculate batch size based on skill count and worker count
    const approximateSkillsBatchSize = Math.ceil(skills.length / (this.poolSize * 4));
    // Minimum batch size is 5
    const batchSize = Math.max(5, approximateSkillsBatchSize);

    this.workQueue = new WorkQueue(skills, batchSize);

    // Initialize workers
    this.initializeWorkers();

    // Send initialization message to all workers
    this.workers.forEach((worker, id) => {
      worker.postMessage({
        type: 'init',
        workerId: id,
        params,
      } as WorkerInMessage);
    });
  }

  /**
   * Terminate all workers
   */
  terminateWorkers(): void {
    this.workers.forEach((worker, id) => {
      worker.terminate();
      this.workerStates.set(id, 'terminated');
    });
    this.workers = [];
    this.isRunning = false;
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
