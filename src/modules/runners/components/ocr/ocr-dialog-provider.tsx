import { createContext, useContext, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { OcrEngine } from '@/modules/runners/ocr/engine';
import { GeminiEngine } from '@/modules/runners/ocr/engines/gemini';
import {
  createOcrDialogStore,
  type OcrDialogStore,
  type OcrDialogStoreApi,
} from '@/modules/runners/components/ocr/ocr-dialog-store';
import { useGeminiApiKey } from '@/store/ocr.store';

const OcrDialogStoreContext = createContext<OcrDialogStoreApi | null>(null);

interface OcrDialogProviderProps {
  children: React.ReactNode;
}

export function OcrDialogProvider({ children }: Readonly<OcrDialogProviderProps>) {
  const geminiApiKey = useGeminiApiKey();
  const normalizedKey = geminiApiKey.trim();

  const engineRef = useRef<OcrEngine | null>(null);
  const storeRef = useRef<OcrDialogStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createOcrDialogStore(engineRef);
  }

  const store = storeRef.current;

  useEffect(
    () => () => {
      store.getState().cleanup();
    },
    [store],
  );

  useEffect(() => {
    const previous = engineRef.current;
    engineRef.current = null;
    void previous?.destroy();

    if (normalizedKey.length === 0) {
      return;
    }

    const engine = new GeminiEngine(normalizedKey);
    engineRef.current = engine;

    return () => {
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
      void engine.destroy();
    };
  }, [normalizedKey]);

  return <OcrDialogStoreContext.Provider value={store}>{children}</OcrDialogStoreContext.Provider>;
}

export function useOcrDialogStore<T>(selector: (state: OcrDialogStore) => T): T {
  const store = useContext(OcrDialogStoreContext);

  if (!store) {
    throw new Error('useOcrDialogStore must be used within OcrDialogProvider');
  }

  return useStore(store, selector);
}

export const useOcrResults = () => useOcrDialogStore((state) => state.results);

export const useOcrProcessing = () =>
  useOcrDialogStore(
    useShallow((state) => ({
      isProcessing: state.isProcessing,
      progress: state.progress,
      error: state.error,
    })),
  );

export const useOcrActions = () =>
  useOcrDialogStore(
    useShallow((state) => ({
      processComposited: state.processComposited,
      updateResults: state.updateResults,
      removeSkill: state.removeSkill,
      reset: state.reset,
      setStep: state.setStep,
      setShowSkillsEditor: state.setShowSkillsEditor,
      addPreparedImage: state.addPreparedImage,
      clearPreparedImages: state.clearPreparedImages,
    })),
  );

export const useOcrWizardState = () =>
  useOcrDialogStore(
    useShallow((state) => ({
      step: state.step,
      preparedImages: state.preparedImages,
      showSkillsEditor: state.showSkillsEditor,
    })),
  );
