import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GroundConditionName, SeasonName, WeatherName } from 'sunday-tools/course/definitions';
import type { RaceConditions } from '@/utils/races';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { trackDescription } from '@/modules/racetrack/labels';
import { useSettingsStore } from '@/store/settings.store';
import { parseRaceSimSnapshotJson, importRaceSimSnapshot } from './snapshot';
import { decodeRaceSimShareCode } from './share-code';
import { parseHakurakuRaceJson, isHakurakuReplayData } from './hakuraku';
import type { RaceSimSnapshot } from './types';

type ImportRaceSimDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImportSource = 'torena' | 'hakuraku';

const SOURCE_LABELS: Record<ImportSource, string> = {
  torena: 'Torena Sim',
  hakuraku: 'Hakuraku'
};

function courseLabel(courseId: number): string {
  try {
    return trackDescription({ courseid: courseId });
  } catch {
    return `Course ID ${courseId}`;
  }
}

function runnerName(outfitId: string): string {
  if (!outfitId) return '(no uma)';
  return getUmaDisplayInfo(outfitId)?.name ?? `${outfitId} (mob)`;
}

function conditionsLabel(racedef: RaceConditions): string {
  const ground = GroundConditionName[racedef.ground] ?? `Ground ${racedef.ground}`;
  const weather = WeatherName[racedef.weather] ?? `Weather ${racedef.weather}`;
  const season = SeasonName[racedef.season] ?? `Season ${racedef.season}`;
  return `${ground} · ${weather} · ${season}`;
}

export function ImportRaceSimDialog({ open, onOpenChange }: ImportRaceSimDialogProps) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<RaceSimSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ImportSource>('torena');
  const latestInputRef = useRef('');

  const parseForSource = useCallback((raw: string, activeSource: ImportSource) => {
    const trimmed = raw.trim();
    latestInputRef.current = trimmed;

    if (!trimmed) {
      setPreview(null);
      setError(null);
      return;
    }

    if (activeSource === 'hakuraku') {
      const hakuraku = parseHakurakuRaceJson(trimmed, {
        fallbackCourseId: useSettingsStore.getState().courseId
      });
      setPreview(hakuraku);
      if (hakuraku) {
        setError(null);
      } else if (isHakurakuReplayData(trimmed)) {
        setError(
          'This is a decoded race replay (frames & results), which has no runner stats or skills. Use a Hakuraku race file (with race_horse_data_array / <RaceHorse>) instead.'
        );
      } else {
        setError(
          "Couldn't read this as a Hakuraku race file. Expected a save containing race_horse_data_array or <RaceHorse> with runner stats."
        );
      }
      return;
    }

    // Torena Sim: native snapshot JSON, then an async share code.
    const parsed = parseRaceSimSnapshotJson(trimmed);
    if (parsed) {
      setPreview(parsed);
      setError(null);
      return;
    }

    void decodeRaceSimShareCode(trimmed).then((decoded) => {
      if (latestInputRef.current !== trimmed) return;
      setPreview(decoded);
      setError(
        decoded
          ? null
          : "Couldn't read this as a Torena Sim export or share code. Paste an exported .json or a share code, or switch the source to Hakuraku."
      );
    });
  }, []);

  const applyParsed = useCallback(
    (raw: string) => {
      setText(raw);
      parseForSource(raw, source);
    },
    [parseForSource, source]
  );

  const handleSourceChange = (next: ImportSource) => {
    setSource(next);
    parseForSource(text, next);
  };

  const reset = useCallback(() => {
    setText('');
    setPreview(null);
    setError(null);
    setSource('torena');
    latestInputRef.current = '';
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        applyParsed(result);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleApply = () => {
    if (!preview) return;
    importRaceSimSnapshot(preview);
    toast.success('Race configuration loaded');
    handleOpenChange(false);
  };

  const handleOpenFilePicker = () => {
    document.getElementById('race-sim-snapshot-file-input')?.click();
  };

  const selectedRunners = preview?.runners.filter((runner) => runner.outfitId) ?? [];
  const previewNames = selectedRunners.slice(0, 3).map((runner) => runnerName(runner.outfitId));
  const extraCount = selectedRunners.length - previewNames.length;

  const sourceDescription =
    source === 'hakuraku'
      ? 'Paste or drop a Hakuraku race file (.json). The full field, course, and race conditions are mapped into the simulator.'
      : 'Paste or drop a Torena Sim export (.json) or a share code. This replaces the full field, course, race conditions, samples, seed, and focus selection.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import race configuration</DialogTitle>
          <DialogDescription>{sourceDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Source</span>
          <ToggleGroup
            value={[source]}
            onValueChange={(value) => {
              const next = value[0] as ImportSource | undefined;
              if (next) handleSourceChange(next);
            }}
            variant="outline"
            className="w-full"
          >
            {(Object.keys(SOURCE_LABELS) as ImportSource[]).map((key) => (
              <ToggleGroupItem key={key} value={key} className="flex-1">
                {SOURCE_LABELS[key]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
          }`}
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={handleOpenFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenFilePicker();
            }
          }}
        >
          <Upload className="size-9 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drop a .json file or click to browse
          </span>
          <input
            id="race-sim-snapshot-file-input"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <textarea
          className="w-full min-h-[180px] p-3 rounded-md border bg-background font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={
            source === 'hakuraku' ? 'Or paste race file JSON here...' : 'Or paste JSON / share code here...'
          }
          value={text}
          onChange={(e) => applyParsed(e.target.value)}
          aria-invalid={error ? true : undefined}
        />

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {preview && (
          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Source: </span>
              <span className="font-medium">{SOURCE_LABELS[source]}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Course: </span>
              <span className="font-medium">{courseLabel(preview.courseId)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Conditions: </span>
              <span className="font-medium">{conditionsLabel(preview.racedef)}</span>
            </div>
            {source === 'hakuraku' && (
              <div className="text-xs text-muted-foreground">
                Time of day &amp; grade aren't included in race files — left at defaults.
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Field: </span>
              <span className="font-medium">{preview.runners.length} runners</span>
            </div>
            <div>
              <span className="text-muted-foreground">Samples: </span>
              <span className="font-medium">{preview.nsamples}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Seed: </span>
              <span className="font-medium">{preview.seed === null ? '(none)' : preview.seed}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Runners: </span>
              <span className="font-medium">
                {previewNames.length > 0
                  ? `${previewNames.join(', ')}${extraCount > 0 ? `, +${extraCount} more` : ''}`
                  : '(none selected)'}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!preview}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
