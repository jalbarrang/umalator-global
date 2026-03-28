import { useNavigate } from 'react-router';

import { Activity, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Import, Plus, Search, Trash2, Users, X } from 'lucide-react';
import type { SavedRunner } from '@/store/runner-library.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SavedRunnerCard } from '@/modules/runners/components/saved-runner-card';
import { useRunnerLibraryStore } from '@/store/runner-library.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { loadRunnerFromLibrary, showRunner } from '@/store/runners.store';
import { RosterImportDialog } from '@/modules/runners/share';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { aptitudeNames, strategyNames } from '@/lib/sunday-tools/runner/definitions';

function meetsMinGrade(actual: string, min: string): boolean {
  return aptitudeNames.indexOf(actual as any) <= aptitudeNames.indexOf(min as any);
}

// --- Virtual Grid ---

const CARD_HEIGHT = 230;
const GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + GAP;
const OVERSCAN = 3;

function getColumnCount(width: number): number {
  if (width >= 1536) return 4; // 2xl
  if (width >= 1024) return 3; // lg
  if (width >= 640) return 2; // sm
  return 1;
}

function VirtualRunnerGrid({
  items,
  selected,
  isSelecting,
  onToggleSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onLoadToSimulation,
}: Readonly<{
  items: SavedRunner[];
  selected: Set<string>;
  isSelecting: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (runner: SavedRunner) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLoadToSimulation: (runner: SavedRunner) => void;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        setColumnCount(getColumnCount(entry.contentRect.width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setContainerHeight(e.currentTarget.clientHeight);
  }, []);

  const { startIdx, endIdx, totalHeight } = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnCount);
    const totalHeight = totalRows * ROW_HEIGHT;
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    return {
      startIdx: startRow * columnCount,
      endIdx: Math.min(items.length, endRow * columnCount),
      totalHeight,
    };
  }, [items.length, columnCount, scrollTop, containerHeight]);

  const getStyle = useCallback(
    (index: number): React.CSSProperties => {
      const row = Math.floor(index / columnCount);
      const col = index % columnCount;
      return {
        position: 'absolute',
        top: row * ROW_HEIGHT,
        left: `calc(${col} * (100% / ${columnCount}) + ${col > 0 ? GAP / 2 : 0}px)`,
        width: `calc(100% / ${columnCount} - ${GAP}px)`,
        height: CARD_HEIGHT,
      };
    },
    [columnCount],
  );

  return (
    <div ref={containerRef} className="overflow-y-auto flex-1 min-h-0" onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative', padding: GAP / 2 }}>
        {items.slice(startIdx, endIdx).map((runner, i) => {
          const idx = startIdx + i;
          return (
            <div key={runner.id} style={getStyle(idx)} className="relative">
              {isSelecting && (
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => onToggleSelect(runner.id)}
                />
              )}
              <div
                className={`h-full ${
                  isSelecting && !selected.has(runner.id)
                    ? 'opacity-40 transition-opacity'
                    : 'transition-opacity'
                }`}
              >
                <SavedRunnerCard
                  runner={runner}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onLoadToSimulation={onLoadToSimulation}
                />
              </div>
              {isSelecting && (
                <div className="absolute top-3 left-3 z-20">
                  <Checkbox
                    checked={selected.has(runner.id)}
                    onCheckedChange={() => onToggleSelect(runner.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Filter Select ---

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: Readonly<{
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}>) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? 'all')}>
      <SelectTrigger size="sm" className="w-auto min-w-24 gap-1">
        <SelectValue>
          {value === 'all' ? label : (options.find((o) => o.value === value)?.label ?? label)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Main ---

const STRATEGY_OPTIONS = strategyNames.map((n) => ({ value: n, label: n }));

const APTITUDE_OPTIONS = aptitudeNames.map((g) => ({
  value: g,
  label: g,
}));

export function RunnersHome() {
  const navigate = useNavigate();
  const { runners, deleteRunner, deleteRunners, duplicateRunner } = useRunnerLibraryStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runnerToDelete, setRunnerToDelete] = useState<string | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [runnerToLoad, setRunnerToLoad] = useState<SavedRunner | null>(null);
  const [rosterImportOpen, setRosterImportOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const isSelecting = selected.size > 0;

  const searchIndex = useMemo(() => {
    return new Map(
      runners.map((r) => {
        const info = r.outfitId ? getUmaDisplayInfo(r.outfitId) : null;
        const text = [info?.name, info?.outfit, r.notes, r.outfitId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return [r.id, text];
      }),
    );
  }, [runners]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return runners.filter((r) => {
      if (query) {
        const text = searchIndex.get(r.id) ?? '';
        if (!text.includes(query)) return false;
      }
      if (strategyFilter !== 'all' && r.strategy !== strategyFilter) return false;
      if (distanceFilter !== 'all' && !meetsMinGrade(r.distanceAptitude, distanceFilter))
        return false;
      if (surfaceFilter !== 'all' && !meetsMinGrade(r.surfaceAptitude, surfaceFilter)) return false;
      return true;
    });
  }, [runners, search, strategyFilter, distanceFilter, surfaceFilter, searchIndex]);

  const hasActiveFilters =
    !!search.trim() ||
    strategyFilter !== 'all' ||
    distanceFilter !== 'all' ||
    surfaceFilter !== 'all';

  const filteredIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const filteredSelectedCount = useMemo(
    () => [...selected].filter((id) => filteredIds.has(id)).length,
    [selected, filteredIds],
  );
  const allFilteredSelected = filtered.length > 0 && filteredSelectedCount === filtered.length;
  const someFilteredSelected = filteredSelectedCount > 0 && !allFilteredSelected;

  const handleAddNew = () => navigate('/runners/new');
  const handleEdit = useCallback(
    (runner: SavedRunner) => navigate(`/runners/${runner.id}/edit`),
    [navigate],
  );

  const handleDeleteClick = useCallback((id: string) => {
    setRunnerToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = () => {
    if (runnerToDelete) {
      deleteRunner(runnerToDelete);
      setRunnerToDelete(null);
      selected.delete(runnerToDelete);
      setSelected(new Set(selected));
    }
    setDeleteDialogOpen(false);
  };

  const handleLoadClick = useCallback((runner: SavedRunner) => {
    setRunnerToLoad(runner);
    setLoadDialogOpen(true);
  }, []);

  const handleLoadToSlot = (slot: 'uma1' | 'uma2') => {
    if (runnerToLoad) {
      loadRunnerFromLibrary(slot, runnerToLoad);
      showRunner(slot);
      setLoadDialogOpen(false);
      setRunnerToLoad(null);
      navigate('/');
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filtered) next.add(r.id);
      return next;
    });
  }, [filtered]);

  const deselectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filtered) next.delete(r.id);
      return next;
    });
  }, [filtered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleBulkDeleteConfirm = () => {
    deleteRunners(selected);
    setSelected(new Set());
    setBulkDeleteDialogOpen(false);
  };

  const clearAllFilters = () => {
    setSearch('');
    setStrategyFilter('all');
    setDistanceFilter('all');
    setSurfaceFilter('all');
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setRosterImportOpen(true)}>
          <Import className="w-4 h-4 mr-2" />
          Import Roster
        </Button>
        <Activity mode={runners.length > 0 ? 'visible' : 'hidden'}>
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Runner
          </Button>
        </Activity>
      </div>

      {/* Search & Filters */}
      {runners.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search runners..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <FilterSelect
              label="Strategy"
              value={strategyFilter}
              onValueChange={setStrategyFilter}
              options={STRATEGY_OPTIONS}
            />
            <FilterSelect
              label="Distance"
              value={distanceFilter}
              onValueChange={setDistanceFilter}
              options={APTITUDE_OPTIONS}
            />
            <FilterSelect
              label="Surface"
              value={surfaceFilter}
              onValueChange={setSurfaceFilter}
              options={APTITUDE_OPTIONS}
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="icon-sm" onClick={clearAllFilters}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Selection toolbar */}
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
                ? `Select all ${filtered.length} shown`
                : `Select all ${runners.length}`}
            </button>

            {isSelecting && (
              <>
                <span className="text-xs text-muted-foreground">· {selected.size} selected</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete ({selected.size})
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={clearSelection}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {runners.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No runners saved</EmptyTitle>
            <EmptyDescription>Register your first runner to get started</EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Runner
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {runners.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <span className="text-sm">No runners match the current filters</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {filtered.length > 0 && (
        <VirtualRunnerGrid
          items={filtered}
          selected={selected}
          isSelecting={isSelecting}
          onToggleSelect={toggleSelect}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onDuplicate={duplicateRunner}
          onLoadToSimulation={handleLoadClick}
        />
      )}

      {/* Delete Confirmation Dialog (single) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Runner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this runner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Runners</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selected.size} runner
              {selected.size === 1 ? '' : 's'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm}>
              Delete {selected.size} Runner{selected.size === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load to Simulation Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Runner to Simulation</DialogTitle>
            <DialogDescription>
              Choose which simulation slot to load this runner into.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="h-20" onClick={() => handleLoadToSlot('uma1')}>
              <div className="text-center">
                <div className="text-lg font-semibold text-[#2a77c5]">Uma 1</div>
                <div className="text-sm text-muted-foreground">Blue slot</div>
              </div>
            </Button>
            <Button variant="outline" className="h-20" onClick={() => handleLoadToSlot('uma2')}>
              <div className="text-center">
                <div className="text-lg font-semibold text-[#c52a2a]">Uma 2</div>
                <div className="text-sm text-muted-foreground">Red slot</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RosterImportDialog open={rosterImportOpen} onOpenChange={setRosterImportOpen} />
    </div>
  );
}
