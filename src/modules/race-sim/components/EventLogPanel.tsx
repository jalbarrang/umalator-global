import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import type { RaceEvent, RaceEventKind } from '@/lib/sunday-tools/race-sim/race-event-log';
import { SIM_TO_DISPLAY_SECONDS, TICKS_PER_SECOND } from '@/modules/race-sim/constants';
import { usePlaybackStore } from '@/modules/race-sim/stores/playback.store';
import { formatTime } from '@/utils/time';

type EventFilter = 'all' | 'skills' | 'combat' | 'state';

type EventKindStyle = {
  label: string;
  dotClassName: string;
};

type EventLogPanelProps = {
  trackedRunnerIds?: number[];
  runnerNames?: Record<number, string>;
  className?: string;
};

type IndexedEvent = {
  key: string;
  index: number;
  event: RaceEvent;
};

const SKILL_KINDS = new Set<RaceEventKind>(['skill-activated']);
const COMBAT_KINDS = new Set<RaceEventKind>([
  'dueling-start',
  'dueling-end',
  'spot-struggle-start',
  'spot-struggle-end',
]);

const FILTERS: Array<{ id: EventFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'skills', label: 'Skills' },
  { id: 'combat', label: 'Combat' },
  { id: 'state', label: 'State' },
];

const EVENT_KIND_STYLES: Record<RaceEventKind, EventKindStyle> = {
  'skill-activated': { label: 'Skill', dotClassName: 'bg-sky-500' },
  rushed: { label: 'Rushed', dotClassName: 'bg-amber-500' },
  'dueling-start': { label: 'Duel', dotClassName: 'bg-rose-500' },
  'dueling-end': { label: 'Duel', dotClassName: 'bg-rose-400' },
  'spot-struggle-start': { label: 'Struggle', dotClassName: 'bg-purple-500' },
  'spot-struggle-end': { label: 'Struggle', dotClassName: 'bg-purple-400' },
  'last-spurt': { label: 'Spurt', dotClassName: 'bg-emerald-500' },
  'hp-out': { label: 'HP Out', dotClassName: 'bg-zinc-500' },
  finished: { label: 'Finished', dotClassName: 'bg-green-500' },
};

function toOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function getRunnerName(runnerId: number, runnerNames: Record<number, string>): string {
  return runnerNames[runnerId] ?? `Runner ${runnerId + 1}`;
}

function matchesFilter(kind: RaceEventKind, filter: EventFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'skills') {
    return SKILL_KINDS.has(kind);
  }
  if (filter === 'combat') {
    return COMBAT_KINDS.has(kind);
  }
  return !SKILL_KINDS.has(kind) && !COMBAT_KINDS.has(kind);
}

function getEventDescription(event: RaceEvent): string {
  switch (event.kind) {
    case 'skill-activated':
      return event.detail?.skillId
        ? `activated skill ${event.detail.skillId}`
        : 'activated a skill';
    case 'rushed':
      return 'entered rush';
    case 'dueling-start':
      return 'started dueling';
    case 'dueling-end':
      return 'ended duel';
    case 'spot-struggle-start':
      return 'entered a spot struggle';
    case 'spot-struggle-end':
      return 'ended a spot struggle';
    case 'last-spurt':
      return 'entered last spurt';
    case 'hp-out':
      return 'ran out of HP';
    case 'finished': {
      const parts = ['finished'];
      if (event.detail?.finishPlace) {
        parts.push(`(${toOrdinal(event.detail.finishPlace)})`);
      }
      if (event.detail?.finishTime !== undefined) {
        parts.push(`at ${formatTime(event.detail.finishTime * SIM_TO_DISPLAY_SECONDS)}`);
      }
      return parts.join(' ');
    }
    default:
      return event.kind;
  }
}

export function EventLogPanel(props: EventLogPanelProps) {
  const { trackedRunnerIds = [], runnerNames = {}, className } = props;
  const events = usePlaybackStore((s) => s.roundEvents);
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const cursorEventRef = useRef<HTMLDivElement | null>(null);

  const trackedRunnerIdSet = useMemo(() => new Set(trackedRunnerIds), [trackedRunnerIds]);

  const indexedEvents = useMemo<Array<IndexedEvent>>(() => {
    return events
      .map((event, index) => ({
        event,
        index,
        key: `${index}-${event.tick}-${event.runnerId}-${event.kind}`,
      }))
      .sort((left, right) => {
        if (left.event.tick !== right.event.tick) {
          return left.event.tick - right.event.tick;
        }
        return left.index - right.index;
      });
  }, [events]);

  const visibleEvents = useMemo(
    () =>
      indexedEvents.filter(
        (item) => item.event.tick <= currentTick && matchesFilter(item.event.kind, activeFilter),
      ),
    [indexedEvents, activeFilter, currentTick],
  );

  const cursorEventKey = useMemo(() => {
    if (visibleEvents.length === 0) {
      return null;
    }
    return visibleEvents[visibleEvents.length - 1].key;
  }, [visibleEvents]);

  useEffect(() => {
    cursorEventRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [cursorEventKey]);

  return (
    <div className={cn('flex max-h-[400px] min-h-0 flex-col rounded-lg border bg-card', className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Event Log</p>
          <p className="text-[11px] text-muted-foreground">
            {visibleEvents.length} events
          </p>
        </div>
        <ButtonGroup className="shrink-0">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              size="xs"
              variant={activeFilter === filter.id ? 'secondary' : 'ghost'}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {visibleEvents.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            No events for this filter.
          </div>
        ) : (
          <div className="space-y-1">
            {visibleEvents.map((item) => {
              const event = item.event;
              const isNearCursor = Math.abs(event.tick - currentTick) <= 2;
              const isTracked = trackedRunnerIdSet.has(event.runnerId);
              const style = EVENT_KIND_STYLES[event.kind];
              const otherRunnerIds = event.detail?.otherRunnerIds ?? [];
              const eventDescription = getEventDescription(event);

              return (
                <div
                  key={item.key}
                  ref={item.key === cursorEventKey ? cursorEventRef : null}
                  className={cn(
                    'grid grid-cols-[auto_1fr] items-start gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors',
                    isNearCursor ? 'border-primary/50 bg-primary/10' : 'border-transparent',
                  )}
                >
                  <span className={cn('mt-1 size-2 rounded-full', style.dotClassName)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        [{Math.max(0, event.position).toFixed(0)}m]
                      </span>
                      <span className={cn('font-medium', isTracked && 'text-primary')}>
                        {getRunnerName(event.runnerId, runnerNames)}
                      </span>
                      <span>{eventDescription}</span>
                      {otherRunnerIds.length > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          vs{' '}
                          {otherRunnerIds.map((runnerId, index) => (
                            <span key={`${item.key}-other-${runnerId}`}>
                              {index > 0 && ', '}
                              <span
                                className={cn(
                                  trackedRunnerIdSet.has(runnerId) && 'font-medium text-primary',
                                )}
                              >
                                {getRunnerName(runnerId, runnerNames)}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{style.label}</span>
                      <span className="font-mono">t{event.tick}</span>
                      <span>{formatTime((event.tick / TICKS_PER_SECOND) * SIM_TO_DISPLAY_SECONDS)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
