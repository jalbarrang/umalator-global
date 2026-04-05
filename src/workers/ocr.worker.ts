/**
 * Web Worker for OCR processing
 */

import '../polyfills';
import type { OcrEngine } from '@/modules/runners/ocr/engine';
import { parseOcrResult } from '@/modules/runners/ocr/parser';
import { TesseractEngine } from '@/modules/runners/ocr/engines/tesseract';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';

let ocrEngine: OcrEngine | null = null;

const getEngine = (): OcrEngine => {
  if (!ocrEngine) {
    ocrEngine = new TesseractEngine({
      onProgress: (percent) => {
        postMessage({
          type: 'progress',
          percent,
        });
      },
    });
  }

  return ocrEngine;
};

// Process a single image
async function processImage(
  imageData: Blob,
  imageIndex: number,
  existingData?: Partial<ExtractedUmaData>,
): Promise<ExtractedUmaData> {
  const engine = getEngine();
  const engineResult = await engine.recognize(imageData);

  return parseOcrResult(engineResult, imageIndex, existingData);
}

// Process multiple images
async function processImages(images: Array<Blob | File>): Promise<void> {
  let accumulatedData: Partial<ExtractedUmaData> | undefined;

  try {
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
  } finally {
    await terminate();
  }
}

// Clean up engine
async function terminate() {
  if (!ocrEngine) {
    return;
  }

  await ocrEngine.destroy();
  ocrEngine = null;
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
