import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type IOcrStore = {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
};

export const useOcrStore = create<IOcrStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
    }),
    {
      name: 'umalator-ocr-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ geminiApiKey: state.geminiApiKey }),
    },
  ),
);

export const useGeminiApiKey = () => useOcrStore((state) => state.geminiApiKey);

export const setGeminiApiKey = (key: string) => {
  useOcrStore.getState().setGeminiApiKey(key);
};
