import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { useMemo, useState } from 'react';
import { cloneDeep } from 'es-toolkit';
import { initializeSimulationRun } from '../compare.types';
import { useRaceStore } from './compare.store';
import type {
  SimulationData,
  SimulationRun,
  SkillActivationMap,
  SkillEffectLog
} from '../compare.types';
import type {
  PoolMetrics,
  SkillComparisonResponse,
  SkillComparisonRoundResult
} from '@/modules/simulation/types';
import type { SimulationProgress } from '@/workers/pool/types';
import { generateSeed } from '@/utils/crypto';
import { mergeSkillResults } from '@/workers/utils';

type ISkillBasinStore = {
  seed: number | null;
  results: SkillComparisonResponse;
  metrics: PoolMetrics | null;
  progress: SimulationProgress | null;
  isSimulationRunning: boolean;
  skillLoadingStates: Record<string, boolean>;
};

export const useSkillBasinStore = create<ISkillBasinStore>()((_) => ({
  seed: null,
  results: {},
  metrics: null,
  progress: null,
  isSimulationRunning: false,
  skillLoadingStates: {}
}));

export const setSkillBassinSeed = (seed: number | null) => {
  useSkillBasinStore.setState({ seed });
};

export const createNewSkillBassinSeed = () => {
  const seed = generateSeed();
  useSkillBasinStore.setState({ seed });

  return seed;
};

export const setTable = (results: SkillComparisonResponse) => {
  useSkillBasinStore.setState({ results: results });
};

export const resetTable = () => {
  useSkillBasinStore.setState({ results: {}, metrics: null, progress: null });
};

export const appendSingleSkillResult = (skillId: string, result: SkillComparisonRoundResult) => {
  useSkillBasinStore.setState((state) => {
    const currentResults = cloneDeep(state.results);
    const skillResult = currentResults[skillId];
    if (!skillResult) {
      return {
        results: state.results
      };
    }
    currentResults[skillId] = mergeSkillResults(skillResult, result);

    return {
      results: currentResults
    };
  });
};

export const appendResultsToTable = (results: SkillComparisonResponse) => {
  useSkillBasinStore.setState((state) => {
    return {
      results: {
        ...state.results,
        ...results
      }
    };
  });
};

export const setMetrics = (metrics: PoolMetrics) => {
  useSkillBasinStore.setState({ metrics });
};

export const setSkillBassinProgress = (progress: SimulationProgress | null) => {
  useSkillBasinStore.setState({ progress });
};

export const setIsSimulationRunning = (isSimulationRunning: boolean) => {
  useSkillBasinStore.setState({ isSimulationRunning });
};

export const setSkillLoading = (skillId: string, isLoading: boolean) => {
  useSkillBasinStore.setState((state) => ({
    skillLoadingStates: {
      ...state.skillLoadingStates,
      [skillId]: isLoading
    }
  }));
};

const useSkillBasinResults = () => {
  return useSkillBasinStore(useShallow((state) => state.results));
};

export const useChartData = () => {
  const results = useSkillBasinResults();
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
      const activations: Array<SkillEffectLog> = skillActivations[skill] ?? [];
      mergedMap[skill] = activations;
    }

    chartData.skillActivations[0] = mergedMap;

    return chartData;
  }, [relevantResults, displaying]);

  return { chartData, selectedSkills, setSelectedSkills };
};
