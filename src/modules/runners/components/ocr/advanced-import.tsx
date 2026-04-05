import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import type { OcrMaskType } from '@/modules/runners/components/ocr/types';
import { Button } from '@/components/ui/button';
import { MaskCanvasEditor } from '@/modules/runners/components/ocr/mask-canvas-editor';
import {
  useOcrActions,
  useOcrProcessing,
  useOcrResults,
} from '@/modules/runners/components/ocr/ocr-dialog-provider';
import {
  hasDetectedData,
  OcrResultPreviewPanel,
  toExtractedUmaData,
} from '@/modules/runners/components/ocr/ocr-import-shared';

interface AdvancedImportProps {
  onApply: (data: ExtractedUmaData) => void;
  formId: string;
}

export function AdvancedImport({ onApply, formId }: Readonly<AdvancedImportProps>) {
  const [maskType, setMaskType] = useState<OcrMaskType>('full-details-own');

  const results = useOcrResults();
  const { updateResults, removeSkill, processComposited } = useOcrActions();
  const { isProcessing, progress, error } = useOcrProcessing();

  const canApply = hasDetectedData(results) && !isProcessing;

  const handleProcess = async (blob: Blob) => {
    try {
      await processComposited(blob, maskType, results ?? undefined);
    } catch (processError) {
      console.error('Failed to process composited OCR image', processError);
    }
  };

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!results || !canApply) {
      return;
    }

    onApply(toExtractedUmaData(results));
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex-1 overflow-hidden flex gap-4">
      <div className="w-1/2 flex flex-col gap-4 min-h-0">
        <div className="inline-flex items-center rounded-md border p-1 gap-1 self-start">
          <Button
            type="button"
            variant={maskType === 'full-details-own' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMaskType('full-details-own')}
          >
            Full: My Uma
          </Button>

          <Button
            type="button"
            variant={maskType === 'full-details-other' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMaskType('full-details-other')}
          >
            Full: Partner Uma
          </Button>

          <Button
            type="button"
            variant={maskType === 'skills-only' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMaskType('skills-only')}
          >
            Skills Only
          </Button>
        </div>

        <MaskCanvasEditor
          key={maskType}
          maskType={maskType}
          processLabel="Process"
          externalBusy={isProcessing}
          onProcess={(blob) => {
            void handleProcess(blob);
          }}
          className="flex-1 min-h-0"
        />

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing screenshot...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <OcrResultPreviewPanel
        results={results}
        isProcessing={isProcessing}
        onUpdateResults={updateResults}
        onRemoveSkill={removeSkill}
        emptyMessage="Upload, align, and process a screenshot to preview OCR results"
      />

      <button type="submit" className="hidden" />
    </form>
  );
}
