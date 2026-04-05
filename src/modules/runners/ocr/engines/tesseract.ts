import Tesseract from 'tesseract.js';
import type { OcrEngine, OcrEngineResult } from '@/modules/runners/ocr/engine';

interface TesseractEngineOptions {
  onProgress?: (percent: number) => void;
}

const binarizeImage = async (imageData: Blob | File): Promise<Blob> => {
  const image = await createImageBitmap(imageData);

  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(image, 0, 0);
  image.close();

  const frame = ctx.getImageData(0, 0, image.width, image.height);
  const { data } = frame;

  for (let i = 0; i < data.length; i += 4) {
    const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = grayscale >= 128 ? 255 : 0;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(frame, 0, 0);

  return canvas.convertToBlob({ type: 'image/png' });
};

export class TesseractEngine implements OcrEngine {
  private worker: Tesseract.Worker | null = null;
  private readonly onProgress?: (percent: number) => void;

  constructor(options: TesseractEngineOptions = {}) {
    this.onProgress = options.onProgress;
  }

  private async getWorker(): Promise<Tesseract.Worker> {
    if (this.worker) {
      return this.worker;
    }

    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          this.onProgress?.(Math.round(message.progress * 100));
        }
      },
    });

    return this.worker;
  }

  async recognize(imageData: Blob | File): Promise<OcrEngineResult> {
    const worker = await this.getWorker();
    const filteredImage = await binarizeImage(imageData);
    const imageUrl = URL.createObjectURL(filteredImage);

    try {
      const {
        data: { text },
      } = await worker.recognize(imageUrl);

      return { text };
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async destroy(): Promise<void> {
    if (!this.worker) {
      return;
    }

    await this.worker.terminate();
    this.worker = null;
  }
}
