import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { OcrEngine } from '@/modules/runners/ocr/engine';
import { GeminiEngine } from '@/modules/runners/ocr/engines/gemini';
import {
  createOcrDialogStore,
  type IOcrDialogStore,
  type IOcrDialogStoreApi,
} from '@/modules/runners/components/ocr/ocr-dialog-store';
import { useGeminiApiKey } from '@/store/ocr.store';

const OcrDialogStoreContext = createContext<IOcrDialogStoreApi | null>(null);

interface OcrDialogProviderProps {
  children: React.ReactNode;
}

export function OcrDialogProvider({ children }: Readonly<OcrDialogProviderProps>) {
  const geminiApiKey = useGeminiApiKey();

  const normalizedKey = useMemo(() => {
    return geminiApiKey.trim();
  }, [geminiApiKey]);

  const engineRef = useRef<OcrEngine | null>(null);
  const [store] = useState(() => {
    return createOcrDialogStore(engineRef);
  });

  useEffect(() => {
    return () => {
      const { actions } = store.getState();
      actions.cleanup();
    };
  }, [store]);

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

      engine.destroy();
    };
  }, [normalizedKey]);

  return <OcrDialogStoreContext.Provider value={store}>{children}</OcrDialogStoreContext.Provider>;
}

export function useOcrDialogStore<T>(selector: (state: IOcrDialogStore) => T): T {
  const store = useContext(OcrDialogStoreContext);

  if (!store) {
    throw new Error('useOcrDialogStore must be used within OcrDialogProvider');
  }

  return useStore(store, selector);
}

export const useOcrResults = () => {
  return useOcrDialogStore((state) => state.results);
};

export const useOcrProcessing = () => {
  return useOcrDialogStore(
    useShallow((state) => ({
      isProcessing: state.isProcessing,
      progress: state.progress,
      error: state.error,
    })),
  );
};

export const useOcrActions = () => {
  return useOcrDialogStore(useShallow((state) => state.actions));
};

export const useOcrWizardState = () => {
  return useOcrDialogStore(
    useShallow((state) => ({
      step: state.step,
      preparedImages: state.preparedImages,
      showSkillsEditor: state.showSkillsEditor,
    })),
  );
};
