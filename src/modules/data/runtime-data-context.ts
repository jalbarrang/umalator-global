import type { SkillsMap } from './skill-types';
import type { UmasMap } from '@/workers/db/storage';
import staticSkillsJson from './skills.json';
import staticUmasJson from './umas.json';

export type RuntimeMasterDbData = {
  resourceVersion: string;
  appVersion: string | null;
  skills: SkillsMap;
  umas: UmasMap;
};

type RuntimeDataListener = () => void;

const listeners = new Set<RuntimeDataListener>();

let runtimeMasterDbData: RuntimeMasterDbData = {
  resourceVersion: 'static',
  appVersion: null,
  skills: staticSkillsJson as SkillsMap,
  umas: staticUmasJson as UmasMap,
};

function emitRuntimeDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getRuntimeMasterDbData(): RuntimeMasterDbData {
  return runtimeMasterDbData;
}

export function getRuntimeSkills(): SkillsMap {
  return runtimeMasterDbData.skills;
}

export function getRuntimeUmas(): UmasMap {
  return runtimeMasterDbData.umas;
}

export function getRuntimeResourceVersion(): string {
  return runtimeMasterDbData.resourceVersion;
}

export function getRuntimeAppVersion(): string | null {
  return runtimeMasterDbData.appVersion;
}

export function setRuntimeMasterDbData(nextData: RuntimeMasterDbData): void {
  if (
    runtimeMasterDbData.resourceVersion === nextData.resourceVersion &&
    runtimeMasterDbData.appVersion === nextData.appVersion &&
    runtimeMasterDbData.skills === nextData.skills &&
    runtimeMasterDbData.umas === nextData.umas
  ) {
    return;
  }

  runtimeMasterDbData = nextData;
  emitRuntimeDataChanged();
}

export function subscribeRuntimeMasterDbData(listener: RuntimeDataListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
