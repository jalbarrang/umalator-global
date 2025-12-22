import { Activity, useMemo } from 'react';
import { setDisplaying, useRaceStore } from '@simulation/stores/compare.store';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const ResultButtonGroups = () => {
  const { displaying, results } = useRaceStore();

  const mid = useMemo(() => {
    return Math.floor(results.length / 2);
  }, [results]);

  const mean = useMemo(() => {
    return results.reduce((a, b) => a + b, 0) / results.length;
  }, [results]);

  const median = useMemo(() => {
    return results.length % 2 === 0 ? (results[mid - 1] + results[mid]) / 2 : results[mid];
  }, [results, mid]);

  const resultsSummary = useMemo(() => {
    return {
      minrun: {
        label: 'Minimum',
        value: results[0].toFixed(2),
      },
      maxrun: {
        label: 'Maximum',
        value: results[results.length - 1].toFixed(2),
      },
      meanrun: {
        label: 'Mean',
        value: mean.toFixed(2),
      },
      medianrun: {
        label: 'Median',
        value: median.toFixed(2),
      },
    };
  }, [results, mean, median]);

  return (
    <>
      {/* Summary Statistics Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(resultsSummary).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setDisplaying(key)}
            className={cn(
              'flex flex-col items-center justify-center w-[120px] h-[100px] border border-border rounded-lg p-3 transition-all hover:bg-accent hover:border-primary',
              {
                'ring-2 ring-primary bg-primary border-primary text-primary-foreground hover:bg-primary/90':
                  displaying === key,
              },
            )}
            type="button"
          >
            <span className="text-xs text-foreground font-medium">{value.label}</span>
            <span className="text-2xl font-bold text-foreground">{value.value}</span>
            <span className="text-xs text-foreground">lengths</span>
          </button>
        ))}
      </div>

      {/* Results Explanation */}
      <div className="text-sm text-center text-foreground px-4">
        Negative numbers mean{' '}
        <strong className="text-[#2a77c5] dark:text-blue-500 font-bold">Umamusume 1</strong> is
        faster, positive numbers mean{' '}
        <strong className="text-[#c52a2a] dark:text-red-500 font-bold">Umamusume 2</strong> is
        faster.
      </div>
    </>
  );
};

export const SummaryTab = () => {
  const { firstUmaStats, staminaStats } = useRaceStore();

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Stats Summary */}
      <Activity mode={firstUmaStats || staminaStats ? 'visible' : 'hidden'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">Runner</TableHead>
              <Activity mode={firstUmaStats ? 'visible' : 'hidden'}>
                <TableHead className="font-mono">Final Leg 1st Place</TableHead>
              </Activity>
              <Activity mode={staminaStats ? 'visible' : 'hidden'}>
                <TableHead className="font-mono">Spurt Rate</TableHead>
                <TableHead className="font-mono">Survival Rate</TableHead>
              </Activity>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-[#2a77c5] dark:text-blue-500 font-bold">
                Uma 1
              </TableCell>
              <Activity mode={firstUmaStats ? 'visible' : 'hidden'}>
                <TableCell className="font-mono">
                  {firstUmaStats?.uma1.firstPlaceRate.toFixed(1)}%
                </TableCell>
              </Activity>

              <Activity mode={staminaStats ? 'visible' : 'hidden'}>
                <TableCell className="font-mono">
                  {staminaStats?.uma1.fullSpurtRate.toFixed(1)}%
                </TableCell>
                <TableCell className="font-mono">
                  {staminaStats?.uma1.staminaSurvivalRate.toFixed(1)}%
                </TableCell>
              </Activity>
            </TableRow>

            <TableRow>
              <TableCell className="font-mono text-[#c52a2a] dark:text-red-500 font-bold">
                Uma 2
              </TableCell>
              <TableCell className="font-mono">
                {firstUmaStats?.uma2.firstPlaceRate.toFixed(1)}%
              </TableCell>
              <Activity mode={staminaStats ? 'visible' : 'hidden'}>
                <TableCell className="font-mono">
                  {staminaStats?.uma2.fullSpurtRate.toFixed(1)}%
                </TableCell>
                <TableCell className="font-mono">
                  {staminaStats?.uma2.staminaSurvivalRate.toFixed(1)}%
                </TableCell>
              </Activity>
            </TableRow>
          </TableBody>
        </Table>
      </Activity>
    </div>
  );
};
