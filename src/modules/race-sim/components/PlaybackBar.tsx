import { memo, useCallback, useMemo } from 'react';
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
  type PlaybackSpeed,
  SPEED_OPTIONS,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';

function PlaybackSlider() {
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const totalTicks = usePlaybackStore((s) => s.totalTicks);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const currentTimeDisplay = usePlaybackStore((s) => s.currentTimeDisplay);
  const totalTimeDisplay = usePlaybackStore((s) => s.totalTimeDisplay);

  const hasTimeline = totalTicks > 0;
  const safeTick = Math.min(currentTick, totalTicks);
  const maxTick = Math.max(totalTicks, 1);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-mono text-muted-foreground tabular-nums">
        {currentTimeDisplay}
      </div>
      <div className="flex min-w-0 flex-1 items-center px-2">
        <Slider
          min={0}
          max={maxTick}
          value={[safeTick]}
          onValueChange={(values) => {
            if (!Array.isArray(values)) return;
            seekTo(values[0]);
          }}
          disabled={!hasTimeline}
          className="w-full"
          aria-label="Playback position"
        />
      </div>
      <div className="text-xs font-mono text-muted-foreground tabular-nums">
        {totalTimeDisplay}
      </div>
    </div>
  );
}

const PlaybackTransport = memo(function PlaybackTransport() {
  const totalTicks = usePlaybackStore((s) => s.totalTicks);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const speed = usePlaybackStore((s) => s.speed);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const stepForward = usePlaybackStore((s) => s.stepForward);
  const stepBack = usePlaybackStore((s) => s.stepBack);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const isAtStart = usePlaybackStore((s) => s.currentTick <= 0);
  const isAtEnd = usePlaybackStore((s) => s.currentTick >= s.totalTicks);

  const hasTimeline = totalTicks > 0;

  const handleSpeedChange = useCallback(
    (value: number | null) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return;
      const selected = parsed as PlaybackSpeed;
      if (!(SPEED_OPTIONS as readonly number[]).includes(selected)) return;
      setSpeed(selected);
    },
    [setSpeed],
  );

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
