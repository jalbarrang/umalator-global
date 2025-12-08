import { create } from 'zustand';
import { SkillBasinResponse } from '@simulation/types';

type IUmaBassinStore = {
  results: SkillBasinResponse;
  timeTaken: number;
};

export const useUniqueSkillBasinStore = create<IUmaBassinStore>()((_) => ({
  results: new Map(),
  timeTaken: 0,
}));

export const setTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState({ results });
};

export const resetTable = () => {
  useUniqueSkillBasinStore.setState({ results: new Map() });
};

export const appendResultsToTable = (results: SkillBasinResponse) => {
  useUniqueSkillBasinStore.setState({ results });
};
