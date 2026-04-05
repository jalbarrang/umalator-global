import { useEffect, useRef, useState } from 'react';
import OcrWorker from '@workers/ocr.worker.ts?worker';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface UseOcrImportResult {
  files: Array<UploadedFile>;
  addFiles: (files: Array<File>, autoProcess?: boolean) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  results: Partial<ExtractedUmaData> | null;
  updateResults: (updates: Partial<ExtractedUmaData>) => void;
  removeSkill: (skillId: string) => void;
  isProcessing: boolean;
  progress: number;
  currentImageIndex: number;
  error: string | null;
  processFiles: () => void;
  reset: () => void;
}

const createOcrWorker = () => new OcrWorker();

function revokeFilePreviews(files: Array<UploadedFile>) {
  for (const file of files) {
    URL.revokeObjectURL(file.preview);
  }
}

export function useOcrImport(): UseOcrImportResult {
  const [files, setFiles] = useState<Array<UploadedFile>>([]);
  const [results, setResults] = useState<Partial<ExtractedUmaData> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const filesRef = useRef<Array<UploadedFile>>([]);
  const resultsRef = useRef<Partial<ExtractedUmaData> | null>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const generateId = () => Math.random().toString(36).slice(2, 11);

  const terminateWorker = () => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.terminate();
    workerRef.current = null;
  };

  const startProcessing = (
    images: Array<Blob | File>,
    options?: {
      trackedFileIds?: Array<string>;
      clearResults?: boolean;
    },
  ): Promise<Partial<ExtractedUmaData> | null> => {
    if (images.length === 0 || isProcessing || workerRef.current) {
      return Promise.resolve(resultsRef.current);
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentImageIndex(-1);
    setError(null);

    if (options?.clearResults) {
      setResults(null);
    }

    if (options?.trackedFileIds) {
      const trackedIdSet = new Set(options.trackedFileIds);
      setFiles((previousFiles) =>
        previousFiles.map((file) =>
          trackedIdSet.has(file.id)
            ? { ...file, status: 'pending' as const, error: undefined }
            : file,
        ),
      );
    }

    const worker = createOcrWorker();
    workerRef.current = worker;

    return new Promise((resolve, reject) => {
      let latestResult: Partial<ExtractedUmaData> | null = null;

      worker.onmessage = (event) => {
        const { type, imageIndex, data, error: errorMessage, percent } = event.data;

        switch (type) {
          case 'progress':
            setProgress(percent);
            break;

          case 'image-start': {
            setCurrentImageIndex(imageIndex);

            const trackedFileId = options?.trackedFileIds?.[imageIndex];
            if (trackedFileId) {
              setFiles((previousFiles) =>
                previousFiles.map((file) =>
                  file.id === trackedFileId ? { ...file, status: 'processing' as const } : file,
                ),
              );
            }
            break;
          }

          case 'image-complete': {
            latestResult = data;
            setResults(data);

            const trackedFileId = options?.trackedFileIds?.[imageIndex];
            if (trackedFileId) {
              setFiles((previousFiles) =>
                previousFiles.map((file) =>
                  file.id === trackedFileId ? { ...file, status: 'complete' as const } : file,
                ),
              );
            }
            break;
          }

          case 'image-error': {
            const trackedFileId = options?.trackedFileIds?.[imageIndex];
            if (trackedFileId) {
              setFiles((previousFiles) =>
                previousFiles.map((file) =>
                  file.id === trackedFileId
                    ? { ...file, status: 'error' as const, error: errorMessage }
                    : file,
                ),
              );
            }

            setError(errorMessage ?? 'OCR processing failed for image');
            break;
          }

          case 'complete': {
            const finalData = (data as Partial<ExtractedUmaData> | undefined) ?? latestResult ?? null;
            setResults(finalData);
            setIsProcessing(false);
            setProgress(100);
            terminateWorker();
            resolve(finalData);
            break;
          }

          case 'log':
            console.log(data);
            break;
        }
      };

      worker.onerror = (event: ErrorEvent) => {
        const errorMessage = event.message
          ? `${event.message} (${event.filename}) at ${event.lineno}:${event.colno}`
          : 'OCR processing failed';

        setError(errorMessage);
        setIsProcessing(false);
        terminateWorker();
        reject(new Error(errorMessage));
      };

      worker.postMessage({ type: 'extract', images });
    });
  };

  const addFiles = (newFiles: Array<File>, autoProcess = true) => {
    const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const uploadedFiles: Array<UploadedFile> = imageFiles.map((file) => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setFiles((previousFiles) => [...previousFiles, ...uploadedFiles]);

    if (!autoProcess || isProcessing) {
      return;
    }

    void startProcessing(
      uploadedFiles.map((file) => file.file),
      {
        trackedFileIds: uploadedFiles.map((file) => file.id),
        clearResults: true,
      },
    ).catch(() => undefined);
  };

  const removeFile = (id: string) => {
    setFiles((previousFiles) => {
      const file = previousFiles.find((entry) => entry.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }

      return previousFiles.filter((entry) => entry.id !== id);
    });
  };

  const clearFiles = () => {
    revokeFilePreviews(filesRef.current);
    setFiles([]);
    setResults(null);
    setError(null);
  };

  const processFiles = () => {
    if (filesRef.current.length === 0) {
      return;
    }

    const pendingFiles = filesRef.current.map((file) => ({
      ...file,
      status: 'pending' as const,
      error: undefined,
    }));

    setFiles(pendingFiles);

    void startProcessing(
      pendingFiles.map((file) => file.file),
      {
        trackedFileIds: pendingFiles.map((file) => file.id),
        clearResults: true,
      },
    ).catch(() => undefined);
  };

  const updateResults = (updates: Partial<ExtractedUmaData>) => {
    setResults((previousResults) => (previousResults ? { ...previousResults, ...updates } : updates));
  };

  const removeSkill = (skillId: string) => {
    setResults((previousResults) => {
      if (!previousResults || !previousResults.skills) {
        return previousResults;
      }

      return {
        ...previousResults,
        skills: previousResults.skills.filter((skill) => skill.id !== skillId),
      };
    });
  };

  const reset = () => {
    terminateWorker();

    revokeFilePreviews(filesRef.current);

    setFiles([]);
    setResults(null);
    setIsProcessing(false);
    setProgress(0);
    setCurrentImageIndex(-1);
    setError(null);
  };

  useEffect(() => {
    return () => {
      terminateWorker();
      revokeFilePreviews(filesRef.current);
    };
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    results,
    updateResults,
    removeSkill,
    isProcessing,
    progress,
    currentImageIndex,
    error,
    processFiles,
    reset,
  };
}
