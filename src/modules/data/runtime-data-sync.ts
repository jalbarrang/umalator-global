import type { SkillsMap } from './skill-types';
import type { UmasMap } from '@/workers/db/storage';
import { setRuntimeMasterDbData } from './runtime-data-context';
import { rebuildTokenizedConditionsCache } from '@/modules/skills/conditions';
import { rebuildSkillDerivedCaches } from '@/modules/skills/utils';

export type RuntimeMasterDbSyncPayload = {
  resourceVersion: string;
  appVersion: string | null;
  skills: SkillsMap;
  umas: UmasMap;
};

export function syncRuntimeMasterDbData(payload: RuntimeMasterDbSyncPayload): void {
  setRuntimeMasterDbData({
    resourceVersion: payload.resourceVersion,
    appVersion: payload.appVersion,
    skills: payload.skills,
    umas: payload.umas,
  });

  rebuildTokenizedConditionsCache();
  rebuildSkillDerivedCaches();
}
