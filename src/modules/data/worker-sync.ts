import { getMasterDbWorkerSyncPayload } from './master-db.store';
import type {
  WorkerSyncErrorMessage,
  WorkerSyncInMessage,
  WorkerSyncPayload,
  WorkerSyncReadyMessage,
} from '@/workers/runtime-data-protocol';

type WorkerSyncAckMessage = WorkerSyncReadyMessage | WorkerSyncErrorMessage;
const DEFAULT_SYNC_TIMEOUT_MS = 10_000;

export type SyncWorkerRuntimeDataOptions = {
  timeoutMs?: number;
};

function isWorkerSyncAckMessage(value: unknown): value is WorkerSyncAckMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  return type === 'data-ready' || type === 'worker-error';
}

export function syncWorkerRuntimeData(
  worker: Worker,
  payload: WorkerSyncPayload = getMasterDbWorkerSyncPayload(),
  options: SyncWorkerRuntimeDataOptions = {},
): Promise<void> {
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_SYNC_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerSyncAckMessage(event.data)) {
        return;
      }

      if (event.data.type === 'worker-error') {
        cleanup();
        reject(new Error(event.data.error));
        return;
      }

      if (event.data.resourceVersion === payload.resourceVersion) {
        cleanup();
        resolve();
      }
    };

    worker.addEventListener('message', onMessage);
    timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for worker data sync (${payload.resourceVersion})`,
        ),
      );
    }, timeoutMs);

    const message: WorkerSyncInMessage = {
      type: 'init-data',
      payload,
    };
    try {
      worker.postMessage(message);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
