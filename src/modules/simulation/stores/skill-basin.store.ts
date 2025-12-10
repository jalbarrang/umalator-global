import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  PoolMetrics,
  RoundResult,
  SkillBasinResponse,
} from '@simulation/types';
import { useShallow } from 'zustand/shallow';
import { useMemo, useState } from 'react';
import {
  RegionActivation,
  SimulationData,
  SimulationRun,
  initializeSimulationRun,
} from '../compare.types';
import { useRaceStore } from './compare.store';

type ISkillBasinStore = {
  results: SkillBasinResponse;
  metrics: PoolMetrics | null;
};

export const useSkillBasinStore = create<ISkillBasinStore>()(
  immer((_) => ({
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

export const useSkillBasinResults = () => {
  return useSkillBasinStore(useShallow((state) => state.results));
};

export const useChartData = () => {
  const results = useSkillBasinResults();
  const displaying = useRaceStore(
    useShallow((state) => state.displaying as keyof SimulationData),
  );

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const relevantResults = useMemo(() => {
    const relevant: Map<string, RoundResult> = new Map();

    for (const skill of selectedSkills) {
      const result = results.get(skill);

      if (result) {
        relevant.set(skill, result);
      }
    }

    return relevant;
  }, [results, selectedSkills]);

  const chartData: SimulationRun = useMemo(() => {
    const chartData: SimulationRun = initializeSimulationRun();
    const mergedMap = new Map<string, RegionActivation[]>();

    // Directly merge into one Map without recreation
    for (const [skill, skillResults] of relevantResults.entries()) {
      if (!skillResults?.runData) continue;
      const selectedData = skillResults.runData[displaying];
      if (!selectedData) continue;
      // Index 1 is uma that used the new skill for sim
      const skillActivations = selectedData.sk[1];
      if (!skillActivations) continue;
      const regions: RegionActivation[] = skillActivations.get(skill) ?? [];
      mergedMap.set(skill, regions);
    }

    chartData.sk[0] = mergedMap;

    return chartData;
  }, [relevantResults, displaying]);

  return { chartData, selectedSkills, setSelectedSkills };
};
