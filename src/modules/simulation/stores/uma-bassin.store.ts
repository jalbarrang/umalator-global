import { create } from 'zustand';
import { RoundResult } from '../types';

type IUmaBassinStore = {
  results: Record<string, RoundResult>;
};

export const useUmaBassinStore = create<IUmaBassinStore>()((_) => ({
  results: {},
}));

export const updateTable = (results: Record<string, RoundResult>) => {
  useUmaBassinStore.setState((prev) => ({ ...prev, results }));
};

export const resetTable = () => {
  useUmaBassinStore.setState({ results: {} });
};
