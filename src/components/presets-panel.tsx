import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { deletePreset, usePresetStore } from '@/store/race/preset.store';
import {
  setCourseId,
  setRaceParams,
  setSelectedPresetId,
  useSettingsStore,
} from '@/store/settings.store';
import { createRaceConditions } from '@/utils/races';
import { EventType } from '@/modules/simulation/lib/course/definitions';
import { cn } from '@/lib/utils';
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

export const PresetsPanel = () => {
  const { presets } = usePresetStore();
  const selectedPresetId = useSettingsStore((state) => state.selectedPresetId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  const presetList = Object.values(presets).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

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

      // Clear selection if deleting the currently selected preset
      if (selectedPresetId === presetToDelete) {
        setSelectedPresetId(null);
      }

      toast.success(`Deleted preset: ${preset.name}`);
      setPresetToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Panel>
        <PanelHeader>
          <PanelTitle>Presets</PanelTitle>
        </PanelHeader>

        <PanelContent className="p-0">
          {presetList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">No presets saved yet.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Save your race settings as presets for quick access.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {presetList.map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    'flex items-center justify-between p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors',
                    selectedPresetId === preset.id && 'bg-accent',
                  )}
                  onClick={() => handleLoadPreset(preset.id)}
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="font-medium truncate">{preset.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{dayjs(preset.date).format('YYYY-MM-DD')}</span>
                      <span>•</span>
                      <span>{preset.type === EventType.CM ? 'CM' : 'LOH'}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(preset.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
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
    </>
  );
};
