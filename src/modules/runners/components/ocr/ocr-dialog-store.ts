import type { RefObject } from 'react';
import { createStore } from 'zustand/vanilla';
import type { OcrMaskType, PreparedImage, WizardStep } from '@/modules/runners/components/ocr/types';
import type { ExtractedSkill, ExtractedUmaData } from '@/modules/runners/ocr/types';

export type OcrDialogWorkerResponse =
  | { type: 'progress'; percent: number }
  | { type: 'image-start'; imageIndex: number; total: number }
  | { type: 'image-complete'; imageIndex: number; data: Partial<ExtractedUmaData> }
  | { type: 'image-error'; imageIndex: number; error?: string }
  | { type: 'complete'; data?: Partial<ExtractedUmaData> }
  | { type: 'log'; data: unknown };

type ProcessingResolver = (data: Partial<ExtractedUmaData> | null) => void;
type ProcessingRejecter = (error: Error) => void;

export interface OcrDialogStore {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  results: Partial<ExtractedUmaData> | null;
  step: WizardStep;
  preparedImages: Array<PreparedImage>;
  showSkillsEditor: boolean;

  _workerRef: RefObject<Worker | null>;
  _resolveProcessing: ProcessingResolver | null;
  _rejectProcessing: ProcessingRejecter | null;
  _pendingMaskType: OcrMaskType | null;
  _pendingBaseData: Partial<ExtractedUmaData> | null;
  _latestWorkerResult: Partial<ExtractedUmaData> | null;

  processComposited: (
    blob: Blob,
    maskType: OcrMaskType,
    existingData?: Partial<ExtractedUmaData>,
  ) => Promise<Partial<ExtractedUmaData> | null>;
  updateResults: (updates: Partial<ExtractedUmaData>) => void;
  removeSkill: (skillId: string) => void;
  reset: () => void;
  setStep: (step: WizardStep) => void;
  setShowSkillsEditor: (show: boolean) => void;
  addPreparedImage: (image: PreparedImage) => void;
  clearPreparedImages: () => void;
  handleWorkerMessage: (message: OcrDialogWorkerResponse) => void;
  handleWorkerError: (errorMessage: string) => void;
  cleanup: () => void;
}

const INITIAL_STEP: WizardStep = 'align';

const EMPTY_PENDING_PROCESSING_STATE = {
  _resolveProcessing: null,
  _rejectProcessing: null,
  _pendingMaskType: null,
  _pendingBaseData: null,
  _latestWorkerResult: null,
} as const;

function dedupeSkills(skills: Array<ExtractedSkill>): Array<ExtractedSkill> {
  const byId = new Map<string, ExtractedSkill>();

  for (const skill of skills) {
    if (!byId.has(skill.id)) {
      byId.set(skill.id, skill);
    }
  }

  return [...byId.values()];
}

function dedupeStrings(lines: Array<string>): Array<string> {
  return [...new Set(lines)];
}

function mergeExtractedResults(
  baseData: Partial<ExtractedUmaData> | null,
  nextData: Partial<ExtractedUmaData> | null,
  maskType: OcrMaskType,
): Partial<ExtractedUmaData> | null {
  if (!nextData) {
    return baseData;
  }

  if (!baseData) {
    return nextData;
  }

  const mergedSkills = dedupeSkills([...(baseData.skills ?? []), ...(nextData.skills ?? [])]);
  const mergedUnrecognized = dedupeStrings([
    ...(baseData.unrecognized ?? []),
    ...(nextData.unrecognized ?? []),
  ]);

  if (maskType === 'skills-only') {
    return {
      ...nextData,
      ...baseData,
      skills: mergedSkills,
      unrecognized: mergedUnrecognized,
      imageCount: (baseData.imageCount ?? 0) + (nextData.imageCount ?? 1),
      umaConfidence: baseData.umaConfidence ?? nextData.umaConfidence ?? 0,
    };
  }

  return {
    ...baseData,
    ...nextData,
    skills: mergedSkills,
    unrecognized: mergedUnrecognized,
    imageCount: Math.max(baseData.imageCount ?? 0, nextData.imageCount ?? 0),
    umaConfidence: nextData.umaConfidence ?? baseData.umaConfidence ?? 0,
  };
}

function revokePreparedPreviews(images: Array<PreparedImage>) {
  for (const image of images) {
    URL.revokeObjectURL(image.preview);
  }
}

