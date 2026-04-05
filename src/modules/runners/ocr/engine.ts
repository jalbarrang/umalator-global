import type { ExtractedUmaData } from './types';

export interface OcrEngineResult {
  text?: string;
  structured?: Partial<ExtractedUmaData>;
}

export interface OcrEngine {
  recognize(imageData: Blob | File): Promise<OcrEngineResult>;
  destroy(): Promise<void>;
}
