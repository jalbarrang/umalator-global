import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';
import { decodeRoster } from './roster-encoding';
import { singleExportToRunnerState, encodingToAptitude } from './converters';
import type { SingleExportData } from './types';
import {
  createRunnerState,
  type RunnerState,
} from '@/modules/runners/components/runner-card/types';
import { useRunnerLibraryStore, type SavedRunner } from '@/store/runner-library.store';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { StatImage } from '@/modules/runners/components/StatInput';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

// --- Types ---

type RosterImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DecodedRunner = {
  source: SingleExportData;
  state: RunnerState;
  displayInfo: { name: string; outfit: string } | null;
  imageUrl: string;
  searchText: string;
};

// --- Aptitude filter types ---

type AptitudeSlotKey =
  | 'proper_distance_short'
  | 'proper_distance_mile'
  | 'proper_distance_middle'
  | 'proper_distance_long'
  | 'proper_ground_turf'
  | 'proper_ground_dirt'
  | 'proper_running_style_nige'
  | 'proper_running_style_senko'
  | 'proper_running_style_sashi'
  | 'proper_running_style_oikomi';

type AptitudeFilterRow = {
  label: string;
  slots: Array<{ key: AptitudeSlotKey; name: string }>;
};

const APTITUDE_ROWS: AptitudeFilterRow[] = [
  {
    label: 'Track',
    slots: [
      { key: 'proper_ground_turf', name: 'Turf' },
      { key: 'proper_ground_dirt', name: 'Dirt' },
    ],
  },
  {
    label: 'Distance',
    slots: [
      { key: 'proper_distance_short', name: 'Sprint' },
      { key: 'proper_distance_mile', name: 'Mile' },
      { key: 'proper_distance_middle', name: 'Medium' },
      { key: 'proper_distance_long', name: 'Long' },
    ],
  },
  {
    label: 'Style',
    slots: [
      { key: 'proper_running_style_nige', name: 'Front' },
      { key: 'proper_running_style_senko', name: 'Pace' },
      { key: 'proper_running_style_sashi', name: 'Late' },
      { key: 'proper_running_style_oikomi', name: 'End' },
    ],
  },
];

const MIN_GRADES = [8, 7, 6, 5, 4, 3, 2, 1] as const;

type AptitudeFilters = Partial<Record<AptitudeSlotKey, number>>;

const GRADE_COLORS: Record<number, string> = {
  8: 'text-yellow-500', // S
  7: 'text-orange-500', // A
  6: 'text-orange-400', // B
  5: 'text-green-500', // C
  4: 'text-purple-500', // D to G
};

// --- Helpers ---

function buildDecodedRunner(data: SingleExportData): DecodedRunner {
  const partial = singleExportToRunnerState(data);
  const state = createRunnerState(partial);
  const displayInfo = state.outfitId ? getUmaDisplayInfo(state.outfitId) : null;
  const imageUrl = getUmaImageUrl(state.outfitId, state.randomMobId);

  let searchText = 'unknown character';
  if (displayInfo) searchText = `${displayInfo.name} ${displayInfo.outfit}`.toLowerCase();
  else if (state.outfitId) searchText = `character ${state.outfitId}`.toLowerCase();

  return { source: data, state, displayInfo, imageUrl, searchText };
}

function passesAptitudeFilters(source: SingleExportData, filters: AptitudeFilters): boolean {
  for (const key in filters) {
    const minGrade = filters[key as AptitudeSlotKey];
    if (minGrade != null && source[key as AptitudeSlotKey] < minGrade) return false;
  }
  return true;
}

function hasAnyAptitudeFilter(filters: AptitudeFilters): boolean {
  return Object.values(filters).some((v) => v != null);
}

// --- Filter UI ---

