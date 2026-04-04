import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { PHASE_LABELS } from '@/modules/race-sim/constants';
import { usePlaybackStore } from '@/modules/race-sim/stores/playback.store';

type DetailStripProps = {
  trackedRunnerIds?: number[];
  runnerNames?: Record<number, string>;
  courseDistance?: number;
  className?: string;
};

type RunnerSnapshot = {
  runnerId: number;
  name: string;
  position: number | null;
  speed: number | null;
  hp: number | null;
  lane: number | null;
  phase: string;
  hasFocusData: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getValueAtTick(values: number[] | undefined, tick: number): number | null {
  if (!values || values.length === 0) {
    return null;
  }

  const index = clamp(Math.round(tick), 0, values.length - 1);
  return values[index] ?? null;
}

function getPhaseLabel(position: number | null, courseDistance?: number): string {
  if (position == null || !courseDistance || courseDistance <= 0) {
    return '--';
  }

  const clampedPosition = clamp(position, 0, courseDistance);
  const phase1Start = CourseHelpers.phaseStart(courseDistance, 1);
  const phase2Start = CourseHelpers.phaseStart(courseDistance, 2);
  const phase3Start = CourseHelpers.phaseStart(courseDistance, 3);

  if (clampedPosition < phase1Start) {
    return PHASE_LABELS[0];
  }
  if (clampedPosition < phase2Start) {
    return PHASE_LABELS[1];
  }
  if (clampedPosition < phase3Start) {
    return PHASE_LABELS[2];
  }
  return PHASE_LABELS[3];
}

function formatValue(value: number | null, digits = 1, suffix = ''): string {
  if (value == null || Number.isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function formatLane(lane: number | null): string {
  if (lane == null || Number.isNaN(lane)) {
    return '--';
  }
  return `${Math.round(lane)}`;
}

function toRunnerName(runnerId: number, runnerNames?: Record<number, string>): string {
  return runnerNames?.[runnerId] ?? `Runner ${runnerId + 1}`;
}

export const DetailStrip = memo<DetailStripProps>(function DetailStrip(props) {
  const { trackedRunnerIds = [], runnerNames = {}, courseDistance, className } = props;
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const roundData = usePlaybackStore((s) => s.roundData);

  const resolvedTrackedRunnerIds = useMemo(
    () => [...new Set(trackedRunnerIds)],
    [trackedRunnerIds],
  );

  const snapshots = useMemo<Array<RunnerSnapshot>>(() => {
    if (!roundData || resolvedTrackedRunnerIds.length === 0) {
      return [];
    }

    return resolvedTrackedRunnerIds.map((runnerId) => {
      const focusData = roundData.focusRunnerData[runnerId];
      const allPositions = roundData.allRunnerPositions[runnerId];

      const position = focusData
        ? getValueAtTick(focusData.position, currentTick)
        : getValueAtTick(allPositions, currentTick);
      const speed = focusData ? getValueAtTick(focusData.velocity, currentTick) : null;
      const hp = focusData ? getValueAtTick(focusData.hp, currentTick) : null;
      const lane = focusData ? getValueAtTick(focusData.currentLane, currentTick) : null;

      return {
        runnerId,
        name: toRunnerName(runnerId, runnerNames),
        position,
        speed,
        hp,
        lane,
        phase: getPhaseLabel(position, courseDistance),
        hasFocusData: Boolean(focusData),
      };
    });
  }, [courseDistance, currentTick, resolvedTrackedRunnerIds, roundData, runnerNames]);

  if (resolvedTrackedRunnerIds.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground',
          className,
        )}
      >
        Select at least one tracked runner to see per-tick details.
      </div>
    );
  }

  if (!roundData) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground',
          className,
        )}
      >
        No round data available for this sample.
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card px-2 py-2', className)}>
      <div className="flex gap-2 overflow-x-auto">
        {snapshots.map((snapshot) => (
          <section
            key={snapshot.runnerId}
            className="min-w-[240px] shrink-0 rounded-md border bg-background px-3 py-2"
          >
            <header className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{snapshot.name}</h3>
              <span className="text-xs text-muted-foreground">#{snapshot.runnerId + 1}</span>
            </header>

            <dl className="mt-2 grid grid-cols-5 gap-x-3 text-xs">
              <div className="min-w-10">
                <dt className="text-muted-foreground">Pos</dt>
                <dd className="font-medium">{formatValue(snapshot.position, 1, 'm')}</dd>
              </div>
              <div className="min-w-10">
                <dt className="text-muted-foreground">Speed</dt>
                <dd className="font-medium">{formatValue(snapshot.speed, 2, 'm/s')}</dd>
              </div>
              <div className="min-w-10">
                <dt className="text-muted-foreground">HP</dt>
                <dd className="font-medium">{formatValue(snapshot.hp, 1)}</dd>
              </div>
              <div className="min-w-10">
                <dt className="text-muted-foreground">Lane</dt>
                <dd className="font-medium">{formatLane(snapshot.lane)}</dd>
              </div>
              <div className="min-w-14">
                <dt className="text-muted-foreground">Phase</dt>
                <dd className="font-medium">{snapshot.phase}</dd>
              </div>
            </dl>

            {!snapshot.hasFocusData && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Position-only tracking for this runner in the selected sample.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
});
