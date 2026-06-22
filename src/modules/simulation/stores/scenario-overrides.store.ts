import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { CompareRunnerId } from '../compare.types';
import type { ForcedRegion, ForcedRankRegion } from '../types';

type RunnerScenarioOverrides = {
  forcedRushed: ForcedRegion | null;
  forcedDueling: ForcedRegion | null;
  forcedSpotStruggle: ForcedRegion | null;
  forcedRank: Array<ForcedRankRegion>;
};

const emptyOverrides = (): RunnerScenarioOverrides => ({
  forcedRushed: null,
  forcedDueling: null,
  forcedSpotStruggle: null,
  forcedRank: []
});

type ScenarioOverridesStoreState = {
  uma1: RunnerScenarioOverrides;
  uma2: RunnerScenarioOverrides;
};

export const useScenarioOverridesStore = create<ScenarioOverridesStoreState>()(
  persist(
    () => ({
      uma1: emptyOverrides(),
      uma2: emptyOverrides()
    }),
    {
      name: 'umalator-scenario-overrides',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate(persisted: unknown) {
        // v0 (or stale) used array-shaped keys; v1 uses single-region | null
        const state = persisted as Record<string, Record<string, unknown>> | undefined;
        if (!state) return { uma1: emptyOverrides(), uma2: emptyOverrides() };

        const migrateRunner = (raw: Record<string, unknown>): RunnerScenarioOverrides => {
          const rushed = Array.isArray(raw.forcedRushedRegions)
            ? ((raw.forcedRushedRegions[0] as ForcedRegion | undefined) ?? null)
            : ((raw.forcedRushed as ForcedRegion | null) ?? null);
          const dueling = Array.isArray(raw.forcedDuelingRegions)
            ? ((raw.forcedDuelingRegions[0] as ForcedRegion | undefined) ?? null)
            : ((raw.forcedDueling as ForcedRegion | null) ?? null);
          const spotStruggle = Array.isArray(raw.forcedSpotStruggleRegions)
            ? ((raw.forcedSpotStruggleRegions[0] as ForcedRegion | undefined) ?? null)
            : ((raw.forcedSpotStruggle as ForcedRegion | null) ?? null);
          const forcedRank = Array.isArray(raw.forcedRank)
            ? (raw.forcedRank as Array<ForcedRankRegion>)
            : [];
          return {
            forcedRushed: rushed,
            forcedDueling: dueling,
            forcedSpotStruggle: spotStruggle,
            forcedRank
          };
        };

        return {
          uma1: state.uma1 ? migrateRunner(state.uma1) : emptyOverrides(),
          uma2: state.uma2 ? migrateRunner(state.uma2) : emptyOverrides()
        };
      }
    }
  )
);

// --- Single-region actions (rushed, dueling, spot struggle) ---

export const setForcedRushed = (runnerId: CompareRunnerId, region: ForcedRegion | null) => {
  useScenarioOverridesStore.setState((prev) => ({
    [runnerId]: { ...prev[runnerId], forcedRushed: region }
  }));
};

export const setForcedDueling = (runnerId: CompareRunnerId, region: ForcedRegion | null) => {
  useScenarioOverridesStore.setState((prev) => ({
    [runnerId]: { ...prev[runnerId], forcedDueling: region }
  }));
};

export const setForcedSpotStruggle = (runnerId: CompareRunnerId, region: ForcedRegion | null) => {
  useScenarioOverridesStore.setState((prev) => ({
    [runnerId]: { ...prev[runnerId], forcedSpotStruggle: region }
  }));
};

// --- Non-overlap helper ---

function clampNonOverlapping(regions: Array<ForcedRankRegion>): Array<ForcedRankRegion> {
  if (regions.length <= 1) return regions;

  const sorted = regions.map((r, i) => ({ ...r, _idx: i })).sort((a, b) => a.start - b.start);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      sorted[i] = { ...sorted[i], start: sorted[i - 1].end };
      if (sorted[i].start >= sorted[i].end) {
        sorted[i] = { ...sorted[i], end: sorted[i].start + 10 };
      }
    }
  }

  const result: ForcedRankRegion[] = Array.from({ length: regions.length });
  for (const { _idx, ...region } of sorted) {
    result[_idx] = region;
  }
  return result;
}

// --- Multi-region actions (forced rank) ---

const addForcedRank = (runnerId: CompareRunnerId, region: ForcedRankRegion) => {
  useScenarioOverridesStore.setState((prev) => {
    const next = [...prev[runnerId].forcedRank, region];
    return {
      [runnerId]: {
        ...prev[runnerId],
        forcedRank: clampNonOverlapping(next)
      }
    };
  });
};

const removeForcedRank = (runnerId: CompareRunnerId, index: number) => {
  useScenarioOverridesStore.setState((prev) => ({
    [runnerId]: {
      ...prev[runnerId],
      forcedRank: prev[runnerId].forcedRank.filter((_, i) => i !== index)
    }
  }));
};

export const updateForcedRank = (
  runnerId: CompareRunnerId,
  index: number,
  region: ForcedRankRegion
) => {
  useScenarioOverridesStore.setState((prev) => {
    const next = prev[runnerId].forcedRank.map((r, i) => (i === index ? region : r));
    return {
      [runnerId]: {
        ...prev[runnerId],
        forcedRank: clampNonOverlapping(next)
      }
    };
  });
};

export const clearAllScenarioOverrides = () => {
  useScenarioOverridesStore.setState({
    uma1: emptyOverrides(),
    uma2: emptyOverrides()
  });
};

export const useScenarioOverrides = () => {
  return useScenarioOverridesStore(
    useShallow((state) => ({
      uma1: state.uma1,
      uma2: state.uma2
    }))
  );
};

export const hasAnyScenarioOverrides = (overrides: RunnerScenarioOverrides): boolean => {
  return (
    overrides.forcedRushed !== null ||
    overrides.forcedDueling !== null ||
    overrides.forcedSpotStruggle !== null ||
    overrides.forcedRank.length > 0
  );
};
