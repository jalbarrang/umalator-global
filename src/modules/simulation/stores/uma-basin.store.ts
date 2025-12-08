import { create } from 'zustand';
import { SkillBasinResponse } from '@simulation/types';

type IUmaBassinStore = {
  results: SkillBasinResponse;
  timeTaken: number;
};

export const useUniqueSkillBasinStore = create<IUmaBassinStore>()((_) => ({
  results: {},
  timeTaken: 0,
}));

export const setTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState({ results });
};

export const resetTable = () => {
  useUniqueSkillBasinStore.setState({ results: {} });
};

export const appendResultsToTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState((prev) => {
    return {
      ...prev,
      results: { ...prev.results, ...results },
    };
  });
};
