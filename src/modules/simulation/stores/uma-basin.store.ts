import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { PoolMetrics, SkillBasinResponse } from '@simulation/types';

type IUmaBasinStore = {
  results: SkillBasinResponse;
  metrics: PoolMetrics | null;
};

export const useUniqueSkillBasinStore = create<IUmaBasinStore>()(
  immer((_) => ({
    results: new Map(),
    metrics: null,
  })),
);

export const setTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState((draft) => {
    draft.results = results;
  });
};

export const resetTable = () => {
  useUniqueSkillBasinStore.setState((draft) => {
    draft.results = new Map();
    draft.metrics = null;
  });
};

export const appendResultsToTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState((draft) => {
    results.forEach((value, key) => {
      draft.results.set(key, value);
    });
  });
};

export const setMetrics = (metrics: PoolMetrics) => {
  useUniqueSkillBasinStore.setState((draft) => {
    draft.metrics = metrics;
  });
};
