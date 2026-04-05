import { useId } from 'react';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdvancedImport } from '@/modules/runners/components/ocr/advanced-import';
import { WizardImport } from '@/modules/runners/components/ocr/wizard-import';
import { hasDetectedData } from '@/modules/runners/components/ocr/ocr-import-shared';
import {
  OcrDialogProvider,
  useOcrProcessing,
  useOcrResults,
} from '@/modules/runners/components/ocr/ocr-dialog-provider';
import { useOcrMode, setOcrMode } from '@/store/ocr.store';

interface OcrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: ExtractedUmaData) => void;
}

interface OcrImportDialogContentProps {
  mode: 'wizard' | 'advanced';
  advancedFormId: string;
  onApply: (data: ExtractedUmaData) => void;
  onCancel: () => void;
}

function OcrImportDialogContent({
  mode,
  advancedFormId,
  onApply,
  onCancel,
}: Readonly<OcrImportDialogContentProps>) {
  const results = useOcrResults();
  const { isProcessing } = useOcrProcessing();

  const canApply = hasDetectedData(results) && !isProcessing;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between gap-4 pr-8">
          <DialogTitle>Import from Screenshots</DialogTitle>

          <div className="inline-flex items-center rounded-md border p-1 gap-1">
            <Button
              type="button"
              size="sm"
              variant={mode === 'wizard' ? 'default' : 'ghost'}
              onClick={() => setOcrMode('wizard')}
            >
              Guided
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'advanced' ? 'default' : 'ghost'}
              onClick={() => setOcrMode('advanced')}
            >
              Advanced
            </Button>
          </div>
        </div>
      </DialogHeader>

      {mode === 'wizard' ? (
        <WizardImport onApply={onApply} />
      ) : (
        <AdvancedImport formId={advancedFormId} onApply={onApply} />
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        {mode === 'advanced' && (
          <Button type="submit" form={advancedFormId} disabled={!canApply}>
            Apply
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

export function OcrImportDialog({ open, onOpenChange, onApply }: Readonly<OcrImportDialogProps>) {
  const mode = useOcrMode();
  const advancedFormId = useId();

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleApply = (data: ExtractedUmaData) => {
    onApply(data);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col min-w-[920px] min-h-[600px]">
        <OcrDialogProvider>
          <OcrImportDialogContent
            mode={mode}
            advancedFormId={advancedFormId}
            onApply={handleApply}
            onCancel={() => handleOpenChange(false)}
          />
        </OcrDialogProvider>
      </DialogContent>
    </Dialog>
  );
}
