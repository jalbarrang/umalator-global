import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { simToDisplaySeconds } from '@/modules/race-sim/constants';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { formatBashinWithRaw } from '@/utils/bashin';
import { formatTime } from '@/utils/time';

const BASHIN_METERS = 2.5;

type SummaryRow = {
  runnerId: number;
  name: string;
  averagePosition: number;
  winRate: number;
  averageFinishTime: number;
  averageGapBashin: number;
};

function toOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export function RaceResultsSummary() {
  const { results, focusRunnerIndices } = useRaceSimStore(
    useShallow((state) => ({
      results: state.results,
      focusRunnerIndices: state.focusRunnerIndices,
    })),
  );

  const rows = useMemo<Array<SummaryRow>>(() => {
    if (!results || results.finishOrders.length === 0) {
      return [];
    }

    const byRunnerId = new Map<
      number,
      {
        runnerId: number;
        name: string;
        sampleCount: number;
        totalPosition: number;
        totalWins: number;
        totalFinishTime: number;
        totalGapBashin: number;
      }
    >();

    for (const finishOrder of results.finishOrders) {
      if (finishOrder.length === 0) {
        continue;
      }

      const firstPlaceDistance = finishOrder[0].finishPosition;

      for (const [finishIndex, finishEntry] of finishOrder.entries()) {
        let row = byRunnerId.get(finishEntry.runnerId);
        if (!row) {
          row = {
            runnerId: finishEntry.runnerId,
            name: finishEntry.name,
            sampleCount: 0,
            totalPosition: 0,
            totalWins: 0,
            totalFinishTime: 0,
            totalGapBashin: 0,
          };
          byRunnerId.set(finishEntry.runnerId, row);
        }

        if (finishEntry.name) {
          row.name = finishEntry.name;
        }

        row.sampleCount += 1;
        row.totalPosition += finishIndex + 1;
        row.totalWins += finishIndex === 0 ? 1 : 0;
        row.totalFinishTime += finishEntry.finishTime;

        // finishPosition is in meters; convert the average gap to bashin for display.
        const gapMeters = Math.max(0, firstPlaceDistance - finishEntry.finishPosition);
        row.totalGapBashin += gapMeters / BASHIN_METERS;
      }
    }

    return Array.from(byRunnerId.values())
      .filter((row) => row.sampleCount > 0)
      .map((row) => ({
        runnerId: row.runnerId,
        name: row.name,
        averagePosition: row.totalPosition / row.sampleCount,
        winRate: (row.totalWins / row.sampleCount) * 100,
        averageFinishTime: row.totalFinishTime / row.sampleCount,
        averageGapBashin: row.totalGapBashin / row.sampleCount,
      }))
      .sort((left, right) => {
        if (left.averagePosition !== right.averagePosition) {
          return left.averagePosition - right.averagePosition;
        }
        if (left.winRate !== right.winRate) {
          return right.winRate - left.winRate;
        }
        return left.name.localeCompare(right.name);
      });
  }, [results]);

  if (!results) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 font-mono">Place</TableHead>
            <TableHead className="font-mono">Runner</TableHead>
            <TableHead className="w-24 text-right font-mono">Win %</TableHead>
            <TableHead className="w-32 text-right font-mono">Avg Time</TableHead>
            <TableHead className="w-32 text-right font-mono">Avg Gap</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const isTracked = focusRunnerIndices.includes(row.runnerId);
            const isFirst = index === 0;

            return (
              <TableRow key={row.runnerId} className={cn(isTracked && 'bg-primary/10')}>
                <TableCell className="font-mono">{toOrdinal(index + 1)}</TableCell>
                <TableCell
                  className={cn(
                    'font-mono',
                    isFirst && 'font-bold',
                    isTracked && 'font-semibold text-primary',
                  )}
                >
                  {row.name}
                </TableCell>
                <TableCell className="text-right font-mono">{row.winRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-mono">
                  {formatTime(simToDisplaySeconds(row.averageFinishTime))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {isFirst ? '--' : formatBashinWithRaw(row.averageGapBashin)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
