import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import { GripVertical, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  deletePreset,
  deletePresets,
  reorderPresets,
  resetPresets,
  usePresetStore,
} from '@/store/race/preset.store';
import {
  setCourseId,
  setRaceParams,
  setSelectedPresetId,
  useSettingsStore,
} from '@/store/settings.store';
import { createRaceConditions } from '@/utils/races';
import { cn } from '@/lib/utils';
import {
  EventType,
  GroundConditionName,
  SeasonName,
  WeatherName,
  type IGroundCondition,
  type ISeason,
  type IWeather,
} from '@/lib/sunday-tools/course/definitions';
import { getCourseById, getDistanceCategory } from '@/modules/racetrack/courses';
import { trackDescription } from '@/modules/racetrack/labels';
import i18n from '@/i18n';
import type { RacePreset } from '@/utils/races';

const PresetCourseDetails = ({ preset }: { preset: RacePreset }) => {
  const details = useMemo(() => {
    try {
      const course = getCourseById(preset.courseId);
      const trackName = i18n.t(`tracknames.${course.raceTrackId}`);
      const courseLabel = trackDescription({ courseid: preset.courseId });
      return `${trackName} \u00b7 ${courseLabel}`;
    } catch {
      return `Course ${preset.courseId}`;
    }
  }, [preset.courseId]);

  const conditions = useMemo(() => {
    const parts: string[] = [];
    parts.push(GroundConditionName[preset.ground as IGroundCondition] ?? `Ground ${preset.ground}`);
    parts.push(SeasonName[preset.season as ISeason] ?? `Season ${preset.season}`);
    parts.push(WeatherName[preset.weather as IWeather] ?? `Weather ${preset.weather}`);
    return parts.join(' \u00b7 ');
  }, [preset.ground, preset.season, preset.weather]);

  return (
    <div className="text-[11px] text-muted-foreground/70 leading-tight">
      <div className="truncate">{details}</div>
      <div className="truncate">{conditions}</div>
    </div>
  );
};

type SortablePresetItemProps = {
  preset: RacePreset;
  isSelected: boolean;
  isChecked: boolean;
  selectionMode: boolean;
  onLoad: (id: string) => void;
  onDeleteClick: (id: string, e: React.MouseEvent) => void;
  onToggleCheck: (id: string) => void;
};

