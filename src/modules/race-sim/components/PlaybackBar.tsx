import { memo, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  pause,
  play,
  type PlaybackSpeed,
  SPEED_OPTIONS,
  seekTo,
  setSpeed,
  stepBack,
  stepForward,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { useShallow } from 'zustand/shallow';

function PlaybackSlider() {
  const { currentTick, totalTicks, currentTimeDisplay, totalTimeDisplay } = usePlaybackStore(
    useShallow((state) => ({
      currentTick: state.currentTick,
      totalTicks: state.totalTicks,
      currentTimeDisplay: state.currentTimeDisplay,
      totalTimeDisplay: state.totalTimeDisplay,
    })),
  );

  const [internalTick, setInternalTick] = useState<number[]>(() => {
    return [currentTick];
  });

  const hasTimeline = totalTicks > 0;
  const maxTick = Math.max(totalTicks, 1);

  useEffect(() => {
    setInternalTick([currentTick]);
  }, [currentTick]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-mono text-muted-foreground tabular-nums">
        {currentTimeDisplay}
      </div>
      <div className="flex min-w-0 flex-1 items-center px-2">
        <Slider
          min={0}
          max={maxTick}
          value={internalTick}
          onValueChange={(values) => {
            if (!Array.isArray(values)) {
              // Values is a number
              const nextTick = values as number;
              seekTo(nextTick);
              return;
            }

            const nextTick = values[0];
            seekTo(nextTick);
          }}
          disabled={!hasTimeline}
          className="w-full"
          aria-label="Playback position"
        />
      </div>
      <div className="text-xs font-mono text-muted-foreground tabular-nums">{totalTimeDisplay}</div>
    </div>
  );
}

const PlaybackTransport = memo(function PlaybackTransport() {
  const { totalTicks, isPlaying, speed } = usePlaybackStore(
    useShallow((s) => ({
      totalTicks: s.totalTicks,
      isPlaying: s.isPlaying,
      speed: s.speed,
    })),
  );

  const { isAtStart, isAtEnd } = usePlaybackStore(
    useShallow((s) => ({
      isAtStart: s.currentTick <= 0,
      isAtEnd: s.currentTick >= s.totalTicks,
    })),
  );

  const hasTimeline = totalTicks > 0;

  const handleSpeedChange = (value: number | null) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const selected = parsed as PlaybackSpeed;
    if (!(SPEED_OPTIONS as readonly number[]).includes(selected)) return;
    setSpeed(selected);
  };

  const speedOptions = useMemo(() => [...SPEED_OPTIONS], []);

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => seekTo(0)}
          disabled={!hasTimeline || isAtStart}
          aria-label="Skip to start"
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={stepBack}
          disabled={!hasTimeline || isAtStart}
          aria-label="Step back"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          onClick={isPlaying ? pause : play}
          disabled={!hasTimeline}
          aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={stepForward}
          disabled={!hasTimeline || isAtEnd}
          aria-label="Step forward"
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => seekTo(totalTicks)}
          disabled={!hasTimeline || isAtEnd}
          aria-label="Skip to end"
        >
          <ChevronsRight />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed</span>
        <Select value={speed} onValueChange={handleSpeedChange}>
          <SelectTrigger size="sm" className="w-20 font-mono tabular-nums">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {speedOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

export function PlaybackBar() {
  return (
    <div className="rounded-lg border bg-card p-3">
      <PlaybackSlider />
      <PlaybackTransport />
    </div>
  );
}
