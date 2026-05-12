import { ImageIcon } from 'lucide-react';
import { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { hasDetectedData } from '../helpers';
import { OcrUmaSelector } from './uma-selector';
import { OcrStatsEditor } from './stats-editor';
import { OcrSkillsList } from './skill-list';
import { OcrSkillDebugPanel } from './debug-panel';
import { OcrUnrecognized } from './ocr-unrecognized';

type OcrResultPreviewPanelProps = {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
  onRemoveSkill: (skillId: string) => void;
  emptyMessage?: string;
};

export function OcrResultPreviewPanel({
  results,
  isProcessing,
  onUpdateResults,
  onRemoveSkill,
  emptyMessage = 'Process a screenshot to extract data',
}: Readonly<OcrResultPreviewPanelProps>) {
  const hasResults = hasDetectedData(results);

  return (
    <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
      <h3 className="font-medium">Extracted Data</h3>

      {!hasResults && !isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <ImageIcon className="w-12 h-12" />
          <p>{emptyMessage}</p>
        </div>
      )}

      {(hasResults || isProcessing) && (
        <div className="flex flex-col gap-4">
          <OcrUmaSelector
            results={results}
            isProcessing={isProcessing}
            onUpdateResults={onUpdateResults}
          />

          <OcrStatsEditor results={results} onUpdateResults={onUpdateResults} />

          <OcrSkillsList
            results={results}
            isProcessing={isProcessing}
            onRemoveSkill={onRemoveSkill}
            onUpdateResults={onUpdateResults}
          />

          <OcrSkillDebugPanel results={results} />

          <OcrUnrecognized results={results} />
        </div>
      )}
    </div>
  );
}
