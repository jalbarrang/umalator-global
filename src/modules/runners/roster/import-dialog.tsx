import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { IAptitudeFilters, IAptitudeSlotKey, IDecodedRunner } from './types';
import { decodeRoster } from '../share/roster-encoding';
import { buildDecodedRunner, hasAnyAptitudeFilter, passesAptitudeFilters } from './helpers';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ISavedRunner, useRunnerLibraryStore } from '@/store/runner-library.store';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AptitudeFilterGrid } from './components/filter-grid';
import { Checkbox } from '@/components/ui/checkbox';
import { RunnerRow } from './components/runner-row';
import { DESKTOP_ROW_HEIGHT, MOBILE_ROW_HEIGHT } from './constants';

type IRosterImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImportStateBase = {
  selected: Set<number>;
  search: string;
  aptFilters: IAptitudeFilters;
};

type ImportState =
  | (ImportStateBase & {
      status: 'idle';
      runners: null;
    })
  | (ImportStateBase & {
      status: 'loading';
      runners: IDecodedRunner[] | null;
    })
  | (ImportStateBase & {
      status: 'error';
      runners: null;
    })
  | (ImportStateBase & {
      status: 'decoded';
      runners: IDecodedRunner[];
    });

type ImportAction =
  | { type: 'reset' }
  | { type: 'decode:start' }
  | { type: 'decode:success'; runners: IDecodedRunner[] }
  | { type: 'decode:error' }
  | { type: 'search:set'; value: string }
  | { type: 'filters:clear' }
  | { type: 'selection:toggle'; index: number }
  | { type: 'selection:select-many'; indices: number[] }
  | { type: 'selection:deselect-many'; indices: number[] }
  | {
      type: 'filters:aptitude:set';
      key: IAptitudeSlotKey;
      value: number | null;
    };

function createInitialImportState(): ImportState {
  return {
    status: 'idle',
    runners: null,
    selected: new Set(),
    search: '',
    aptFilters: {}
  };
}

function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'reset':
      return createInitialImportState();
    case 'decode:start':
      return {
        ...state,
        status: 'loading'
      };
    case 'decode:success':
      return {
        status: 'decoded',
        runners: action.runners,
        selected: new Set(action.runners.map((_, index) => index)),
        search: '',
        aptFilters: {}
      };
    case 'decode:error':
      return {
        status: 'error',
        runners: null,
        selected: new Set(),
        search: state.search,
        aptFilters: state.aptFilters
      };
    case 'search:set':
      return {
        ...state,
        search: action.value
      };
    case 'filters:clear':
      return {
        ...state,
        search: '',
        aptFilters: {}
      };
    case 'selection:toggle': {
      const nextSelected = new Set(state.selected);

      if (nextSelected.has(action.index)) {
        nextSelected.delete(action.index);
      } else {
        nextSelected.add(action.index);
      }

      return {
        ...state,
        selected: nextSelected
      };
    }
    case 'selection:select-many': {
      const nextSelected = new Set(state.selected);

      for (const index of action.indices) {
        nextSelected.add(index);
      }

      return {
        ...state,
        selected: nextSelected
      };
    }
    case 'selection:deselect-many': {
      const nextSelected = new Set(state.selected);

      for (const index of action.indices) {
        nextSelected.delete(index);
      }

      return {
        ...state,
        selected: nextSelected
      };
    }
    case 'filters:aptitude:set': {
      const nextFilters = { ...state.aptFilters };

      if (action.value == null) {
        delete nextFilters[action.key];
      } else {
        nextFilters[action.key] = action.value;
      }

      return {
        ...state,
        aptFilters: nextFilters
      };
    }
    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}

export function RosterImportDialog({ open, onOpenChange }: Readonly<IRosterImportDialogProps>) {
  const [code, setCode] = useState('');
  const [importState, dispatch] = useReducer(importReducer, undefined, createInitialImportState);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      dispatch({ type: 'reset' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'decode:start' });

    decodeRoster(trimmed).then((result) => {
      if (cancelled) return;

      if (!result) {
        dispatch({ type: 'decode:error' });
        return;
      }

      dispatch({
        type: 'decode:success',
        runners: result.map(buildDecodedRunner)
      });
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const decoded = importState.runners;
  const error = importState.status === 'error';
  const loading = importState.status === 'loading';
  const selected = importState.selected;
  const search = importState.search;
  const aptFilters = importState.aptFilters;

  const hasActiveAptFilter = hasAnyAptitudeFilter(aptFilters);

  const filtered = useMemo(() => {
    if (!decoded) return [];
    const query = search.toLowerCase().trim();

    return decoded.reduce<Array<{ runner: IDecodedRunner; index: number }>>((acc, runner, i) => {
      if (query && !runner.searchText.includes(query)) return acc;
      if (hasActiveAptFilter && !passesAptitudeFilters(runner.source, aptFilters)) return acc;
      acc.push({ runner, index: i });
      return acc;
    }, []);
  }, [decoded, search, aptFilters, hasActiveAptFilter]);

  const filteredSelectedCount = useMemo(
    () => filtered.filter((f) => selected.has(f.index)).length,
    [filtered, selected]
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
    }
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setCode('');
        dispatch({ type: 'reset' });
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const toggleOne = useCallback((index: number) => {
    dispatch({ type: 'selection:toggle', index });
  }, []);

  const selectAllFiltered = useCallback(() => {
    dispatch({
      type: 'selection:select-many',
      indices: filtered.map(({ index }) => index)
    });
  }, [filtered]);

  const deselectAllFiltered = useCallback(() => {
    dispatch({
      type: 'selection:deselect-many',
      indices: filtered.map(({ index }) => index)
    });
  }, [filtered]);

  const setAptFilter = useCallback((key: IAptitudeSlotKey, value: number | null) => {
    dispatch({ type: 'filters:aptitude:set', key, value });
  }, []);

  const allFilteredSelected = filtered.length > 0 && filteredSelectedCount === filtered.length;
  const someFilteredSelected = filteredSelectedCount > 0 && !allFilteredSelected;
  const hasActiveFilters = !!search.trim() || hasActiveAptFilter;

  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'filters:clear' });
  }, []);

  const handleImportSelected = useCallback(() => {
    if (!decoded || selected.size === 0) return;

    const now = Date.now();
    const newRunners: ISavedRunner[] = [];
    let idx = 0;

    for (const i of selected) {
      const runner = decoded[i];
      newRunners.push({
        ...runner.state,
        notes: 'Imported from RosterView',
        id: `${now}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: now,
        updatedAt: now
      });
      idx++;
    }

    useRunnerLibraryStore.setState((state) => ({
      runners: [...state.runners, ...newRunners]
    }));

    toast.success(
      `Imported ${newRunners.length} runner${newRunners.length === 1 ? '' : 's'} to library`
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
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search characters..."
                    value={search}
                    onChange={(e) => dispatch({ type: 'search:set', value: e.target.value })}
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
                      <X className="size-3" />
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
                          transform: `translateY(${virtualRow.start}px)`
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
