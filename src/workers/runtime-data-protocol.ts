import type { SkillsMap } from '@/modules/data/skill-types';
import type { UmasMap } from '@/workers/db/storage';

export type WorkerSyncPayload = {
  resourceVersion: string;
  appVersion: string | null;
  skills: SkillsMap;
  umas: UmasMap;
};

export type WorkerSyncInMessage = {
  type: 'init-data';
  payload: WorkerSyncPayload;
};

export type WorkerSyncReadyMessage = {
  type: 'data-ready';
  resourceVersion: string;
};

export type WorkerSyncErrorMessage = {
  type: 'worker-error';
  error: string;
};
