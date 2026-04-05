import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OcrImportMode } from '@/modules/runners/components/ocr/types';

type IOcrStore = {
  mode: OcrImportMode;
};

export const useOcrStore = create<IOcrStore>()(
  persist(
    (_) => ({
      mode: 'wizard',
    }),
    {
      name: 'umalator-ocr-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useOcrMode = () => useOcrStore((state) => state.mode);

export const setOcrMode = (mode: OcrImportMode) => {
  useOcrStore.setState({ mode });
};
