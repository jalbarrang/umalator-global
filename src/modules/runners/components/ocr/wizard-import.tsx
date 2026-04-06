import { useRef, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, ScanLine } from 'lucide-react';
import type { PreparedImage } from '@/modules/runners/components/ocr/types';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { createPreparedImage, WIZARD_STEPS } from '@/modules/runners/components/ocr/definitions';
import {
  useOcrActions,
  useOcrProcessing,
  useOcrResults,
  useOcrWizardState,
} from '@/modules/runners/components/ocr/ocr-dialog-provider';
import {
  hasDetectedData,
  OcrSkillDebugPanel,
  OcrSkillsList,
  OcrStatsEditor,
  OcrUmaSelector,
} from '@/modules/runners/components/ocr/ocr-import-shared';
import { getIconById } from '@/modules/data/icons';
import { cn } from '@/lib/utils';
import { useGeminiApiKey } from '@/store/ocr.store';

interface DropZoneProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  accept?: string;
  disabled?: boolean;
  noKey?: boolean;
  thumbnails?: Array<PreparedImage>;
  onFiles: (files: Array<File>) => void;
}

function DropZone({
  label,
  description,
  icon,
  accept = 'image/*',
  disabled = false,
  noKey = false,
  thumbnails = [],
  onFiles,
}: Readonly<DropZoneProps>) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length > 0) {
      onFiles(files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) {
      onFiles(files);
    }
    e.target.value = '';
  };

  if (noKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 text-center">
        <KeyRound className="w-8 h-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Gemini API key required</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            Enter your Gemini API key above to scan screenshots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer',
        disabled ? 'opacity-50 pointer-events-none' : 'hover:border-muted-foreground/50',
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center gap-2 text-center flex-1 py-4">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground max-w-[180px]">{description}</p>
      </div>

      {thumbnails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {thumbnails.map((img, i) => (
            <div
              key={`${img.preview}-${i}`}
              className="w-12 h-12 rounded border overflow-hidden shrink-0"
            >
              <img src={img.preview} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}

export function WizardImport() {
  const geminiApiKey = useGeminiApiKey();
  const hasApiKey = geminiApiKey.trim().length > 0;

  const results = useOcrResults();
  const { isProcessing, progress, error } = useOcrProcessing();
  const { step, preparedImages } = useOcrWizardState();
  const { processComposited, updateResults, removeSkill, reset, setStep, addPreparedImage } =
    useOcrActions();

  const handleFullDetailsFiles = async (files: Array<File>) => {
    if (files.length === 0) {
      return;
    }

    try {
      reset();

      const [fullDetailsFile, ...skillOnlyFiles] = files;
      addPreparedImage(createPreparedImage(fullDetailsFile, 'full-details-own'));
      let nextData: Partial<ExtractedUmaData> | undefined =
        (await processComposited(fullDetailsFile, 'full-details-own')) ?? undefined;

      for (const file of skillOnlyFiles) {
        addPreparedImage(createPreparedImage(file, 'skills-only'));
        nextData = (await processComposited(file, 'skills-only', nextData)) ?? undefined;
      }

      if (nextData) {
        setStep('review-identity');
      }
    } catch (err) {
      console.error('Failed to process OCR images', err);
    }
  };

  const activeStepIndex = WIZARD_STEPS.findIndex((entry) => entry.id === step);

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {WIZARD_STEPS.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-2">
            <div
              className={cn(
                'px-2 py-1 rounded border',
                index <= activeStepIndex
                  ? 'border-primary text-foreground bg-primary/10'
                  : 'border-muted',
              )}
            >
              {entry.label}
            </div>
            {index < WIZARD_STEPS.length - 1 && <span>→</span>}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'align' && (
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          <DropZone
            label="Drop here"
            description="The screenshots of your runner, add more if she has a lot of skills."
            icon={<ScanLine className="w-8 h-8" />}
            disabled={isProcessing}
            noKey={!hasApiKey}
            thumbnails={preparedImages}
            onFiles={(files) => void handleFullDetailsFiles(files)}
          />
        </div>
      )}

      {/* Step: Review Identity */}
      {step === 'review-identity' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <OcrUmaSelector
            results={results}
            isProcessing={isProcessing}
            onUpdateResults={updateResults}
          />
          <OcrStatsEditor results={results} onUpdateResults={updateResults} />
        </div>
      )}

      {/* Step: Review Skills */}
      {step === 'review-skills' && (
        <div className="flex flex-col min-h-0">
          <div className="flex flex-col min-h-0 gap-2">
            <OcrSkillsList
              results={results}
              isProcessing={isProcessing}
              onRemoveSkill={removeSkill}
              onUpdateResults={updateResults}
            />

            <OcrSkillDebugPanel results={results} />
          </div>
        </div>
      )}

      {/* Step: Summary */}
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
                  <p className="text-sm text-muted-foreground mt-1">Not detected</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Stats</p>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  {(['speed', 'stamina', 'power', 'guts', 'wisdom'] as const).map((stat) => (
                    <div key={stat} className="rounded border p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {stat.slice(0, 3)}
                      </p>
                      <p className="font-mono">{results?.[stat] ?? '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                <p className="text-sm mt-1">{results?.skills?.length ?? 0} detected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
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

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
