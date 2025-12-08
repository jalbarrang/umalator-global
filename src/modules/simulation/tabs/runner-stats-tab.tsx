import { useRaceStore } from '@simulation/stores/compare.store';
import { useWitVariance } from '@/store/settings.store';
import { formatTime } from '@/utils/time';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Activity } from 'react';
import { Timer } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const RunnerStatsTab = () => {
  const { chartData, rushedStats, leadCompetitionStats, staminaStats } =
    useRaceStore();
  const { allowRushedUma2 } = useWitVariance();

  if (!chartData) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Timer />
          </EmptyMedia>
          <EmptyTitle>No Runner Statistics</EmptyTitle>
          <EmptyDescription>
            Run a simulation to compare finish times, top speeds, and
            performance metrics.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const uma1TopSpeed = chartData.v[0].reduce((a, b) => Math.max(a, b), 0);
  const uma2TopSpeed = chartData.v[1].reduce((a, b) => Math.max(a, b), 0);

  const uma1FinishTime = chartData.t[0][chartData.t[0].length - 1] * 1.18;
  const uma2FinishTime = chartData.t[1][chartData.t[1].length - 1] * 1.18;

  return (
    <div className="flex flex-col gap-6">
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uma 1 */}
        <div className="bg-background border-2 rounded-lg overflow-hidden">
          <div className="bg-[#2a77c5] dark:bg-blue-500 text-white text-center py-2 font-bold">
            Umamusume 1
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="font-medium">Time to finish</TableHead>
                <TableCell className="font-mono">
                  {formatTime(uma1FinishTime)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableHead className="font-medium">Start delay</TableHead>
                <TableCell className="font-mono">
                  {chartData.sdly[0].toFixed(4)} s
                </TableCell>
              </TableRow>

              <TableRow>
                <TableHead className="font-medium">Top speed</TableHead>
                <TableCell className="font-mono">
                  {uma1TopSpeed.toFixed(2)} m/s
                </TableCell>
              </TableRow>

              <Activity
                mode={rushedStats && allowRushedUma2 ? 'visible' : 'hidden'}
              >
                <TableRow>
                  <TableHead className="font-medium">
                    Rushed frequency
                  </TableHead>
                  <TableCell className="font-mono">
                    {rushedStats.uma1.frequency > 0
                      ? `${rushedStats.uma1.frequency.toFixed(
                          1,
                        )}% (${rushedStats.uma1.mean.toFixed(1)}m)`
                      : '0%'}
                  </TableCell>
                </TableRow>
              </Activity>

              <Activity mode={leadCompetitionStats ? 'visible' : 'hidden'}>
                <TableRow>
                  <TableHead className="font-medium">
                    Spot Struggle frequency
                  </TableHead>
                  <TableCell className="font-mono">
                    {leadCompetitionStats.uma1.frequency > 0
                      ? `${leadCompetitionStats.uma1.frequency.toFixed(1)}%`
                      : '0%'}
                  </TableCell>
                </TableRow>
              </Activity>

              <Activity mode={staminaStats ? 'visible' : 'hidden'}>
                <TableRow>
                  <TableHead className="font-medium">Spurt Rate</TableHead>
                  <TableCell className="font-mono">
                    {staminaStats.uma1.fullSpurtRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHead className="font-medium">Survival Rate</TableHead>
                  <TableCell className="font-mono">
                    {staminaStats.uma1.staminaSurvivalRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </Activity>
            </TableBody>
          </Table>
        </div>

        {/* Uma 2 */}
        <div className="bg-background border-2 rounded-lg overflow-hidden">
          <div className="bg-[#c52a2a] dark:bg-red-500 text-white text-center py-2 font-bold">
            Umamusume 2
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="font-medium">Time to finish</TableHead>
                <TableCell className="font-mono">
                  {formatTime(uma2FinishTime)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableHead className="font-medium">Start delay</TableHead>
                <TableCell className="font-mono">
                  {chartData.sdly[1].toFixed(4)} s
                </TableCell>
              </TableRow>

              <TableRow>
                <TableHead className="font-medium">Top speed</TableHead>
                <TableCell className="font-mono">
                  {uma2TopSpeed.toFixed(2)} m/s
                </TableCell>
              </TableRow>

              <Activity
                mode={rushedStats && allowRushedUma2 ? 'visible' : 'hidden'}
              >
                <TableRow>
                  <TableHead className="font-medium">
                    Rushed frequency
                  </TableHead>
                  <TableCell className="font-mono">
                    {rushedStats.uma2.frequency > 0
                      ? `${rushedStats.uma2.frequency.toFixed(
                          1,
                        )}% (${rushedStats.uma2.mean.toFixed(1)}m)`
                      : '0%'}
                  </TableCell>
                </TableRow>
              </Activity>

              <Activity mode={leadCompetitionStats ? 'visible' : 'hidden'}>
                <TableRow>
                  <TableHead className="font-medium">
                    Spot Struggle frequency
                  </TableHead>
                  <TableCell className="font-mono">
                    {leadCompetitionStats.uma2.frequency > 0
                      ? `${leadCompetitionStats.uma2.frequency.toFixed(1)}%`
                      : '0%'}
                  </TableCell>
                </TableRow>
              </Activity>

              <Activity mode={staminaStats ? 'visible' : 'hidden'}>
                <TableRow>
                  <TableHead className="font-medium">Spurt Rate</TableHead>
                  <TableCell className="font-mono">
                    {staminaStats.uma2.fullSpurtRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHead className="font-medium">Survival Rate</TableHead>
                  <TableCell className="font-mono">
                    {staminaStats.uma2.staminaSurvivalRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </Activity>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Comparison Summary */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Quick Comparison
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center p-3 bg-background border-2 rounded-lg">
            <span className="text-foreground mb-1">Time Difference</span>
            <span
              className={cn('text-lg font-bold', {
                'text-[#2a77c5] dark:text-blue-500':
                  uma1FinishTime < uma2FinishTime,
                'text-[#c52a2a] dark:text-red-500':
                  uma1FinishTime > uma2FinishTime,
              })}
            >
              {Math.abs(uma1FinishTime - uma2FinishTime).toFixed(3)}s
            </span>
            <span className="text-xs text-foreground">
              <Activity
                mode={uma1FinishTime < uma2FinishTime ? 'visible' : 'hidden'}
              >
                Uma 1 faster
              </Activity>

              <Activity
                mode={uma1FinishTime > uma2FinishTime ? 'visible' : 'hidden'}
              >
                Uma 2 faster
              </Activity>

              <Activity
                mode={uma1FinishTime === uma2FinishTime ? 'visible' : 'hidden'}
              >
                Uma 1 and Uma 2 finished at the same time
              </Activity>
            </span>
          </div>
          <div className="flex flex-col items-center p-3 bg-background border-2 rounded-lg">
            <span className="text-foreground mb-1">Speed Advantage</span>
            <span
              className={cn('text-lg font-bold', {
                'text-[#2a77c5] dark:text-blue-500':
                  uma1TopSpeed > uma2TopSpeed,
                'text-[#c52a2a] dark:text-red-500': uma1TopSpeed < uma2TopSpeed,
              })}
            >
              {Math.abs(uma1TopSpeed - uma2TopSpeed).toFixed(2)} m/s
            </span>
            <span className="text-xs text-foreground">
              {uma1TopSpeed > uma2TopSpeed
                ? 'Uma 1 higher top speed'
                : 'Uma 2 higher top speed'}
            </span>
          </div>
          <div className="flex flex-col items-center p-3 bg-background border-2 rounded-lg">
            <span className="text-foreground mb-1">Start Delay Diff</span>
            <span
              className={cn('text-lg font-bold', {
                'text-[#2a77c5] dark:text-blue-500':
                  chartData.sdly[0] < chartData.sdly[1],
                'text-[#c52a2a] dark:text-red-500':
                  chartData.sdly[0] > chartData.sdly[1],
              })}
            >
              {Math.abs(chartData.sdly[0] - chartData.sdly[1]).toFixed(4)}s
            </span>
            <span className="text-xs text-foreground">
              {chartData.sdly[0] < chartData.sdly[1]
                ? 'Uma 1 faster start'
                : 'Uma 2 faster start'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
