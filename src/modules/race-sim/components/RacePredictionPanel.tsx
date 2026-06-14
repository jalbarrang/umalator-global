import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { getTeamStyle } from '@/modules/race-sim/team-colors';
import { useRoomPrediction } from '@/modules/race-sim/predictions/use-room-prediction';

function runnerLabel(outfitId: string, fallback: string): string {
  if (!outfitId) return fallback;
  return getUmaDisplayInfo(outfitId)?.name ?? `${outfitId} (mob)`;
}

export function RacePredictionPanel() {
  const runners = useRaceSimStore(useShallow((state) => state.runners));
  const prediction = useRoomPrediction();

  // Map a 1-based post (gate, else field order) back to its runner.
  const runnerByPost = useMemo(() => {
    const map = new Map<number, { outfitId: string; team?: number | null; index: number }>();
    for (const [index, runner] of runners.entries()) {
      const post = typeof runner.gate === 'number' ? runner.gate : index + 1;
      map.set(post, { outfitId: runner.outfitId, team: runner.team, index });
    }
    return map;
  }, [runners]);

  if (prediction.status === 'unsupported') {
    return null;
  }

  if (prediction.status === 'incompatible') {
    return (
      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Trophy className="size-3.5" />
          Win prediction
        </div>
        <p className="mt-1">
          Win prediction needs a Champions Meeting room: 3 teams of 3 runners each. Assign
          teams (and import gates) to enable it.
        </p>
      </div>
    );
  }

  const rows = [...prediction.predictions].sort((a, b) => a.rank - b.rank);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Trophy className="size-3.5" />
          Win prediction
        </div>
        {prediction.status === 'loading' && (
          <span className="text-[10px] text-muted-foreground">Calculating…</span>
        )}
        {prediction.status === 'error' && (
          <span className="text-[10px] text-destructive">{prediction.error}</span>
        )}
      </div>

      <div className="divide-y">
        {rows.map((row) => {
          const runner = runnerByPost.get(row.frameOrder);
          const name = runner
            ? runnerLabel(runner.outfitId, `Gate ${row.frameOrder}`)
            : `Gate ${row.frameOrder}`;
          const team = runner?.team ?? row.teamId;
          const teamStyle = typeof team === 'number' ? getTeamStyle(team) : null;
          const pct = (row.probability * 100).toFixed(1);

          return (
            <div key={row.frameOrder} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
                {row.rank}
              </span>
              {teamStyle && (
                <span className={cn('size-2 shrink-0 rounded-full', teamStyle.dotClass)} />
              )}
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                Gate {row.frameOrder}
              </span>
              <div className="flex w-24 shrink-0 items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, row.probability * 100)}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs tabular-nums">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
