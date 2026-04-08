import { useMemo, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { ImageIcon, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { getIconById } from '@/modules/data/icons';
import {
  getSkillById,
  getSkills,
  normalizeSkillName,
  type SkillEntry,
} from '@/modules/data/skills';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useUmasForSearch } from '@/modules/runners/utils';
import { getSelectableSkillsForUma, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
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

function OcrDetectedSkillRow({
  dismissable,
  onDismiss,
  replaceAction,
}: Readonly<{ dismissable: boolean; onDismiss?: () => void; replaceAction?: ReactNode }>) {
  return (
    <SkillItemRoot>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />

          <SkillItemActions>
            {dismissable && replaceAction}
            <SkillItemDetailsActions dismissable={dismissable} onDismiss={onDismiss} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

type OcrSkillPickerOption = {
  id: string;
  name: string;
  meta: string;
  searchValue: string;
};

function getOcrSkillOptionMeta(skill: SkillEntry): string {
  if (skill.id.startsWith('9')) {
    return `${skill.id} · inherited`;
  }

  if (skill.id.startsWith('1')) {
    return `${skill.id} · base/unique`;
  }

  return skill.id;
}

function createManualOcrSkillEntry(
  skillId: string,
  previous?: ExtractedUmaData['skills'][number],
): ExtractedUmaData['skills'][number] | null {
  const skill = getSkillById(skillId);
  if (!skill) {
    return null;
  }

  return {
    id: skillId,
    name: skill.name,
    confidence: 1,
    originalText: previous?.originalText ?? `[Manual] ${skill.name}`,
    fromImage: previous?.fromImage ?? 0,
  };
}

interface OcrSkillPickerPopoverProps {
  skillOptions: Array<OcrSkillPickerOption>;
  title: string;
  trigger?: ReactElement;
  open?: boolean;
  anchor?: ComponentProps<typeof PopoverContent>['anchor'];
  onOpenChange?: (open: boolean) => void;
  onSelectSkill: (skillId: string) => void;
}

function OcrSkillPickerPopover({
  skillOptions,
  title,
  trigger,
  open: controlledOpen,
  anchor,
  onOpenChange,
  onSelectSkill,
}: Readonly<OcrSkillPickerPopoverProps>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      {trigger && <PopoverTrigger render={trigger as ReactElement} />}
      {open && (
        <PopoverContent className="w-[360px] p-0" align="end" anchor={anchor}>
          <Command>
            <CommandInput placeholder={title} />

            <CommandList className="max-h-[420px]">
              <CommandEmpty>No matching skills found.</CommandEmpty>
              <CommandGroup>
                {skillOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.searchValue}
                    onSelect={() => {
                      onSelectSkill(option.id);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{option.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{option.meta}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
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
    <button
      type="button"
      className="flex items-center gap-3 p-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors w-full text-left"
    >
      <img
        src={getIconById(results.outfitId)}
        alt={results.umaName}
        className="w-12 h-12 rounded"
      />
      <div>
        <p className="font-medium">{results.outfitName}</p>
        <p className="text-sm text-muted-foreground">{results.umaName}</p>
      </div>
    </button>
  ) : (
    <button
      type="button"
      className="p-2 border rounded-md text-muted-foreground text-sm cursor-pointer hover:bg-muted/50 transition-colors w-full text-left"
      disabled={isProcessing}
    >
      {isProcessing ? 'Detecting...' : 'Click to select uma'}
    </button>
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
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
}

export function OcrSkillsList({
  results,
  isProcessing,
  onRemoveSkill,
  onUpdateResults,
}: Readonly<OcrSkillsListProps>) {
  const uniqueSkillId = results?.outfitId ? getUniqueSkillForByUmaId(results.outfitId) : null;
  const currentSkills = results?.skills ?? [];
  const [replacePopoverState, setReplacePopoverState] = useState<{
    anchor: HTMLButtonElement;
    index: number;
  } | null>(null);

  const skillOptions = useMemo<Array<OcrSkillPickerOption>>(() => {
    const selectableSkillIds = results?.outfitId
      ? getSelectableSkillsForUma(results.outfitId)
      : getSkills().map((skill) => skill.id);

    return selectableSkillIds
      .map((skillId) => getSkillById(skillId))
      .filter((skill): skill is SkillEntry => skill !== undefined)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        meta: getOcrSkillOptionMeta(skill),
        searchValue: `${skill.name} ${skill.id} ${getOcrSkillOptionMeta(skill)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }, [results?.outfitId]);

  const handleAddSkill = (skillId: string) => {
    if (currentSkills.some((skill) => skill.id === skillId)) {
      toast.info('That skill is already in the list');
      return;
    }

    const nextSkill = createManualOcrSkillEntry(skillId);
    if (!nextSkill) {
      toast.error('Could not add that skill');
      return;
    }

    onUpdateResults({ skills: [...currentSkills, nextSkill] });
    toast.success('Skill added');
  };

  const handleReplaceSkill = (index: number, skillId: string) => {
    const previous = currentSkills[index];
    if (!previous || previous.id === skillId) {
      return;
    }

    if (currentSkills.some((skill, skillIndex) => skill.id === skillId && skillIndex !== index)) {
      toast.info('That skill is already in the list');
      return;
    }

    const nextSkill = createManualOcrSkillEntry(skillId, previous);
    if (!nextSkill) {
      toast.error('Could not replace that skill');
      return;
    }

    const nextSkills = [...currentSkills];
    nextSkills[index] = nextSkill;
    onUpdateResults({ skills: nextSkills });
    toast.success('Skill updated');
  };

  const handleOpenReplaceSkillPicker = (index: number, anchor: HTMLButtonElement) => {
    setReplacePopoverState({ anchor, index });
  };

  return (
    <div className="flex flex-col min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Skills ({results?.skills?.length ?? 0} found)
        </h4>

        <OcrSkillPickerPopover
          skillOptions={skillOptions}
          title="Search skill to add"
          onSelectSkill={handleAddSkill}
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={isProcessing}>
              <Plus className="mr-1 h-4 w-4" />
              Add Skill
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {currentSkills.length === 0 && (
          <div className="p-2 border rounded text-muted-foreground text-sm">
            {isProcessing ? 'Detecting...' : 'No skills detected'}
          </div>
        )}

        {currentSkills.length > 0 &&
          currentSkills.map((skill, index) => (
            <SkillItem key={`${skill.id}-${index}`} skillId={skill.id} onRemove={onRemoveSkill}>
              <OcrDetectedSkillRow
                dismissable={skill.id !== uniqueSkillId}
                onDismiss={() => onRemoveSkill(skill.id)}
                replaceAction={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    type="button"
                    title="Replace skill"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenReplaceSkillPicker(index, event.currentTarget);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
            </SkillItem>
          ))}

        <OcrSkillPickerPopover
          skillOptions={skillOptions}
          title="Search replacement skill"
          open={replacePopoverState !== null}
          anchor={replacePopoverState?.anchor}
          onOpenChange={(open) => {
            if (!open) {
              setReplacePopoverState(null);
            }
          }}
          onSelectSkill={(skillId) => {
            if (replacePopoverState) {
              handleReplaceSkill(replacePopoverState.index, skillId);
            }
          }}
        />
      </div>
    </div>
  );
}

interface OcrSkillDebugPanelProps {
  results: Partial<ExtractedUmaData> | null;
}

function formatOcrSkillDebugReport(results: Partial<ExtractedUmaData>): string {
  const lines = [
    'OCR Skill Debug Report',
    `Uma: ${results.outfitName ?? '—'} ${results.umaName ?? ''}`.trim(),
    `Images: ${results.imageCount ?? 0}`,
    '',
    'Skills:',
  ];

  for (const [index, skill] of (results.skills ?? []).entries()) {
    lines.push(`- [${index + 1}] Raw: ${skill.originalText || '—'}`);
    lines.push(`  Normalized: ${normalizeSkillName(skill.originalText) || '—'}`);
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
  if (!results?.skills || results.skills.length === 0) {
    return null;
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        OCR skill debug ({results.skills.length} matches)
      </summary>

      <div className="mt-2 space-y-2">
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

        {results.skills.map((skill, index) => {
          const normalized = normalizeSkillName(skill.originalText);

          return (
            <div key={`${skill.id}-${index}`} className="rounded border bg-muted/30 p-2 text-xs">
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
    </details>
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
