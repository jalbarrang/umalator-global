import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { PoolMetrics, SkillBasinResponse } from '@simulation/types';

type ISkillBasinStore = {
  results: SkillBasinResponse;
  metrics: PoolMetrics | null;
};

export const useSkillBasinStore = create<ISkillBasinStore>()(
  immer(() => ({
    results: new Map(),
    metrics: null,
  })),
);

export const setTable = (results: SkillBasinResponse) => {
  useSkillBasinStore.setState((draft) => {
    draft.results = results;
  });
};

export const resetTable = () => {
  useSkillBasinStore.setState((draft) => {
    draft.results = new Map();
    draft.metrics = null;
  });
};

export const appendResultsToTable = (results: SkillBasinResponse) => {
  useSkillBasinStore.setState((draft) => {
    results.forEach((value, key) => {
      draft.results.set(key, value);
    });
  });
};

export const setMetrics = (metrics: PoolMetrics) => {
  useSkillBasinStore.setState((draft) => {
    draft.metrics = metrics;
  });
};
