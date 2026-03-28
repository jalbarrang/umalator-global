import { memo, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { DetailStrip } from '@/modules/race-sim/components/DetailStrip';
import { EventLogPanel } from '@/modules/race-sim/components/EventLogPanel';
import { PlaybackBar } from '@/modules/race-sim/components/PlaybackBar';
import { SwimLanesView } from '@/modules/race-sim/components/SwimLanesView.tsx';
import { TrackGraphView } from '@/modules/race-sim/components/TrackGraphView.tsx';
import { useRaceSimContext } from '@/modules/race-sim/context';
import { getRunnerPositionsAtTick, usePlaybackStore } from '@/modules/race-sim/stores/playback.store';
import { computeViewport } from '@/modules/race-sim/utils/viewport';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { setZoomWindowMeters, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { useSettingsStore } from '@/store/settings.store';

type ReplayView = 'graph' | 'lanes';
type ZoomMode = 'full' | 'zoom';

function PlaybackTimeDisplay() {
  const currentTimeDisplay = usePlaybackStore((s) => s.currentTimeDisplay);
  const totalTimeDisplay = usePlaybackStore((s) => s.totalTimeDisplay);
  return (
    <p className="text-xs text-muted-foreground">
      {currentTimeDisplay} / {totalTimeDisplay}
    </p>
  );
}

function SamplePicker() {
  const roundCount = usePlaybackStore((s) => s.roundCount);
  const selectedRound = usePlaybackStore((s) => s.selectedRound);
  const setRound = usePlaybackStore((s) => s.setRound);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Sample</span>
      <ButtonGroup>
        {Array.from({ length: roundCount }, (_, index) => (
          <Button
            key={`sample-${index}`}
            type="button"
            size="xs"
            variant={index === selectedRound ? 'secondary' : 'ghost'}
            onClick={() => setRound(index)}
          >
            S{index + 1}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

const VisualizationPanel = memo(function VisualizationPanel({
  view,
  courseData,
  runnerNames,
  trackedRunnerIds,
  zoomMode,
  zoomWindowMeters,
}: {
  view: ReplayView;
  courseData: CourseData;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  zoomMode: ZoomMode;
  zoomWindowMeters: number;
}) {
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const results = usePlaybackStore((s) => s.results);
  const selectedRound = usePlaybackStore((s) => s.selectedRound);

  const viewport = useMemo(() => {
    if (zoomMode === 'full') {
      return { viewStart: 0, viewEnd: courseData.distance };
    }
    const positions = getRunnerPositionsAtTick(results, selectedRound, currentTick);
    return computeViewport(positions, courseData.distance, zoomWindowMeters);
  }, [zoomMode, zoomWindowMeters, results, selectedRound, currentTick, courseData.distance]);

  if (view === 'graph') {
    return (
      <TrackGraphView
        courseData={courseData}
        runnerNames={runnerNames}
        trackedRunnerIds={trackedRunnerIds}
        viewStart={viewport.viewStart}
        viewEnd={viewport.viewEnd}
        className="w-full"
      />
    );
  }

  return (
    <SwimLanesView
      courseData={courseData}
      runnerNames={runnerNames}
      trackedRunnerIds={trackedRunnerIds}
      viewStart={viewport.viewStart}
      viewEnd={viewport.viewEnd}
    />
  );
});

export function RaceSimRun() {
  const { error } = useRaceSimContext();

  const { results, runners, focusRunnerIndices, zoomWindowMeters } = useRaceSimStore(
    useShallow((state) => ({
      results: state.results,
      runners: state.runners,
      focusRunnerIndices: state.focusRunnerIndices,
      zoomWindowMeters: state.zoomWindowMeters,
    })),
  );

  const courseId = useSettingsStore((state) => state.courseId);
  const courseData = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const [view, setView] = useState<ReplayView>('graph');
  const [zoomMode, setZoomMode] = useState<ZoomMode>('full');

  const runnerNames = useMemo<Record<number, string>>(() => {
    const names: Record<number, string> = {};

    for (const [runnerId, runner] of runners.entries()) {
      const displayInfo = runner.outfitId ? getUmaDisplayInfo(runner.outfitId) : null;
      names[runnerId] = displayInfo?.name ?? `Runner ${runnerId + 1}`;
    }

    if (!results) {
      return names;
    }

    for (const finishOrder of results.finishOrders) {
      for (const entry of finishOrder) {
        if (entry.name) {
          names[entry.runnerId] = entry.name;
        }
      }
    }

    return names;
  }, [results, runners]);

  const trackedRunnerIds = useMemo(
    () => focusRunnerIndices.toSorted((left, right) => left - right),
    [focusRunnerIndices],
  );

  if (!results) {
    return (
      <div className="flex flex-1 min-w-0 flex-col gap-4 p-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Simulation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
          Run a simulation from the Assemble tab to see the replay here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-3 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Simulation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="flex min-h-0 flex-col rounded-lg border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">Sample Replay</p>
            <PlaybackTimeDisplay />
          </div>
          <SamplePicker />
        </header>

        <div className="flex items-center gap-1 border-b px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant={view === 'graph' ? 'secondary' : 'ghost'}
            onClick={() => setView('graph')}
          >
            Graph
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'lanes' ? 'secondary' : 'ghost'}
            onClick={() => setView('lanes')}
          >
            Lanes
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={zoomMode === 'zoom' ? 'ghost' : 'secondary'}
              onClick={() => {
                setZoomWindowMeters(100);
                setZoomMode('zoom');
              }}
            >
              Min
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                setZoomWindowMeters(zoomWindowMeters - 100);
                setZoomMode('zoom');
              }}
              disabled={zoomMode === 'zoom' && zoomWindowMeters <= 100}
              aria-label="Zoom in"
            >
              <Minus />
            </Button>
            <span className="min-w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">
              {zoomMode === 'zoom' ? `${zoomWindowMeters}m` : '100%'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                setZoomWindowMeters(zoomWindowMeters + 100);
                setZoomMode('zoom');
              }}
              disabled={zoomMode === 'zoom' && zoomWindowMeters >= 1000}
              aria-label="Zoom out"
            >
              <Plus />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={zoomMode === 'full' ? 'secondary' : 'ghost'}
              onClick={() => setZoomMode('full')}
            >
              100%
            </Button>
          </div>
        </div>

        <div className="grid min-h-[340px] gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <VisualizationPanel
            view={view}
            courseData={courseData}
            runnerNames={runnerNames}
            trackedRunnerIds={trackedRunnerIds}
            zoomMode={zoomMode}
            zoomWindowMeters={zoomWindowMeters}
          />

          <EventLogPanel
            trackedRunnerIds={trackedRunnerIds}
            runnerNames={runnerNames}
            className="h-[340px] lg:h-auto"
          />
        </div>
      </section>

      <DetailStrip
        trackedRunnerIds={trackedRunnerIds}
        runnerNames={runnerNames}
        courseDistance={courseData.distance}
      />

      <PlaybackBar />
    </div>
  );
}
