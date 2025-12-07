/**
 * Hook for managing OCR import process
 *
 * Note: Following React best practices from https://react.dev/learn/you-might-not-need-an-effect
 * - Processing is triggered directly in addFiles (event handler), not via Effect
 * - Only uses Effect for cleanup of external resources (worker)
 * - No useCallback needed - React Compiler handles memoization automatically
 */

import { useState, useRef, useEffect } from 'react';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface UseOcrImportResult {
  files: UploadedFile[];
  addFiles: (files: File[], autoProcess?: boolean) => void;
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

const fileToBlob = (file: Blob) => {
  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Blob([reader.result as ArrayBuffer]));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

export function useOcrImport(): UseOcrImportResult {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<Partial<ExtractedUmaData> | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Generate unique ID for files
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Internal function to start OCR processing on specific files
  const startProcessing = (filesToProcess: UploadedFile[]) => {
    if (filesToProcess.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setCurrentImageIndex(0);
    setError(null);
    setResults(null);

    // Create worker
    const worker = new Worker(
      new URL('@/workers/ocr.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    );

    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, imageIndex, data, error: errMsg, percent } = e.data;

      switch (type) {
        case 'progress':
          setProgress(percent);
          break;

        case 'image-start':
          setCurrentImageIndex(imageIndex);
          setFiles((prev) =>
            prev.map((f, i) =>
              i === imageIndex ? { ...f, status: 'processing' as const } : f,
            ),
          );
          break;

        case 'image-complete':
          setFiles((prev) =>
            prev.map((f, i) =>
              i === imageIndex ? { ...f, status: 'complete' as const } : f,
            ),
          );
          setResults(data);
          break;

        case 'image-error':
          setFiles((prev) =>
            prev.map((f, i) =>
              i === imageIndex
                ? { ...f, status: 'error' as const, error: errMsg }
                : f,
            ),
          );
          break;

        case 'complete':
          setResults(data);
          setIsProcessing(false);
          setProgress(100);
          worker.terminate();
          workerRef.current = null;
          break;

        case 'log':
          console.log(data);
          break;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      setError(
        e.message
          ? `${e.message} (${e.filename}) at ${e.lineno}:${e.colno}`
          : 'OCR processing failed',
      );

      setIsProcessing(false);

      worker.terminate();
      workerRef.current = null;
    };

    // Send files to worker
    Promise.all(filesToProcess.map((f) => fileToBlob(f.file))).then((blobs) => {
      worker.postMessage({ type: 'extract', images: blobs });
    });
  };

  // Add files to the list (and optionally auto-process)
  // This follows React best practices: trigger processing in event handler, not via Effect
  const addFiles = (newFiles: File[], autoProcess = true) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const uploadedFiles: UploadedFile[] = imageFiles.map((file) => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Trigger processing directly in event handler (not via Effect)
    if (autoProcess && !isProcessing) {
      startProcessing(uploadedFiles);
    }
  };

  // Remove a file from the list
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Clear all files
  const clearFiles = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResults(null);
    setError(null);
  };

  // Process all current files (for manual trigger/re-process)
  const processFiles = () => {
    if (files.length === 0) return;

    // Mark all files as pending before processing
    const pendingFiles = files.map((f) => ({
      ...f,
      status: 'pending' as const,
    }));
    setFiles(pendingFiles);
    startProcessing(pendingFiles);
  };

  // Update results (for manual modifications like selecting uma)
  const updateResults = (updates: Partial<ExtractedUmaData>) => {
    setResults((prev) => (prev ? { ...prev, ...updates } : updates));
  };

  // Remove a skill from results
  const removeSkill = (skillId: string) => {
    setResults((prev) => {
      if (!prev || !prev.skills) return prev;
      return {
        ...prev,
        skills: prev.skills.filter((s) => s.id !== skillId),
      };
    });
  };

  // Reset the entire state
  const reset = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResults(null);
    setIsProcessing(false);
    setProgress(0);
    setCurrentImageIndex(-1);
    setError(null);
  };

  // Cleanup worker on unmount (valid Effect - synchronizing with external system)
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
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