function AptitudeFilterGrid({
  filters,
  onChange,
}: Readonly<{
  filters: AptitudeFilters;
  onChange: (key: AptitudeSlotKey, value: number | null) => void;
}>) {
  return (
    <div className="flex flex-col gap-2">
      {APTITUDE_ROWS.map((row) => {
        return (
          <>
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-xs w-[52px] text-muted-foreground">{row.label}:</span>

              <div className="grid grid-cols-2 gap-2">
                {row.slots.map((slot) => {
                  const current = filters[slot.key];
                  const hasFilter = current !== undefined && current !== null;

                  return (
                    <div key={slot.key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-[42px]">{slot.name}</span>

                      <Select
                        value={hasFilter ? String(current) : 'any'}
                        onValueChange={(v) => onChange(slot.key, v === 'any' ? null : Number(v))}
                      >
                        <SelectTrigger size="sm" className="w-auto min-w-18 gap-1 text-xs">
                          <SelectValue>
                            {hasFilter ? encodingToAptitude(current) : 'All'}
                          </SelectValue>
                        </SelectTrigger>

                        <SelectContent className="text-xs">
                          <SelectItem value="any">All</SelectItem>

                          {MIN_GRADES.map((g) => (
                            <SelectItem key={g} value={String(g)}>
                              {encodingToAptitude(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />
          </>
        );
      })}
    </div>
  );
}

// --- Row ---

const MOBILE_ROW_HEIGHT = 130;
const DESKTOP_ROW_HEIGHT = 90;

function AptGrade({ value }: Readonly<{ value: number }>) {
  const grade = encodingToAptitude(value);
  const color = GRADE_COLORS[value] ?? 'text-muted-foreground';
  return <span className={`font-semibold ${color}`}>{grade}</span>;
}

const RunnerRow = memo(function RunnerRow({
  runner,
  index,
  isSelected,
  onToggle,
}: Readonly<{
  runner: DecodedRunner;
  index: number;
  isSelected: boolean;
  onToggle: (index: number) => void;
}>) {
  const s = runner.source;
  return (
    <button
      type="button"
      className={`flex items-center gap-3 p-2 border rounded-md text-left transition-colors cursor-pointer w-full ${
        isSelected ? 'border-primary/40 bg-primary/5' : 'opacity-50 hover:opacity-80'
      }`}
      onClick={() => onToggle(index)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(index)}
        onClick={(e) => e.stopPropagation()}
      />

      <img src={runner.imageUrl} alt="" className="w-10 h-10 rounded shrink-0" />

      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">
            {runner.displayInfo?.name ?? 'Unknown Character'}
          </span>

          {s.rank_score != null && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{s.rank_score}</span>
            </>
          )}
        </div>

        {runner.displayInfo && (
          <div className="text-xs text-muted-foreground truncate">{runner.displayInfo.outfit}</div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-0.5">
              <StatImage value={runner.state.speed} className="w-3 h-3" />
              <span>{runner.state.speed}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <StatImage value={runner.state.stamina} className="w-3 h-3" />
              <span>{runner.state.stamina}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <StatImage value={runner.state.power} className="w-3 h-3" />
              <span>{runner.state.power}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <StatImage value={runner.state.guts} className="w-3 h-3" />
              <span>{runner.state.guts}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <StatImage value={runner.state.wisdom} className="w-3 h-3" />
              <span>{runner.state.wisdom}</span>
            </div>
          </div>

          <Separator orientation="vertical" className="h-4 hidden md:block" />

          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            <AptGrade value={s.proper_ground_turf} />
            <AptGrade value={s.proper_ground_dirt} />

            <span className="text-muted-foreground">·</span>

            <AptGrade value={s.proper_distance_short} />
            <AptGrade value={s.proper_distance_mile} />
            <AptGrade value={s.proper_distance_middle} />
            <AptGrade value={s.proper_distance_long} />

            <span className="text-muted-foreground">·</span>
            <AptGrade value={s.proper_running_style_nige} />
            <AptGrade value={s.proper_running_style_senko} />
            <AptGrade value={s.proper_running_style_sashi} />
            <AptGrade value={s.proper_running_style_oikomi} />
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {runner.state.skills.length} skills
          </span>
        </div>
      </div>
    </button>
  );
});

// --- Dialog ---

export function RosterImportDialog({ open, onOpenChange }: Readonly<RosterImportDialogProps>) {
  const [code, setCode] = useState('');
  const [decoded, setDecoded] = useState<DecodedRunner[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [aptFilters, setAptFilters] = useState<AptitudeFilters>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      setDecoded(null);
      setError(false);
      setSelected(new Set());
      setSearch('');
      setAptFilters({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    decodeRoster(trimmed).then((result) => {
      if (cancelled) return;
      setLoading(false);

      if (!result) {
        setDecoded(null);
        setError(true);
        setSelected(new Set());
        return;
      }

      const runners = result.map(buildDecodedRunner);
      setDecoded(runners);
      setSelected(new Set(runners.map((_, i) => i)));
      setSearch('');
      setAptFilters({});
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const hasActiveAptFilter = hasAnyAptitudeFilter(aptFilters);

  const filtered = useMemo(() => {
    if (!decoded) return [];
    const query = search.toLowerCase().trim();

    return decoded.reduce<Array<{ runner: DecodedRunner; index: number }>>((acc, runner, i) => {
      if (query && !runner.searchText.includes(query)) return acc;
      if (hasActiveAptFilter && !passesAptitudeFilters(runner.source, aptFilters)) return acc;
      acc.push({ runner, index: i });
      return acc;
    }, []);
  }, [decoded, search, aptFilters, hasActiveAptFilter]);

  const filteredSelectedCount = useMemo(
    () => filtered.filter((f) => selected.has(f.index)).length,
    [filtered, selected],
  );

  const isMobile = useIsMobile();

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (isMobile ? MOBILE_ROW_HEIGHT : DESKTOP_ROW_HEIGHT),
    overscan: 15,
    getItemKey: (index) => {
      const item = filtered[index];
      return `${item.runner.source.card_id}-${item.index}`;
    },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setCode('');
        setDecoded(null);
        setError(false);
        setSelected(new Set());
        setSearch('');
        setAptFilters({});
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const toggleOne = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const { index } of filtered) next.add(index);
      return next;
    });
  }, [filtered]);

  const deselectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const { index } of filtered) next.delete(index);
      return next;
    });
  }, [filtered]);

  const setAptFilter = useCallback((key: AptitudeSlotKey, value: number | null) => {
    setAptFilters((prev) => {
      const updated = { ...prev };
      if (value == null) delete updated[key];
      else updated[key] = value;
      return updated;
    });
  }, []);

  const allFilteredSelected = filtered.length > 0 && filteredSelectedCount === filtered.length;
  const someFilteredSelected = filteredSelectedCount > 0 && !allFilteredSelected;
  const hasActiveFilters = !!search.trim() || hasActiveAptFilter;

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setAptFilters({});
  }, []);

  const handleImportSelected = useCallback(() => {
    if (!decoded || selected.size === 0) return;

    const now = Date.now();
    const newRunners: SavedRunner[] = [];
    let idx = 0;

    for (const i of selected) {
      const runner = decoded[i];
      newRunners.push({
        ...runner.state,
        notes: 'Imported from RosterView',
        id: `${now}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      });
      idx++;
    }

    useRunnerLibraryStore.setState((state) => ({
      runners: [...state.runners, ...newRunners],
    }));

    toast.success(
      `Imported ${newRunners.length} runner${newRunners.length === 1 ? '' : 's'} to library`,
    );
    handleOpenChange(false);
  }, [decoded, selected, handleOpenChange]);

  const hasResults = decoded && decoded.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-h-[calc(100dvh-2rem)] overflow-y-auto ${hasResults ? 'max-w-5xl!' : 'max-w-2xl!'}`}
      >
        <DialogHeader>
          <DialogTitle>Import Full Roster</DialogTitle>
          <DialogDescription>
            Paste an encoded roster string to import multiple runners at once.
          </DialogDescription>
        </DialogHeader>

        <div className={hasResults ? 'flex flex-col md:flex-row gap-4' : 'flex flex-col gap-3'}>
          {/* Left panel: input + filters */}
          <div className={`flex flex-col gap-3 ${hasResults ? 'md:w-80 md:shrink-0' : ''}`}>
            <textarea
              className="w-full h-24 p-3 rounded-md border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste RosterView roster code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            {loading && (
              <div className="p-3 text-sm text-muted-foreground text-center">Decoding roster…</div>
            )}

            {error && !loading && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                Invalid roster code. Please check the code and try again.
              </div>
            )}

            {hasResults && (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search characters..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <div className="hidden md:block">
                  <AptitudeFilterGrid filters={aptFilters} onChange={setAptFilter} />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllFiltered();
                      else deselectAllFiltered();
                    }}
                  />

                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => {
                      if (allFilteredSelected) deselectAllFiltered();
                      else selectAllFiltered();
                    }}
                  >
                    {hasActiveFilters
                      ? `Select all ${filtered.length} matching`
                      : `Select all ${decoded.length}`}
                  </button>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      onClick={clearAllFilters}
                    >
                      <X className="w-3 h-3" />
                      Clear filters
                    </button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  {selected.size}/{decoded.length} selected
                  {hasActiveFilters && ` · ${filtered.length} shown`}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: character list */}
          {hasResults && (
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div ref={scrollRef} className="overflow-y-auto max-h-96 md:max-h-none md:h-128">
                <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const { runner, index } = filtered[virtualRow.index];

                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 w-full"
                        style={{
                          height: isMobile ? MOBILE_ROW_HEIGHT : DESKTOP_ROW_HEIGHT,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <RunnerRow
                          runner={runner}
                          index={index}
                          isSelected={selected.has(index)}
                          onToggle={toggleOne}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {filtered.length === 0 && hasActiveFilters && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No characters match the current filters
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>

          {hasResults && (
            <Button onClick={handleImportSelected} disabled={selected.size === 0}>
              Import{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
