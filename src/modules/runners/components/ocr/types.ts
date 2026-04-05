export type OcrImportMode = 'wizard' | 'advanced';
export type OcrMaskType = 'full-details' | 'skills-only';

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PreparedImage {
  blob: Blob;
  maskType: OcrMaskType;
  preview: string; // object URL for thumbnail
}

export type WizardStep = 'align' | 'review-identity' | 'review-skills' | 'summary';
