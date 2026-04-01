import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { calculateSkillCost } from '@/modules/skill-planner/cost-calculator';
import type { HintLevel } from '@/modules/skill-planner/types';
import { getRepresentativePrerequisiteIds } from '@/modules/skill-planner/skill-family';
import { useShallow } from 'zustand/shallow';
import { getBaseTier, getUpgradeTier } from '@/modules/skills/skill-relationships';

const SKILL_COST_META_STORE_NAME = 'umalator-skill-cost-meta';

export type SkillCostMeta = {
  hintLevel: HintLevel;
  bought?: boolean;
  received?: boolean;
  removed?: boolean;
};

export type RunnerCostSettings = {
  hasFastLearner: boolean;
};

type SkillCostMetaState = {
  skillMetaByKey: Record<string, SkillCostMeta>;
  runnerSettingsById: Record<string, RunnerCostSettings>;
};

const DEFAULT_META: SkillCostMeta = {
  hintLevel: 0,
};

const getSkillKey = (runnerId: string, skillId: string) => `${runnerId}:${skillId}`;

const normalizeMeta = (meta: SkillCostMeta): SkillCostMeta | undefined => {
  const next: SkillCostMeta = {
    hintLevel: meta.hintLevel,
    bought: meta.bought || undefined,
    received: meta.received || undefined,
    removed: meta.removed || undefined,
  };

  const hasFlags = next.bought || next.received || next.removed;

  if (next.hintLevel === 0 && !hasFlags) {
    return undefined;
  }

  return next;
};

const resolveMeta = (
  state: SkillCostMetaState,
  runnerId: string,
  skillId: string,
): SkillCostMeta => {
  const key = getSkillKey(runnerId, skillId);
  const meta = state.skillMetaByKey[key];

  if (!meta) {
    return DEFAULT_META;
  }

  return {
    hintLevel: meta.hintLevel ?? 0,
    bought: meta.bought,
    received: meta.received,
    removed: meta.removed,
  };
};

export const useSkillCostMetaStore = create<SkillCostMetaState>()(
  persist(
    (_) => ({
      skillMetaByKey: {},
      runnerSettingsById: {},
    }),
    {
      name: SKILL_COST_META_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Actions

const updateSkillMeta = (runnerId: string, skillId: string, updates: Partial<SkillCostMeta>) => {
  useSkillCostMetaStore.setState((state) => {
    const key = getSkillKey(runnerId, skillId);
    const current = resolveMeta(state, runnerId, skillId);
    const normalized = normalizeMeta({ ...current, ...updates });

    if (!normalized) {
      const next = { ...state.skillMetaByKey };
      delete next[key];
      return { skillMetaByKey: next };
    }

    return {
      skillMetaByKey: {
        ...state.skillMetaByKey,
        [key]: normalized,
      },
    };
  });
};

export const setHintLevel = (runnerId: string, skillId: string, hintLevel: HintLevel) => {
  updateSkillMeta(runnerId, skillId, { hintLevel });
};

export const setBought = (runnerId: string, skillId: string, bought: boolean) => {
  useSkillCostMetaStore.setState((state) => {
    const nextSkillMetaByKey = { ...state.skillMetaByKey };

    const applyBoughtState = (targetSkillId: string, isBought: boolean) => {
      const key = getSkillKey(runnerId, targetSkillId);
      const current = resolveMeta({ ...state, skillMetaByKey: nextSkillMetaByKey }, runnerId, targetSkillId);
      const normalized = normalizeMeta({ ...current, bought: isBought });

      if (!normalized) {
        delete nextSkillMetaByKey[key];
        return;
      }

      nextSkillMetaByKey[key] = normalized;
    };

    applyBoughtState(skillId, bought);

    const baseTierId = getBaseTier(skillId);
    const upgradeTierId = getUpgradeTier(baseTierId);
    if (upgradeTierId && skillId === upgradeTierId && baseTierId && bought) {
      applyBoughtState(baseTierId, true);
    }

    if (upgradeTierId && skillId === baseTierId && !bought) {
      applyBoughtState(upgradeTierId, false);
    }

    return { skillMetaByKey: nextSkillMetaByKey };
  });
};

export const setReceived = (runnerId: string, skillId: string, received: boolean) => {
  updateSkillMeta(runnerId, skillId, { received });
};

export const setRemoved = (runnerId: string, skillId: string, removed: boolean) => {
  updateSkillMeta(runnerId, skillId, { removed });
};

export const getSkillCostMeta = (runnerId: string, skillId: string): SkillCostMeta => {
  const state = useSkillCostMetaStore.getState();
  return resolveMeta(state, runnerId, skillId);
};

export const getNetCostForSkill = (runnerId: string, skillId: string): number => {
  const state = useSkillCostMetaStore.getState();
  const meta = resolveMeta(state, runnerId, skillId);

  if (meta.bought) {
    return 0;
  }

  return calculateSkillCost(
    skillId,
    meta.hintLevel,
    state.runnerSettingsById[runnerId]?.hasFastLearner ?? false,
  );
};

/**
 * Computes the total net cost for a skill, including prerequisite/family costs.
 * Mirrors the "Totals" row from the cost-details popover.
 */
export function computeTotalNetCost(
  skillId: string,
  runnerId: string,
  skillMetaMap: Record<string, SkillCostMeta>,
  hasFastLearner: boolean,
): number {
  const key = `${runnerId}:${skillId}`;
  const selfMeta = skillMetaMap[key];

  const selfHint: HintLevel = selfMeta?.hintLevel ?? 0;
  const selfNet = calculateSkillCost(skillId, selfHint, hasFastLearner);
  const prereqIds = getRepresentativePrerequisiteIds(skillId);
  if (prereqIds.length === 0) return selfNet;

  let prereqNet = 0;
  for (const pid of prereqIds) {
    const pKey = `${runnerId}:${pid}`;
    const pMeta = skillMetaMap[pKey];
    if (pMeta?.bought) continue;
    prereqNet += calculateSkillCost(pid, pMeta?.hintLevel ?? 0, hasFastLearner);
  }

  return selfNet + prereqNet;
}

export const setFastLearner = (runnerId: string, hasFastLearner: boolean) => {
  useSkillCostMetaStore.setState((state) => ({
    runnerSettingsById: {
      ...state.runnerSettingsById,
      [runnerId]: { hasFastLearner },
    },
  }));
};

export const runnerHasFastLearner = (runnerId: string): boolean => {
  return useSkillCostMetaStore.getState().runnerSettingsById[runnerId]?.hasFastLearner ?? false;
};

export const useSkillCostMeta = (runnerId: string, skillId: string) => {
  return useSkillCostMetaStore(useShallow((state) => resolveMeta(state, runnerId, skillId)));
};

export const useRunnerHasFastLearner = (runnerId: string) => {
  return useSkillCostMetaStore(
    useShallow((state) => {
      const runner = state.runnerSettingsById[runnerId];
      if (!runner) {
        return false;
      }

      return runner.hasFastLearner;
    }),
  );
};
