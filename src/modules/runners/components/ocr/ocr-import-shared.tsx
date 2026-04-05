import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { getIconById } from '@/modules/data/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useUmasForSearch } from '@/modules/runners/utils';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import {
  SkillItem,
  SkillItemActions,
  SkillItemBody,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '@/modules/skills/components/skill-list/skill-item';

export function hasDetectedData(results: Partial<ExtractedUmaData> | null): boolean {
  return Boolean(
    results &&
      (results.outfitId ||
        results.speed ||
        results.stamina ||
        results.power ||
        results.guts ||
        results.wisdom ||
        (results.skills && results.skills.length > 0) ||
        results.surfaceAptitude ||
        results.distanceAptitude ||
        results.strategyAptitude ||
        results.strategy),
  );
}

export function toExtractedUmaData(results: Partial<ExtractedUmaData>): ExtractedUmaData {
  return {
    umaConfidence: 0,
    skills: [],
    imageCount: 0,
    unrecognized: [],
    ...results,
  };
}

function OcrDetectedSkillRow({ dismissable }: Readonly<{ dismissable: boolean }>) {
  return (
    <SkillItemRoot>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemActions>
            <SkillItemDetailsActions dismissable={dismissable} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

interface OcrUmaSelectorProps {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
}

export function OcrUmaSelector({
  results,
  isProcessing,
  onUpdateResults,
}: Readonly<OcrUmaSelectorProps>) {
  const umasForSearch = useUmasForSearch();
  const [umaSelectOpen, setUmaSelectOpen] = useState(false);

  const handleSelectUma = (outfitId: string) => {
    const uma = umasForSearch.find((entry) => entry.id === outfitId);
    if (!uma) {
      setUmaSelectOpen(false);
      return;
    }

    onUpdateResults({
      outfitId: uma.id,
      outfitName: uma.outfit,
      umaName: uma.name,
      umaConfidence: 1,
    });

    setUmaSelectOpen(false);
  };

  const trigger = results?.outfitId ? (
    <div className="flex items-center gap-3 p-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
      <img src={getIconById(results.outfitId)} alt={results.umaName} className="w-12 h-12 rounded" />
      <div>
        <p className="font-medium">{results.outfitName}</p>
        <p className="text-sm text-muted-foreground">{results.umaName}</p>
      </div>
    </div>
  ) : (
    <div className="p-2 border rounded-md text-muted-foreground text-sm cursor-pointer hover:bg-muted/50 transition-colors">
      {isProcessing ? 'Detecting...' : 'Click to select uma'}
    </div>
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Uma Detected</h4>
      <Popover open={umaSelectOpen} onOpenChange={setUmaSelectOpen}>
        <PopoverTrigger render={trigger} />
        <PopoverContent className="p-0 w-80">
          <Command>
            <CommandInput placeholder="Search uma..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {umasForSearch.map((uma) => (
                  <CommandItem
                    key={uma.id}
                    value={`${uma.outfit} ${uma.name}`}
                    onSelect={() => handleSelectUma(uma.id)}
                  >
                    <img src={getIconById(uma.id)} className="w-10 h-10 rounded mr-2" />
                    <div>
                      <div className="text-xs font-bold">{uma.outfit}</div>
                      <div className="text-sm">{uma.name}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface OcrStatsEditorProps {
  results: Partial<ExtractedUmaData> | null;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
}

export function OcrStatsEditor({ results, onUpdateResults }: Readonly<OcrStatsEditorProps>) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Stats</h4>
      <div className="grid grid-cols-5 gap-1 text-center">
        <div className="bg-primary text-primary-foreground rounded-tl p-1 text-xs">Speed</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Stamina</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Power</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Guts</div>
        <div className="bg-primary text-primary-foreground rounded-tr p-1 text-xs">Wit</div>
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 rounded-bl font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.speed ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              speed: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.stamina ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              stamina: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.power ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              power: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.guts ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              guts: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 rounded-br font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.wisdom ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              wisdom: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}

interface OcrSkillsListProps {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onRemoveSkill: (skillId: string) => void;
}

export function OcrSkillsList({
  results,
  isProcessing,
  onRemoveSkill,
}: Readonly<OcrSkillsListProps>) {
  const uniqueSkillId = results?.outfitId ? getUniqueSkillForByUmaId(results.outfitId) : null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Skills ({results?.skills?.length ?? 0} found)
      </h4>

      <div
        className="max-h-[240px] overflow-y-auto space-y-1"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const button = target.closest('[data-event="remove-skill"]');

          if (!button) {
            return;
          }

          const skillId = button.getAttribute('data-skillid');
          if (skillId) {
            onRemoveSkill(skillId);
          }
        }}
      >
        {results?.skills && results.skills.length > 0 ? (
          results.skills.map((skill, i) => (
            <SkillItem key={`${skill.id}-${i}`} skillId={skill.id}>
              <OcrDetectedSkillRow dismissable={skill.id !== uniqueSkillId} />
            </SkillItem>
          ))
        ) : (
          <div className="p-2 border rounded text-muted-foreground text-sm">
            {isProcessing ? 'Detecting...' : 'No skills detected'}
          </div>
        )}
      </div>
    </div>
  );
}

interface OcrUnrecognizedProps {
  results: Partial<ExtractedUmaData> | null;
}

export function OcrUnrecognized({ results }: Readonly<OcrUnrecognizedProps>) {
  if (!results?.unrecognized || results.unrecognized.length === 0) {
    return null;
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Unrecognized text ({results.unrecognized.length} lines)
      </summary>

      <pre className="mt-2 p-2 bg-muted rounded text-xs max-h-[100px] overflow-y-auto relative">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground absolute right-2 top-2"
          onClick={() => {
            navigator.clipboard.writeText(results.unrecognized?.join('\n') ?? '');
            toast.success('Copied to clipboard');
          }}
        >
          Copy
        </button>
        {results.unrecognized.join('\n')}
      </pre>
    </details>
  );
}

interface OcrResultPreviewPanelProps {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
  onRemoveSkill: (skillId: string) => void;
  emptyMessage?: string;
}

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
        <div className="space-y-4">
          <OcrUmaSelector
            results={results}
            isProcessing={isProcessing}
            onUpdateResults={onUpdateResults}
          />

          <OcrStatsEditor results={results} onUpdateResults={onUpdateResults} />

          <OcrSkillsList results={results} isProcessing={isProcessing} onRemoveSkill={onRemoveSkill} />

          <OcrUnrecognized results={results} />
        </div>
      )}
    </div>
  );
}