const SortablePresetItem = ({
  preset,
  isSelected,
  isChecked,
  selectionMode,
  onLoad,
  onDeleteClick,
  onToggleCheck,
}: SortablePresetItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preset.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors',
        isSelected && 'bg-accent',
        isDragging && 'z-10 bg-accent/80 shadow-md',
      )}
      onClick={() => {
        if (selectionMode) {
          onToggleCheck(preset.id);
        } else {
          onLoad(preset.id);
        }
      }}
    >
      <button
        type="button"
        className="touch-none cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {selectionMode && (
        <Checkbox checked={isChecked} onClick={(e) => e.stopPropagation()} className="shrink-0" />
      )}

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="font-medium truncate">{preset.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{dayjs(preset.date).format('YYYY-MM-DD')}</span>
          <span>&middot;</span>
          <span>{preset.type === EventType.CM ? 'CM' : 'LOH'}</span>
        </div>
        <PresetCourseDetails preset={preset} />
      </div>

      {!selectionMode && (
        <Button variant="destructive" size="icon" onClick={(e) => onDeleteClick(preset.id, e)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

type FilterSurface = 'all' | 'turf' | 'dirt';
type FilterDistanceType = 'all' | 'sprint' | 'mile' | 'medium' | 'long';
type FilterRaceType = 'all' | 'cm' | 'loh';

function getPresetSurface(preset: RacePreset): 'turf' | 'dirt' | null {
  try {
    const course = getCourseById(preset.courseId);
    return course.surface === 1 ? 'turf' : 'dirt';
  } catch {
    return null;
  }
}

function getPresetDistanceCategory(preset: RacePreset): string | null {
  try {
    const course = getCourseById(preset.courseId);
    return getDistanceCategory(course.distance);
  } catch {
    return null;
  }
}

export const PresetsPanel = () => {
  const { presets, presetOrder } = usePresetStore();
  const selectedPresetId = useSettingsStore((state) => state.selectedPresetId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const [filterSurface, setFilterSurface] = useState<FilterSurface>('all');
  const [filterDistance, setFilterDistance] = useState<FilterDistanceType>('all');
  const [filterRaceType, setFilterRaceType] = useState<FilterRaceType>('all');

  const allPresets = useMemo(() => {
    const ordered = presetOrder.map((id) => presets[id]).filter((p): p is RacePreset => p != null);
    const orderSet = new Set(presetOrder);
    const extra = Object.values(presets).filter((p) => !orderSet.has(p.id));
    return [...ordered, ...extra];
  }, [presets, presetOrder]);

  const hasActiveFilter =
    filterSurface !== 'all' || filterDistance !== 'all' || filterRaceType !== 'all';

  const presetList = useMemo(() => {
    if (!hasActiveFilter) return allPresets;
    return allPresets.filter((p) => {
      if (filterRaceType !== 'all') {
        const isMatch =
          filterRaceType === 'cm' ? p.type === EventType.CM : p.type === EventType.LOH;
        if (!isMatch) return false;
      }
      if (filterSurface !== 'all') {
        const surface = getPresetSurface(p);
        if (surface !== filterSurface) return false;
      }
      if (filterDistance !== 'all') {
        const cat = getPresetDistanceCategory(p);
        if (cat !== filterDistance) return false;
      }
      return true;
    });
  }, [allPresets, hasActiveFilter, filterSurface, filterDistance, filterRaceType]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLoadPreset = (presetId: string) => {
    const preset = presets[presetId];
    setCourseId(preset.courseId);
    setRaceParams(
      createRaceConditions({
        ground: preset.ground,
        weather: preset.weather,
        season: preset.season,
        time: preset.time,
      }),
    );
    setSelectedPresetId(presetId);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleDeleteClick = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetToDelete(presetId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (presetToDelete) {
      const preset = presets[presetToDelete];
      deletePreset(presetToDelete);

      if (selectedPresetId === presetToDelete) {
        setSelectedPresetId(null);
      }

      toast.success(`Deleted preset: ${preset.name}`);
      setPresetToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = presetList.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderPresets(arrayMove(ids, oldIndex, newIndex));
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (checkedIds.size === presetList.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(presetList.map((p) => p.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setCheckedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (checkedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    const ids = [...checkedIds];
    deletePresets(ids);

    if (selectedPresetId && checkedIds.has(selectedPresetId)) {
      setSelectedPresetId(null);
    }

    toast.success(`Deleted ${ids.length} preset${ids.length > 1 ? 's' : ''}`);
    setBulkDeleteDialogOpen(false);
    exitSelectionMode();
  };

  return (
    <>
      <Panel>
        <PanelHeader>
          <div className="flex items-center justify-between">
            <PanelTitle>Presets</PanelTitle>
            {presetList.length > 0 && (
              <div className="flex items-center gap-1">
                {selectionMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleToggleSelectAll}>
                      {checkedIds.size === presetList.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={checkedIds.size === 0}
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-8 w-8 mr-1" />
                      Delete ({checkedIds.size})
                    </Button>
                    <Button variant="outline" size="sm" onClick={exitSelectionMode}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(true)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                      Bulk actions
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </PanelHeader>

        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Select value={filterSurface} onValueChange={(v) => setFilterSurface(v as FilterSurface)}>
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Surface</SelectItem>
              <SelectItem value="turf">Turf</SelectItem>
              <SelectItem value="dirt">Dirt</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterDistance}
            onValueChange={(v) => setFilterDistance(v as FilterDistanceType)}
          >
            <SelectTrigger size="sm" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Distance</SelectItem>
              <SelectItem value="sprint">Sprint</SelectItem>
              <SelectItem value="mile">Mile</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="long">Long</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterRaceType}
            onValueChange={(v) => setFilterRaceType(v as FilterRaceType)}
          >
            <SelectTrigger size="sm" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type</SelectItem>
              <SelectItem value="cm">CM</SelectItem>
              <SelectItem value="loh">LOH</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => {
                setFilterSurface('all');
                setFilterDistance('all');
                setFilterRaceType('all');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <PanelContent className="p-0">
          {presetList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {hasActiveFilter ? (
                <p className="text-sm text-muted-foreground">
                  No presets match the current filters.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No presets saved yet.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Save your race settings as presets for quick access.
                  </p>
                </>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={presetList.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col">
                  {presetList.map((preset) => (
                    <SortablePresetItem
                      key={preset.id}
                      preset={preset}
                      isSelected={selectedPresetId === preset.id}
                      isChecked={checkedIds.has(preset.id)}
                      selectionMode={selectionMode}
                      onLoad={handleLoadPreset}
                      onDeleteClick={handleDeleteClick}
                      onToggleCheck={handleToggleCheck}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </PanelContent>
      </Panel>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {presetToDelete ? presets[presetToDelete]?.name : ''}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {checkedIds.size} Preset{checkedIds.size > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {checkedIds.size} selected preset
              {checkedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Presets</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all presets with the bundled CM defaults. Any custom presets you
              created will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetPresets();
                setResetDialogOpen(false);
                toast.success('Presets reset to defaults');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
