import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { cloneDeep } from 'es-toolkit';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';

export type SavedRunner = RunnerState & {
  id: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

type RunnerLibraryStore = {
  runners: Array<SavedRunner>;
  addRunner: (runner: Omit<SavedRunner, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateRunner: (id: string, updates: Partial<SavedRunner>) => void;
  deleteRunner: (id: string) => void;
  getRunner: (id: string) => SavedRunner | undefined;
  duplicateRunner: (id: string) => void;
};

// Generate a simple UUID-like ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useRunnerLibraryStore = create<RunnerLibraryStore>()(
  persist(
    (set, get) => ({
      runners: [],

      addRunner: (runner) => {
        const id = generateId();
        const now = Date.now();
        const newRunner: SavedRunner = {
          ...runner,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          runners: [...state.runners, newRunner],
        }));

        toast.success(`Runner "${runner.notes}" added to library`);
        return id;
      },

      updateRunner: (id, updates) => {
        set((state) => ({
          runners: state.runners.map((runner) =>
            runner.id === id ? { ...runner, ...updates, updatedAt: Date.now() } : runner,
          ),
        }));

        toast.success('Runner updated');
      },

      deleteRunner: (id) => {
        const runner = get().getRunner(id);

        set((state) => ({
          runners: state.runners.filter((r) => r.id !== id),
        }));

        toast.success(`Runner "${runner?.notes || 'Unknown'}" deleted`);
      },

      getRunner: (id) => {
        return get().runners.find((r) => r.id === id);
      },

      duplicateRunner: (id) => {
        const runner = get().getRunner(id);
        if (!runner) {
          toast.error('Runner not found');
          return;
        }

        const duplicated = cloneDeep(runner);

        get().addRunner(duplicated);
      },
    }),
    {
      name: 'umalator-runner-library',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
