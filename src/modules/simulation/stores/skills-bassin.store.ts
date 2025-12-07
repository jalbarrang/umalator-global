import { create } from 'zustand';
import { RoundResult } from '../types';

type ISkillBassinStore = {
  results: Record<string, RoundResult>;
};

export const useSkillBassinStore = create<ISkillBassinStore>()((_) => ({
  results: {},
}));

export const updateTable = (results: Record<string, RoundResult>) => {
  useSkillBassinStore.setState((prev) => ({ ...prev, results }));
};

export const resetTable = () => {
  useSkillBassinStore.setState({ results: {} });
};
