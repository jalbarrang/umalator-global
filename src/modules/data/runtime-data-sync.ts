import type { SkillsMap } from './skill-types';
import type { UmasMap } from '@/workers/db/storage';
import { setRuntimeMasterDbData } from './runtime-data-context';
import { rebuildTokenizedConditionsCache } from '@/modules/skills/conditions';
import { rebuildSkillDerivedCaches, translateSkillNamesForLang } from '@/modules/skills/utils';
import i18n from '@/i18n';

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

  i18n.addResourceBundle(
    'en',
    'translation',
    { skillnames: translateSkillNamesForLang('en') },
    true,
    true,
  );
  i18n.addResourceBundle(
    'ja',
    'translation',
    { skillnames: translateSkillNamesForLang('ja') },
    true,
    true,
  );
}
