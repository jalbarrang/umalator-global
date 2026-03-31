import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { StrategyName, type IStrategyName } from '@/lib/sunday-tools/runner/definitions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StrategyBadge } from '@/modules/race-sim/components/StrategyBadge';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { toggleFocusRunner, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';

type SortKey = 'gate' | 'name' | 'strategy' | 'avg' | 'best' | 'worst';
type SortDirection = 'asc' | 'desc';

type RunnerSummaryRow = {
  runnerId: number;
  gate: number;
  name: string;
  strategy: IStrategyName;
  samplePositions: Array<number | null>;
  avg: number;
  best: number;
  worst: number;
};

type FinishOrderTableProps = {};

function getPositionColor(position: number, total = 9): string {
  const ratio = (position - 1) / Math.max(total - 1, 1);
  const hue = (1 - ratio) * 120;
  return `hsl(${hue} 75% 45% / 0.22)`;
}

function compareValues(
  key: SortKey,
  direction: SortDirection,
  left: RunnerSummaryRow,
  right: RunnerSummaryRow,
): number {
  const sign = direction === 'asc' ? 1 : -1;

  if (key === 'name' || key === 'strategy') {
    return sign * left[key].localeCompare(right[key]);
  }

  return sign * (left[key] - right[key]);
}

export function FinishOrderTable(_props: FinishOrderTableProps) {
  const { results, isStale, focusRunnerIndices, runners } = useRaceSimStore(
    useShallow((state) => ({
      results: state.results,
      isStale: state.isStale,
      focusRunnerIndices: state.focusRunnerIndices,
      runners: state.runners,
    })),
  );

  const [sortKey, setSortKey] = useState<SortKey>('avg');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const rows = useMemo<Array<RunnerSummaryRow>>(() => {
    if (!results) {
      return [];
    }

    const sampleCount = results.finishOrders.length;
    const byRunnerId = new Map<number, RunnerSummaryRow>();

    for (const [runnerId, runner] of runners.entries()) {
      const displayInfo = runner.outfitId ? getUmaDisplayInfo(runner.outfitId) : null;
      byRunnerId.set(runnerId, {
        runnerId,
        gate: runnerId + 1,
        name: displayInfo?.name ?? `Runner ${runnerId + 1}`,
        strategy: runner.strategy,
        samplePositions: Array.from({ length: sampleCount }, () => null),
        avg: 0,
        best: 0,
        worst: 0,
      });
    }

    for (const [sampleIndex, finishOrder] of results.finishOrders.entries()) {
      for (const [finishIndex, finishEntry] of finishOrder.entries()) {
        const existing = byRunnerId.get(finishEntry.runnerId);
        if (!existing) {
          continue;
        }

        existing.samplePositions[sampleIndex] = finishIndex + 1;
        existing.strategy = StrategyName[finishEntry.strategy] ?? existing.strategy;
        if (finishEntry.name) {
          existing.name = finishEntry.name;
        }
      }
    }

    for (const row of byRunnerId.values()) {
      const positions = row.samplePositions.filter((value): value is number => value !== null);
      if (positions.length === 0) {
        continue;
      }

      row.avg = positions.reduce((sum, value) => sum + value, 0) / positions.length;
      row.best = Math.min(...positions);
      row.worst = Math.max(...positions);
    }

    return Array.from(byRunnerId.values());
  }, [results, runners]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => compareValues(sortKey, sortDirection, left, right));
  }, [rows, sortKey, sortDirection]);

  if (!results) {
    return null;
  }

  const handleSort = (key: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== key) {
        setSortDirection('asc');
        return key;
      }

      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return currentKey;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('rounded-lg border bg-card transition-opacity', isStale && 'opacity-60')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-14 z-30 w-48 bg-card">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => handleSort('name')}
                >
                  Runner
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="sticky left-62 z-30 w-36 bg-card">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => handleSort('strategy')}
                >
                  Strategy
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>

              {results.finishOrders.map((_, index) => (
                <TableHead key={`sample-${index}`} className="w-14 text-center">
                  S{index + 1}
                </TableHead>
              ))}

              <TableHead className="w-16 text-right">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => handleSort('avg')}
                >
                  Avg
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-16 text-right">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => handleSort('best')}
                >
                  Best
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-16 text-right">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => handleSort('worst')}
                >
                  Worst
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedRows.map((row) => {
              const isFocused = focusRunnerIndices.includes(row.runnerId);
              return (
                <TableRow
                  key={row.runnerId}
                  className={cn('cursor-pointer', isFocused && 'bg-primary/10')}
                  onClick={() => toggleFocusRunner(row.runnerId)}
                >
                  <TableCell className="sticky left-14 z-20 max-w-48 truncate bg-card font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="sticky left-62 z-20 bg-card">
                    <StrategyBadge strategy={row.strategy} />
                  </TableCell>

                  {row.samplePositions.map((position, sampleIndex) => (
                    <TableCell key={`${row.runnerId}-${sampleIndex}`} className="text-center">
                      {position === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span
                          className="inline-flex min-w-8 items-center justify-center rounded px-1.5 py-0.5 font-semibold"
                          style={{ backgroundColor: getPositionColor(position) }}
                        >
                          {position}
                        </span>
                      )}
                    </TableCell>
                  ))}

                  <TableCell className="text-right font-medium">{row.avg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.best || '-'}</TableCell>
                  <TableCell className="text-right">{row.worst || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
