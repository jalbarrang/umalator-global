import { memo, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useShallow } from 'zustand/shallow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { DetailStrip } from '@/modules/race-sim/components/DetailStrip';
import { EventLogPanel } from '@/modules/race-sim/components/EventLogPanel';
import { PlaybackBar } from '@/modules/race-sim/components/PlaybackBar';
import { TrackTopDownView } from '@/modules/race-sim/components/track-view/top-down/TrackTopDownView';
import { useRaceSimContext } from '@/modules/race-sim/context';
import { SIM_TO_DISPLAY_SECONDS, TICKS_PER_SECOND } from '@/modules/race-sim/constants';
import {
  getRunnerPositionsAtTick,
  pause,
  play,
  seekTo,
  setRound,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { computeViewport } from '@/modules/race-sim/utils/viewport';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { setZoomWindowMeters, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { useSettingsStore } from '@/store/settings.store';

type ZoomMode = 'full' | 'zoom';

function SamplePicker() {
  const { roundCount, selectedRound } = usePlaybackStore(
    useShallow((s) => ({
      roundCount: s.roundCount,
      selectedRound: s.selectedRound,
    })),
  );

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

type VisualizationPanelProps = {
  courseData: CourseData;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
  zoomMode: ZoomMode;
  zoomWindowMeters: number;
};

const VisualizationPanel = memo(function VisualizationPanel(props: VisualizationPanelProps) {
  const { courseData, runnerNames, trackedRunnerIds, zoomMode, zoomWindowMeters } = props;

  const { currentTick, results, selectedRound } = usePlaybackStore(
    useShallow((s) => ({
      currentTick: s.currentTick,
      results: s.results,
      selectedRound: s.selectedRound,
    })),
  );

  const viewport = useMemo(() => {
    if (zoomMode === 'full') {
      return { viewStart: 0, viewEnd: courseData.distance };
    }
    const positions = getRunnerPositionsAtTick(results, selectedRound, currentTick);
    return computeViewport(positions, courseData.distance, zoomWindowMeters);
  }, [zoomMode, zoomWindowMeters, results, selectedRound, currentTick, courseData.distance]);

  return (
    <TrackTopDownView
      className="min-h-0 min-w-0 flex-1"
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

  const { courseId } = useSettingsStore(useShallow((state) => ({ courseId: state.courseId })));
  const courseData = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

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

  useHotkeys('space', (e) => {
    e.preventDefault();
    const { isPlaying } = usePlaybackStore.getState();
    if (isPlaying) pause();
    else play();
  });

  // YouTube-style ±5s in *display* time. Must use SIM_TO_DISPLAY_SECONDS (includes the tick
  // multiplier); dividing only by SIM_TO_DISPLAY_RATIO would ~double the skip (~10s on the HUD).
  const playbackSkipDisplaySeconds = 5;
  const jumpTicks = Math.max(
    1,
    Math.round((playbackSkipDisplaySeconds * TICKS_PER_SECOND) / SIM_TO_DISPLAY_SECONDS),
  );

  useHotkeys(
    'j',
    (e) => {
      e.preventDefault();
      const { currentTick } = usePlaybackStore.getState();
      seekTo(currentTick - jumpTicks);
    },
    { preventDefault: true },
  );

  useHotkeys(
    'l',
    (e) => {
      e.preventDefault();
      const { currentTick } = usePlaybackStore.getState();
      seekTo(currentTick + jumpTicks);
    },
    { preventDefault: true },
  );

  if (!results) {
    return (
      <div className="flex flex-col p-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Simulation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
          Run a simulation from the Configure tab to see the replay here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Simulation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-card rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">Sample Replay</p>
          </div>

          <SamplePicker />
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b">
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

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex flex-col flex-1 min-h-0 min-w-0 md:overflow-hidden">
            <VisualizationPanel
              courseData={courseData}
              runnerNames={runnerNames}
              trackedRunnerIds={trackedRunnerIds}
              zoomMode={zoomMode}
              zoomWindowMeters={zoomWindowMeters}
            />
          </div>

          <EventLogPanel
            className="flex w-full min-h-0 flex-col border-l md:h-full md:w-[300px] md:shrink-0"
            trackedRunnerIds={trackedRunnerIds}
            runnerNames={runnerNames}
          />
        </div>
      </div>

      <DetailStrip
        className="shrink-0"
        trackedRunnerIds={trackedRunnerIds}
        runnerNames={runnerNames}
        courseDistance={courseData.distance}
      />

      <div className="shrink-0">
        <PlaybackBar />
      </div>
    </div>
  );
}