export function createOcrDialogStore(workerRef: RefObject<Worker | null>) {
  return createStore<OcrDialogStore>()((set, get) => {
    const resolvePending = (value: Partial<ExtractedUmaData> | null) => {
      const resolver = get()._resolveProcessing;
      set(EMPTY_PENDING_PROCESSING_STATE);
      resolver?.(value);
    };

    const rejectPending = (error: Error) => {
      const rejecter = get()._rejectProcessing;
      set(EMPTY_PENDING_PROCESSING_STATE);
      rejecter?.(error);
    };

    const resetState = () => {
      revokePreparedPreviews(get().preparedImages);
      resolvePending(null);

      set({
        isProcessing: false,
        progress: 0,
        error: null,
        results: null,
        step: INITIAL_STEP,
        preparedImages: [],
        showSkillsEditor: false,
      });
    };

    return {
      isProcessing: false,
      progress: 0,
      error: null,
      results: null,
      step: INITIAL_STEP,
      preparedImages: [],
      showSkillsEditor: false,

      _workerRef: workerRef,
      ...EMPTY_PENDING_PROCESSING_STATE,

      processComposited: (blob, maskType, existingData) => {
        const state = get();

        if (state.isProcessing) {
          return Promise.resolve(state.results);
        }

        const worker = state._workerRef.current;
        if (!worker) {
          const errorMessage = 'OCR worker is not ready';
          set({ error: errorMessage });
          return Promise.reject(new Error(errorMessage));
        }

        const baseData = existingData ?? state.results;

        set({
          isProcessing: true,
          progress: 0,
          error: null,
          _pendingMaskType: maskType,
          _pendingBaseData: baseData,
          _latestWorkerResult: null,
          _resolveProcessing: null,
          _rejectProcessing: null,
        });

        return new Promise<Partial<ExtractedUmaData> | null>((resolve, reject) => {
          set({
            _resolveProcessing: resolve,
            _rejectProcessing: reject,
          });

          try {
            worker.postMessage({ type: 'extract', images: [blob] });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to start OCR processing';

            set({
              isProcessing: false,
              error: errorMessage,
              ...EMPTY_PENDING_PROCESSING_STATE,
            });

            reject(new Error(errorMessage));
          }
        });
      },

      updateResults: (updates) => {
        set((state) => ({
          results: state.results ? { ...state.results, ...updates } : updates,
        }));
      },

      removeSkill: (skillId) => {
        const { results } = get();
        if (!results?.skills) {
          return;
        }

        set({
          results: {
            ...results,
            skills: results.skills.filter((skill) => skill.id !== skillId),
          },
        });
      },

      reset: () => {
        resetState();
      },

      setStep: (step) => {
        set({ step });
      },

      setShowSkillsEditor: (showSkillsEditor) => {
        set({ showSkillsEditor });
      },

      addPreparedImage: (image) => {
        set((state) => ({ preparedImages: [...state.preparedImages, image] }));
      },

      clearPreparedImages: () => {
        revokePreparedPreviews(get().preparedImages);
        set({ preparedImages: [] });
      },

      handleWorkerMessage: (message) => {
        const hasPendingProcessing = Boolean(get()._resolveProcessing);

        if (!hasPendingProcessing && message.type !== 'log') {
          return;
        }

        switch (message.type) {
          case 'progress':
            set({ progress: message.percent });
            break;

          case 'image-start':
            break;

          case 'image-complete':
            set({ _latestWorkerResult: message.data });
            break;

          case 'image-error': {
            const errorMessage = message.error ?? 'OCR processing failed for image';
            rejectPending(new Error(errorMessage));

            set({
              error: errorMessage,
              isProcessing: false,
            });
            break;
          }

          case 'complete': {
            const state = get();
            // If already rejected by image-error, ignore the complete message
            if (!state._resolveProcessing) {
              break;
            }

            const nextData = message.data ?? state._latestWorkerResult ?? null;
            const mergedData = state._pendingMaskType
              ? mergeExtractedResults(state._pendingBaseData, nextData, state._pendingMaskType)
              : nextData;

            set({
              results: mergedData,
              isProcessing: false,
              progress: 100,
              ...EMPTY_PENDING_PROCESSING_STATE,
            });

            state._resolveProcessing?.(mergedData);
            break;
          }

          case 'log':
            console.log(message.data);
            break;
        }
      },

      handleWorkerError: (errorMessage) => {
        rejectPending(new Error(errorMessage));

        set({
          isProcessing: false,
          error: errorMessage,
          ...EMPTY_PENDING_PROCESSING_STATE,
        });
      },

      cleanup: () => {
        resetState();
      },
    };
  });
}

export type OcrDialogStoreApi = ReturnType<typeof createOcrDialogStore>;
