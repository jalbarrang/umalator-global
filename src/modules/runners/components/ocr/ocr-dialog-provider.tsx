import { createContext, useContext, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import OcrWorker from '@workers/ocr.worker.ts?worker';
import {
  createOcrDialogStore,
  type OcrDialogStore,
  type OcrDialogStoreApi,
  type OcrDialogWorkerResponse,
} from '@/modules/runners/components/ocr/ocr-dialog-store';

const OcrDialogStoreContext = createContext<OcrDialogStoreApi | null>(null);

interface OcrDialogProviderProps {
  children: React.ReactNode;
}

export function OcrDialogProvider({ children }: Readonly<OcrDialogProviderProps>) {
  const workerRef = useRef<Worker | null>(null);
  const storeRef = useRef<OcrDialogStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createOcrDialogStore(workerRef);
  }

  const store = storeRef.current;

  useEffect(() => {
    const worker = new OcrWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<OcrDialogWorkerResponse>) => {
      store.getState().handleWorkerMessage(event.data);
    };

    worker.onerror = (event: ErrorEvent) => {
      const errorMessage = event.message
        ? `${event.message} (${event.filename}) at ${event.lineno}:${event.colno}`
        : 'OCR processing failed';

      store.getState().handleWorkerError(errorMessage);
    };

    return () => {
      store.getState().cleanup();

      worker.terminate();
      workerRef.current = null;
    };
  }, [store]);

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
