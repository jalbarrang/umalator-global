import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PreparedImage, WizardStep } from '@/modules/runners/components/ocr/types';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { Button } from '@/components/ui/button';
import { MaskCanvasEditor } from '@/modules/runners/components/ocr/mask-canvas-editor';
import {
  useOcrActions,
  useOcrProcessing,
  useOcrResults,
  useOcrWizardState,
} from '@/modules/runners/components/ocr/ocr-dialog-provider';
import {
  hasDetectedData,
  OcrSkillsList,
  OcrStatsEditor,
  OcrUmaSelector,
  toExtractedUmaData,
} from '@/modules/runners/components/ocr/ocr-import-shared';
import { getIconById } from '@/modules/data/icons';

interface WizardImportProps {
  onApply: (data: ExtractedUmaData) => void;
}

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'align', label: 'Align' },
  { id: 'review-identity', label: 'Review Identity' },
  { id: 'review-skills', label: 'Review Skills' },
  { id: 'summary', label: 'Summary' },
];

function createPreparedImage(blob: Blob, maskType: PreparedImage['maskType']): PreparedImage {
  return {
    blob,
    maskType,
    preview: URL.createObjectURL(blob),
  };
}

export function WizardImport({ onApply }: Readonly<WizardImportProps>) {
  const results = useOcrResults();
  const { isProcessing, progress, error } = useOcrProcessing();
  const { step, preparedImages, showSkillsEditor } = useOcrWizardState();
  const {
    processComposited,
    updateResults,
    removeSkill,
    reset,
    setStep,
    setShowSkillsEditor,
    addPreparedImage,
  } = useOcrActions();

  const handleAlignProcess = async (blob: Blob) => {
    try {
      reset();

      const preparedImage = createPreparedImage(blob, 'full-details-own');
      addPreparedImage(preparedImage);

      const nextData = await processComposited(blob, 'full-details-own');
      if (!nextData) {
        return;
      }

      setShowSkillsEditor(false);
      setStep('review-identity');
    } catch (processError) {
      console.error('Failed to process full-details OCR image', processError);
    }
  };

  const handleAddSkillsProcess = async (blob: Blob) => {
    try {
      const preparedImage = createPreparedImage(blob, 'skills-only');
      addPreparedImage(preparedImage);

      await processComposited(blob, 'skills-only', results ?? undefined);
      setShowSkillsEditor(false);
    } catch (processError) {
      console.error('Failed to process skills-only OCR image', processError);
    }
  };

  const handleApply = () => {
    if (!results || !hasDetectedData(results)) {
      return;
    }

    onApply(toExtractedUmaData(results));
  };

  const activeStepIndex = STEPS.findIndex((entry) => entry.id === step);

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {STEPS.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-2">
            <div
              className={`px-2 py-1 rounded border ${
                index <= activeStepIndex
                  ? 'border-primary text-foreground bg-primary/10'
                  : 'border-muted'
              }`}
            >
              {entry.label}
            </div>
            {index < STEPS.length - 1 && <span>→</span>}
          </div>
        ))}
      </div>

      {step === 'align' && (
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          <div className="text-sm text-muted-foreground">
            Align the <span className="font-medium text-foreground">full details</span> screenshot,
            then scan it.
          </div>

          <MaskCanvasEditor
            maskType="full-details-own"
            processLabel="Scan"
            externalBusy={isProcessing}
            onProcess={(blob) => {
              void handleAlignProcess(blob);
            }}
            className="flex-1 min-h-0"
          />
        </div>
      )}

      {step === 'review-identity' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <OcrUmaSelector
            results={results}
            isProcessing={isProcessing}
            onUpdateResults={updateResults}
          />

          <OcrStatsEditor results={results} onUpdateResults={updateResults} />

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep('align')}>
              Back
            </Button>
            <Button onClick={() => setStep('review-skills')}>Next</Button>
          </div>
        </div>
      )}

      {step === 'review-skills' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          <div className="text-xs text-muted-foreground">
            Prepared screenshots: {preparedImages.length}{' '}
            {preparedImages.length === 1 ? 'image' : 'images'}
          </div>

          <div className="flex flex-wrap gap-2 max-h-[84px] overflow-y-auto">
            {preparedImages.map((image, index) => (
              <div
                key={`${image.preview}-${index}`}
                className="relative w-14 h-14 rounded-md border overflow-hidden"
              >
                <img src={image.preview} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 text-[10px] px-1 py-0.5 bg-black/70 text-white text-center">
                  {image.maskType === 'full-details-own' && 'Full: Owned Runner'}
                  {image.maskType === 'full-details-other' && 'Full: Partner Runner'}
                  {image.maskType === 'skills-only' && 'Skills'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <OcrSkillsList
              results={results}
              isProcessing={isProcessing}
              onRemoveSkill={removeSkill}
            />
          </div>

          <div className="space-y-3">
            {!showSkillsEditor ? (
              <Button variant="outline" onClick={() => setShowSkillsEditor(true)}>
                Add more skills
              </Button>
            ) : (
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Scan skills-only screenshot</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowSkillsEditor(false)}>
                    Cancel
                  </Button>
                </div>

                <MaskCanvasEditor
                  maskType="skills-only"
                  processLabel="Scan Skills"
                  externalBusy={isProcessing}
                  onProcess={(blob) => {
                    void handleAddSkillsProcess(blob);
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="outline" onClick={() => setStep('review-identity')}>
              Back
            </Button>
            <Button onClick={() => setStep('summary')}>Next</Button>
          </div>
        </div>
      )}

      {step === 'summary' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <div className="rounded-md border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Import Summary</h3>
              {hasDetectedData(results) && (
                <div className="text-green-600 flex items-center gap-1 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to apply
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Uma</p>
                {results?.outfitId ? (
                  <div className="flex items-center gap-2 mt-1">
                    <img
                      src={getIconById(results.outfitId)}
                      alt={results.umaName}
                      className="w-10 h-10 rounded"
                    />
                    <div>
                      <p className="font-medium">{results.outfitName}</p>
                      <p className="text-sm text-muted-foreground">{results.umaName}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Not selected</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Stats</p>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">SPD</p>
                    <p className="font-mono">{results?.speed ?? '-'}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">STA</p>
                    <p className="font-mono">{results?.stamina ?? '-'}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">POW</p>
                    <p className="font-mono">{results?.power ?? '-'}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">GUT</p>
                    <p className="font-mono">{results?.guts ?? '-'}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">WIT</p>
                    <p className="font-mono">{results?.wisdom ?? '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                <p className="text-sm mt-1">{results?.skills?.length ?? 0} detected</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('review-skills')}>
              Back
            </Button>
            <Button onClick={handleApply} disabled={!results || !hasDetectedData(results)}>
              Apply
            </Button>
          </div>
        </div>
      )}

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
  );
}
