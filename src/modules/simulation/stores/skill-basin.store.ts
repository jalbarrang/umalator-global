import { create } from 'zustand';
import { SkillBasinResponse } from '@simulation/types';

type ISkillBasinStore = {
  results: SkillBasinResponse;
  timeTaken: number;
};

export const useSkillBasinStore = create<ISkillBasinStore>()((_) => ({
  results: {},
  timeTaken: 0,
}));

export const setTable = (results: SkillBasinResponse) => {
  useSkillBasinStore.setState({ results });
};

export const resetTable = () => {
  useSkillBasinStore.setState({ results: {} });
};

export const appendResultsToTable = (results: SkillBasinResponse) => {
  useSkillBasinStore.setState((prev) => {
    return {
      ...prev,
      results: { ...prev.results, ...results },
    };
  });
};
