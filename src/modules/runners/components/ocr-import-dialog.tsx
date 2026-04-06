import { useState } from 'react';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WizardImport } from '@/modules/runners/components/ocr/wizard-import';
import {
  hasDetectedData,
  toExtractedUmaData,
} from '@/modules/runners/components/ocr/ocr-import-shared';
import {
  OcrDialogProvider,
  useOcrActions,
  useOcrProcessing,
  useOcrResults,
  useOcrWizardState,
} from '@/modules/runners/components/ocr/ocr-dialog-provider';
import { setGeminiApiKey, useGeminiApiKey } from '@/store/ocr.store';
import { getNextWizardStep, getPreviousWizardStep } from './ocr/definitions';

interface OcrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: ExtractedUmaData) => void;
}

export function OcrImportDialog({ open, onOpenChange, onApply }: Readonly<OcrImportDialogProps>) {
  return (
    <OcrDialogProvider>
      <OcrImportContent open={open} onOpenChange={onOpenChange} onApply={onApply} />
    </OcrDialogProvider>
  );
}

type OcrImportContentProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: ExtractedUmaData) => void;
};

const OcrImportContent = ({ open, onOpenChange, onApply }: Readonly<OcrImportContentProps>) => {
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const { isProcessing } = useOcrProcessing();
  const results = useOcrResults();
  const { step } = useOcrWizardState();
  const { reset, setStep } = useOcrActions();
  const geminiApiKey = useGeminiApiKey();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setShowGeminiApiKey(false);
    }

    onOpenChange(nextOpen);
  };

  const handleClose = () => {
    if (open) {
      handleOpenChange(false);
    }
  };

  const handleWizardBack = () => {
    const previous = getPreviousWizardStep(step);
    if (previous) {
      setStep(previous);
    }
  };

  const handleWizardNext = () => {
    const next = getNextWizardStep(step);
    if (next) {
      setStep(next);
    }
  };

  const handleWizardApply = () => {
    if (results && hasDetectedData(results)) {
      onApply(toExtractedUmaData(results));
      handleClose();
    }
  };

  const showStepFooter = step !== 'align';
  const canApply = Boolean(results && hasDetectedData(results));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col min-w-[920px] min-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Import from Screenshots</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <div className="w-28 shrink-0 text-sm font-medium">Gemini API key</div>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Input
              type={showGeminiApiKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(event) => setGeminiApiKey(event.target.value)}
              placeholder="Required: use Gemini Flash for screenshot OCR"
              disabled={isProcessing}
              autoComplete="off"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowGeminiApiKey((show) => !show)}
              aria-label={showGeminiApiKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
            >
              {showGeminiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
          >
            Get key
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <WizardImport />
        </div>

        {showStepFooter && (
          <DialogFooter className="sm:justify-between sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleWizardBack}
              disabled={isProcessing}
            >
              Back
            </Button>

            {step === 'summary' ? (
              <Button
                type="button"
                onClick={handleWizardApply}
                disabled={!canApply || isProcessing}
              >
                Apply
              </Button>
            ) : (
              <Button type="button" onClick={handleWizardNext} disabled={isProcessing}>
                Next
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
