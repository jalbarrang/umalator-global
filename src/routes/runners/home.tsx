import { useNavigate } from 'react-router';

import { Activity, useState, useMemo, useCallback } from 'react';
import { Camera, Import, Plus, Search, Trash2, Users, X } from 'lucide-react';
import type { ISavedRunner } from '@/store/runner-library.store';
import { Button } from '@/components/ui/button';
import { FloatingButton } from '@/components/ui/fab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { useRunnerLibraryStore } from '@/store/runner-library.store';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { loadRunnerFromLibrary, showRunner } from '@/store/runners.store';
import { RosterImportDialog } from '@/modules/runners/roster/import-dialog';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { aptitudeNames, strategyNames } from '@/lib/sunday-tools/runner/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  meetsMinGrade,
  VirtualRunnerGrid
} from '@/modules/runners/components/runner-grid/runner-grid';

type IFilterSelectProps = {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
};

function FilterSelect(props: Readonly<IFilterSelectProps>) {
  const { label, value, onValueChange, options } = props;

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
  label: g
}));

export default function RosterHomePage() {
  const navigate = useNavigate();
  const { runners, addRunner, deleteRunner, deleteRunners, duplicateRunner } =
    useRunnerLibraryStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runnerToDelete, setRunnerToDelete] = useState<string | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [runnerToLoad, setRunnerToLoad] = useState<ISavedRunner | null>(null);
  const [rosterImportOpen, setRosterImportOpen] = useState(false);
  const [ocrImportOpen, setOcrImportOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const isSelecting = useMemo(() => selected.size > 0, [selected]);

  const isMobile = useIsMobile();

  const searchIndex = useMemo(() => {
    return new Map(
      runners.map((r) => {
        const info = r.outfitId ? getUmaDisplayInfo(r.outfitId) : null;
        const text = [info?.name, info?.outfit, r.notes, r.outfitId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return [r.id, text];
      })
    );
  }, [runners]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return runners.filter((r) => {
      if (query) {
        const text = searchIndex.get(r.id) ?? '';

        if (!text.includes(query)) {
          return false;
        }
      }

      if (strategyFilter !== 'all' && r.strategy !== strategyFilter) {
        return false;
      }

      if (distanceFilter !== 'all' && !meetsMinGrade(r.distanceAptitude, distanceFilter)) {
        return false;
      }

      if (surfaceFilter !== 'all' && !meetsMinGrade(r.surfaceAptitude, surfaceFilter)) {
        return false;
      }

      return true;
    });
  }, [runners, search, strategyFilter, distanceFilter, surfaceFilter, searchIndex]);

  const hasActiveFilters = useMemo(
    () =>
      !!search.trim() ||
      strategyFilter !== 'all' ||
      distanceFilter !== 'all' ||
      surfaceFilter !== 'all',
    [search, strategyFilter, distanceFilter, surfaceFilter]
  );

  const filteredIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const filteredSelectedCount = useMemo(
    () => [...selected].filter((id) => filteredIds.has(id)).length,
    [selected, filteredIds]
  );

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filteredSelectedCount === filtered.length,
    [filtered, filteredSelectedCount]
  );

  const handleAddNew = () => navigate('/runners/new');

  const handleEdit = useCallback(
    (runner: ISavedRunner) => navigate(`/runners/${runner.id}/edit`),
    [navigate]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setRunnerToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (runnerToDelete) {
      deleteRunner(runnerToDelete);
      setRunnerToDelete(null);
      selected.delete(runnerToDelete);
      setSelected(new Set(selected));
    }
    setDeleteDialogOpen(false);
  }, [deleteRunner, selected, runnerToDelete]);

  const handleLoadClick = useCallback((runner: ISavedRunner) => {
    setRunnerToLoad(runner);
    setLoadDialogOpen(true);
  }, []);

  const handleLoadToSlot = useCallback(
    (slot: 'uma1' | 'uma2') => {
      if (!runnerToLoad) return;

      loadRunnerFromLibrary(slot, runnerToLoad);
      showRunner(slot);
      setLoadDialogOpen(false);
      setRunnerToLoad(null);
      navigate('/');
    },
    [navigate, runnerToLoad]
  );

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

  const handleBulkDeleteConfirm = useCallback(() => {
    deleteRunners(selected);
    setSelected(new Set());
    setBulkDeleteDialogOpen(false);
  }, [selected, deleteRunners]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setStrategyFilter('all');
    setDistanceFilter('all');
    setSurfaceFilter('all');
  }, []);

  const handleOcrImportApply = useCallback(
    (data: ExtractedUmaData) => {
      const baseRunnerState = createRunnerState();
      const extractedSkills = data.skills.map((skill) => skill.id);
      const uniqueSkillId = data.outfitId ? getUniqueSkillForByUmaId(data.outfitId) : null;
      const skills = uniqueSkillId
        ? [uniqueSkillId, ...extractedSkills.filter((skillId) => skillId !== uniqueSkillId)]
        : extractedSkills;

      const runnerState = {
        ...baseRunnerState,
        outfitId: data.outfitId ?? baseRunnerState.outfitId,
        speed: data.speed ?? baseRunnerState.speed,
        stamina: data.stamina ?? baseRunnerState.stamina,
        power: data.power ?? baseRunnerState.power,
        guts: data.guts ?? baseRunnerState.guts,
        wisdom: data.wisdom ?? baseRunnerState.wisdom,
        distanceAptitude: data.distanceAptitude ?? baseRunnerState.distanceAptitude,
        surfaceAptitude: data.surfaceAptitude ?? baseRunnerState.surfaceAptitude,
        strategyAptitude: data.strategyAptitude ?? baseRunnerState.strategyAptitude,
        strategy:
          data.strategy && strategyNames.includes(data.strategy)
            ? data.strategy
            : baseRunnerState.strategy,
        skills
      };

      addRunner({
        ...runnerState,
        notes: data.outfitName || data.umaName || 'Imported Runner'
      });
    },
    [addRunner]
  );

  return (
    <div className="flex flex-col flex-1 p-4 gap-2 min-h-0 overflow-hidden">
      <div className="flex md:flex-row-reverse md:items-center md:justify-between">
        {/* [Desktop] Actions */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            <Button size="default" variant="outline" onClick={() => setRosterImportOpen(true)}>
              <Import className="size-4" />
              Import Roster
            </Button>

            <Button size="default" variant="outline" onClick={() => setOcrImportOpen(true)}>
              <Camera className="size-4" />
              Import Screenshot
            </Button>

            <Activity mode={runners.length > 0 ? 'visible' : 'hidden'}>
              <Button size="default" onClick={handleAddNew}>
                <Plus className="size-4" />
                Add Runner
              </Button>
            </Activity>
          </div>
        )}

        <div className="flex w-full md:w-fit flex-col md:flex-row md:items-center gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="Search runners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex gap-2">
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
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon-sm" onClick={clearAllFilters}>
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* [Mobile] Actions -> FAB */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <FloatingButton aria-label="Runner actions">
                  <Plus />
                </FloatingButton>
              }
            />
            <DropdownMenuContent side="top" align="end" sideOffset={8}>
              <DropdownMenuItem onClick={handleAddNew}>
                <Plus className="size-4" />
                Add Runner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRosterImportOpen(true)}>
                <Import className="size-4" />
                Import Roster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOcrImportOpen(true)}>
                <Camera className="size-4" />
                Import Screenshot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* [Desktop] Search & Filters */}
      {runners.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Selection toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (allFilteredSelected) {
                  deselectAllFiltered();
                } else {
                  selectAllFiltered();
                }
              }}
            >
              {allFilteredSelected
                ? `Deselect all ${filtered.length}`
                : `Select all ${runners.length}`}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={selected.size === 0}
            >
              <Trash2 className="size-4" />
              Delete ({selected.size})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selected.size === 0}
            >
              Cancel
            </Button>

            {isSelecting && (
              <span className="text-xs text-muted-foreground"> {selected.size} selected</span>
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOcrImportOpen(true)}>
                <Camera className="size-4 mr-2" />
                Import Screenshot
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="size-4 mr-2" />
                Add Runner
              </Button>
            </div>
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
            <DialogTitle>Load Runner to Compare pages</DialogTitle>
            <DialogDescription>Choose which Uma slot to load this runner into.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-25" onClick={() => handleLoadToSlot('uma1')}>
              <div className="text-center">
                <div className="text-lg font-semibold text-[#2a77c5]">Uma 1</div>
              </div>
            </Button>
            <Button variant="outline" className="h-25" onClick={() => handleLoadToSlot('uma2')}>
              <div className="text-center">
                <div className="text-lg font-semibold text-[#c52a2a]">Uma 2</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RosterImportDialog open={rosterImportOpen} onOpenChange={setRosterImportOpen} />

      <OcrImportDialog
        open={ocrImportOpen}
        onOpenChange={setOcrImportOpen}
        onApply={handleOcrImportApply}
      />
    </div>
  );
}
