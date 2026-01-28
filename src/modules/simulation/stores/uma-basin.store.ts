import { create } from 'zustand';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { toMerged } from 'es-toolkit';
import { initializeSimulationRun } from '../compare.types';
import { useRaceStore } from './compare.store';
import type {
  SimulationData,
  SimulationRun,
  SkillActivation,
  SkillActivationMap,
} from '../compare.types';
import type {
  PoolMetrics,
  SkillComparisonResponse,
  SkillComparisonRoundResult,
} from '@/modules/simulation/types';

type IUmaBasinStore = {
  results: SkillComparisonResponse;
  metrics: PoolMetrics | null;
  isSimulationRunning: boolean;
};

export const useUniqueSkillBasinStore = create<IUmaBasinStore>()((_) => ({
  results: {},
  metrics: null,
  isSimulationRunning: false,
}));

export const setTable = (results: SkillComparisonResponse) => {
  useUniqueSkillBasinStore.setState({ results });
};

export const resetTable = () => {
  useUniqueSkillBasinStore.setState({ results: {}, metrics: null });
};

export const appendResultsToTable = (results: SkillComparisonResponse) => {
  useUniqueSkillBasinStore.setState((state) => ({
    results: toMerged(state.results, results),
  }));
};

export const setMetrics = (metrics: PoolMetrics) => {
  useUniqueSkillBasinStore.setState({ metrics });
};

export const setIsSimulationRunning = (isSimulationRunning: boolean) => {
  useUniqueSkillBasinStore.setState({ isSimulationRunning });
};

export const useUmaBasinResults = () => {
  return useUniqueSkillBasinStore(useShallow((state) => state.results));
};

export const useChartData = () => {
  const results = useUmaBasinResults();
  const displaying = useRaceStore(useShallow((state) => state.displaying as keyof SimulationData));

  const [selectedSkills, setSelectedSkills] = useState<Array<string>>([]);

  const relevantResults = useMemo(() => {
    const relevant: Record<string, SkillComparisonRoundResult> = {};

    for (const skill of selectedSkills) {
      const result = results[skill];

      if (result) {
        relevant[skill] = result;
      }
    }

    return relevant;
  }, [results, selectedSkills]);

  const chartData: SimulationRun = useMemo(() => {
    const chartData: SimulationRun = initializeSimulationRun();
    const mergedMap: SkillActivationMap = {};

    // Directly merge into one Map without recreation
    for (const [skill, skillResults] of Object.entries(relevantResults)) {
      if (!skillResults?.runData) continue;
      const selectedData = skillResults.runData[displaying];
      if (!selectedData) continue;
      // Index 1 is uma that used the new skill for sim
      const skillActivations = selectedData.sk[1];
      if (!skillActivations) continue;
      const activations: Array<SkillActivation> = skillActivations[skill] ?? [];
      mergedMap[skill] = activations;
    }

    chartData.sk[0] = mergedMap;

    return chartData;
  }, [relevantResults, displaying]);

  return { chartData, selectedSkills, setSelectedSkills };
};
