/**
 * Web Worker for OCR processing using Tesseract.js
 */

import Tesseract from 'tesseract.js';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { parseOcrResult } from '@/modules/runners/ocr/parser';

let tesseractWorker: Tesseract.Worker | null = null;

// Initialize Tesseract worker
async function initWorker() {
  if (tesseractWorker) return tesseractWorker;

  tesseractWorker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        postMessage({
          type: 'progress',
          percent: Math.round(m.progress * 100),
        });
      }
    },
  });

  return tesseractWorker;
}

/**
 * Applies the following filters to an image:
 * - Grayscale
 * - Threshold (0.571)
 * @param imageData
 * @returns
 */
const applyImageFilters = async (imageData: Blob) => {
  const image = await createImageBitmap(imageData);

  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.filter = 'grayscale(1)';
  ctx.filter = 'threshold(0.571)';
  ctx.drawImage(image, 0, 0);

  return canvas.convertToBlob({ type: 'image/png' });
};

// Process a single image
async function processImage(
  imageData: Blob,
  imageIndex: number,
  existingData?: Partial<ExtractedUmaData>,
): Promise<ExtractedUmaData> {
  const worker = await initWorker();

  // Convert Blob/File to data URL for Tesseract
  const filteredImage = await applyImageFilters(imageData);
  const dataUrl = URL.createObjectURL(filteredImage);

  const {
    data: { text },
  } = await worker.recognize(dataUrl);

  return parseOcrResult(text, imageIndex, existingData);
}

// Process multiple images
async function processImages(images: Array<Blob | File>): Promise<void> {
  let accumulatedData: Partial<ExtractedUmaData> | undefined;

  for (let i = 0; i < images.length; i++) {
    postMessage({
      type: 'image-start',
      imageIndex: i,
      total: images.length,
    });

    try {
      accumulatedData = await processImage(images[i], i, accumulatedData);

      postMessage({
        type: 'image-complete',
        imageIndex: i,
        data: accumulatedData,
      });
    } catch (error) {
      postMessage({
        type: 'image-error',
        imageIndex: i,
        error:
          error instanceof Error
            ? `${error.message} (${error.name}) at ${error.stack}`
            : 'Unknown error',
      });
    }
  }

  postMessage({
    type: 'complete',
    data: accumulatedData,
  });
}

// Clean up worker
async function terminate() {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

// Handle messages from main thread
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, images, imageData } = e.data;

  switch (type) {
    case 'extract':
      if (images && Array.isArray(images)) {
        await processImages(images);
      } else if (imageData) {
        await processImages([imageData]);
      }
      break;

    case 'terminate':
      await terminate();
      break;

    default:
      console.warn('OCR Worker: Unknown message type:', type);
  }
});

// Export for type checking (not used at runtime)
export type OcrWorkerMessage =
  | { type: 'extract'; images: Array<Blob | File> }
  | { type: 'extract'; imageData: Blob | File }
  | { type: 'terminate' };

export type OcrWorkerResponse =
  | { type: 'progress'; percent: number }
  | { type: 'image-start'; imageIndex: number; total: number }
  | {
      type: 'image-complete';
      imageIndex: number;
      data: Partial<ExtractedUmaData>;
    }
  | { type: 'image-error'; imageIndex: number; error: string }
  | { type: 'complete'; data: ExtractedUmaData };
