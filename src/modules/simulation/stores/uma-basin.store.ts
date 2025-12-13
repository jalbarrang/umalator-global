import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  PoolMetrics,
  RoundResult,
  SkillBasinResponse,
} from '@simulation/types';
import { useMemo, useState } from 'react';
import {
  initializeSimulationRun,
  SimulationData,
  SimulationRun,
  SkillActivation,
} from '../compare.types';
import { useShallow } from 'zustand/shallow';
import { useRaceStore } from './compare.store';

type IUmaBasinStore = {
  results: SkillBasinResponse;
  metrics: PoolMetrics | null;
  isSimulationRunning: boolean;
};

export const useUniqueSkillBasinStore = create<IUmaBasinStore>()(
  immer((_) => ({
    results: new Map(),
    metrics: null,
    isSimulationRunning: false,
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

export const setIsSimulationRunning = (isSimulationRunning: boolean) => {
  useUniqueSkillBasinStore.setState((draft) => {
    draft.isSimulationRunning = isSimulationRunning;
  });
};

export const useUmaBasinResults = () => {
  return useUniqueSkillBasinStore(useShallow((state) => state.results));
};

export const useChartData = () => {
  const results = useUmaBasinResults();
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
    const mergedMap = new Map<string, SkillActivation[]>();

    // Directly merge into one Map without recreation
    for (const [skill, skillResults] of relevantResults.entries()) {
      if (!skillResults?.runData) continue;
      const selectedData = skillResults.runData[displaying];
      if (!selectedData) continue;
      // Index 1 is uma that used the new skill for sim
      const skillActivations = selectedData.sk[1];
      if (!skillActivations) continue;
      const activations: SkillActivation[] = skillActivations.get(skill) ?? [];
      mergedMap.set(skill, activations);
    }

    chartData.sk[0] = mergedMap;

    return chartData;
  }, [relevantResults, displaying]);

  return { chartData, selectedSkills, setSelectedSkills };
};
