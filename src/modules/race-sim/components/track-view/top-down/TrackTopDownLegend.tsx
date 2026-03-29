import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import {
  getRunnerLanesAtTick,
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { useShallow } from 'zustand/shallow';
import { buildRunnerOrderRows, formatGap, formatLaneMeters } from './utils';

type TrackTopDownLegendProps = {
  courseData: CourseData;
  runnerNames: Record<number, string>;
  trackedRunnerIds: number[];
};

export const TrackTopDownLegend = memo(function TrackTopDownLegend(
  props: TrackTopDownLegendProps,
) {
  const { courseData, runnerNames, trackedRunnerIds } = props;
  const { results, selectedRound, currentTick } = usePlaybackStore(
    useShallow((s) => ({
      results: s.results,
      selectedRound: s.selectedRound,
      currentTick: s.currentTick,
    })),
  );

  const runnerPositions = useMemo(
    () => getRunnerPositionsAtTick(results, selectedRound, currentTick),
    [results, selectedRound, currentTick],
  );
  const runnerLanes = useMemo(
    () => getRunnerLanesAtTick(results, selectedRound, currentTick),
    [results, selectedRound, currentTick],
  );

  const rows = useMemo(
    () =>
      buildRunnerOrderRows(
        courseData.distance,
        runnerNames,
        runnerPositions,
        runnerLanes,
        trackedRunnerIds,
      ),
    [runnerNames, runnerPositions, runnerLanes, trackedRunnerIds, courseData.distance],
  );

  return (
    <div className="flex flex-col gap-2 w-full md:w-[200px] border-l">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground p-3 border-b">
        Order
      </div>

      <ul className="flex flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((row) => (
          <li
            key={row.runnerId}
            className={cn(
              'flex items-baseline justify-between gap-2 rounded-md px-2',
              row.isTracked && 'bg-primary/10',
            )}
          >
            <div className="flex flex-col flex-1">
              <span className="font-mono text-xs text-muted-foreground">{row.rank}.</span>{' '}
              <span
                className={cn('font-medium', row.isTracked ? 'text-primary' : 'text-foreground')}
              >
                {row.name}
              </span>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                inner +{formatLaneMeters(row.lane)}
              </div>
            </div>

            <div className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {formatGap(row.gapFromLeader)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});
