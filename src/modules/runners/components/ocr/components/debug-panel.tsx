import { Button } from '@/components/ui/button';
import { dataRegistry } from '@/modules/data/registry';
import { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { useState } from 'react';
import { toast } from 'sonner';

interface OcrSkillDebugPanelProps {
  results: Partial<ExtractedUmaData> | null;
}

function formatOcrSkillDebugReport(results: Partial<ExtractedUmaData>): string {
  const lines = [
    'OCR Skill Debug Report',
    `Uma: ${results.outfitName ?? '—'} ${results.umaName ?? ''}`.trim(),
    `Images: ${results.imageCount ?? 0}`,
    '',
    'Skills:'
  ];

  for (const [index, skill] of (results.skills ?? []).entries()) {
    lines.push(`- [${index + 1}] Raw: ${skill.originalText || '—'}`);
    lines.push(
      `  Normalized: ${dataRegistry.skills.normalizeSkillName(skill.originalText) || '—'}`
    );
    lines.push(`  Matched: ${skill.name}`);
    lines.push(`  Skill ID: ${skill.id}`);
    lines.push(`  Confidence: ${skill.confidence.toFixed(2)}`);
  }

  if (results.unrecognized && results.unrecognized.length > 0) {
    lines.push('', 'Unrecognized:', ...results.unrecognized.map((line) => `- ${line}`));
  }

  return lines.join('\n');
}

export function OcrSkillDebugPanel({ results }: Readonly<OcrSkillDebugPanelProps>) {
  const [open, setOpen] = useState(false);

  if (!results?.skills || results.skills.length === 0) {
    return null;
  }

  return (
    <div className="text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        type="button"
        onClick={() => setOpen((open) => !open)}
      >
        OCR skill debug ({results.skills.length} matches)
      </Button>

      {open && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                void navigator.clipboard.writeText(formatOcrSkillDebugReport(results));
                toast.success('Copied OCR debug report');
              }}
            >
              Copy debug report
            </button>
          </div>

          {results.skills.map((skill) => {
            const normalized = dataRegistry.skills.normalizeSkillName(skill.originalText);

            return (
              <div key={skill.id} className="rounded border bg-muted/30 p-2 text-xs">
                <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">Raw</span>
                  <code className="break-all">{skill.originalText || '—'}</code>

                  <span className="text-muted-foreground">Normalized</span>
                  <code className="break-all">{normalized || '—'}</code>

                  <span className="text-muted-foreground">Matched</span>
                  <code className="break-all">{skill.name}</code>

                  <span className="text-muted-foreground">Skill ID</span>
                  <code className="break-all">{skill.id}</code>

                  <span className="text-muted-foreground">Confidence</span>
                  <code>{skill.confidence.toFixed(2)}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
