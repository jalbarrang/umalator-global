import { setDisplaying, useRaceStore } from '@/store/race/store';
import { useWitVariance } from '@/store/settings.store';
import { formatTime } from '@/utils/time';
import { useMemo } from 'react';
import { getSkillNameById } from '@/modules/skills/utils';
import { cn } from '@/lib/utils';
import { Histogram } from '../Histogram';
import { Table, TableBody, TableCell, TableHead, TableRow } from '../ui/table';

type SkillPosition = {
  name: string;
  positions: [number, number];
};

export const ComparePane = () => {
  const {
    displaying,
    results,
    firstUmaStats,
    staminaStats,
    chartData,
    rushedStats,
    leadCompetitionStats,
  } = useRaceStore();

  const { allowRushedUma2 } = useWitVariance();

  const mid = Math.floor(results.length / 2);
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const median =
    results.length % 2 == 0
      ? (results[mid - 1] + results[mid]) / 2
      : results[mid];

  const skillPositionsRunnerA: SkillPosition[] = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.sk) return [];
    if (!chartData.sk[0]) return [];

    const skillPositions: SkillPosition[] = [];
    for (const [id, positions] of chartData.sk[0].entries()) {
      const skillName = getSkillNameById(id);

      positions.forEach(([start, end]) => {
        skillPositions.push({
          name: skillName[0],
          positions: [start, end],
        });
      });
    }

    return skillPositions;
  }, [chartData]);

  const skillPositionsRunnerB: SkillPosition[] = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.sk) return [];
    if (!chartData.sk[1]) return [];

    const skillPositions: SkillPosition[] = [];

    for (const [id, positions] of chartData.sk[1].entries()) {
      const skillName = getSkillNameById(id);

      positions.forEach(([start, end]) => {
        skillPositions.push({
          name: skillName[0],
          positions: [start, end],
        });
      });
    }

    return skillPositions;
  }, [chartData]);

  const resultsSummary = useMemo(() => {
    const resultsSummary = {
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

    return resultsSummary;
  }, [results, mean, median]);

  if (!chartData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div id="resultsPane" className="flex flex-col gap-2">
        <div className="flex gap-2">
          {Object.entries(resultsSummary).map(([key, value]) => (
            <div key={key}>
              <button
                onClick={() => setDisplaying(key)}
                className={cn(
                  'flex flex-col items-center bg-background justify-center w-[100px] h-[100px] border border-gray-300 rounded-md p-2 hover:bg-gray-200',
                  { 'ring-2 ring-blue-500': displaying === key },
                )}
                type="button"
              >
                <span className="text-xs text-foreground">{value.label}</span>
                <span className="text-2xl font-bold text-foreground">
                  {value.value}
                </span>
                <span className="text-xs text-foreground">lengths</span>
              </button>
            </div>
          ))}
        </div>

        <div id="resultsHelp">
          Negative numbers mean{' '}
          <strong style={{ color: '#2a77c5' }}>Umamusume 1</strong> is faster,
          positive numbers mean{' '}
          <strong style={{ color: '#c52a2a' }}>Umamusume 2</strong> is faster.
        </div>

        {(firstUmaStats || staminaStats) && (
          <div>
            {firstUmaStats && (
              <div className="flex gap-4">
                <div>
                  <strong>Uma 1:</strong> Final leg 1st place:{' '}
                  <span style={{ color: '#2a77c5', fontWeight: 'bold' }}>
                    {firstUmaStats.uma1.firstPlaceRate.toFixed(1)}%
                  </span>
                </div>

                <div>
                  <strong>Uma 2:</strong> Final leg 1st place:{' '}
                  <span style={{ color: '#c52a2a', fontWeight: 'bold' }}>
                    {firstUmaStats.uma2.firstPlaceRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {staminaStats && (
              <>
                <div className="flex gap-4">
                  <div>
                    <strong>Uma 1:</strong> Spurt Rate:{' '}
                    <span style={{ color: '#2a77c5', fontWeight: 'bold' }}>
                      {staminaStats.uma1.fullSpurtRate.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <strong>Uma 2:</strong> Spurt Rate:{' '}
                    <span style={{ color: '#c52a2a', fontWeight: 'bold' }}>
                      {staminaStats.uma2.fullSpurtRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div>
                    <strong>Uma 1:</strong> Survival Rate:{' '}
                    <span style={{ color: '#2a77c5', fontWeight: 'bold' }}>
                      {staminaStats.uma1.staminaSurvivalRate.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <strong>Uma 2:</strong> Survival Rate:{' '}
                    <span style={{ color: '#c52a2a', fontWeight: 'bold' }}>
                      {staminaStats.uma2.staminaSurvivalRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <Histogram data={results} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[#2a77c5] text-center text-sm font-bold">
            Umamusume 1
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableHead>Time to finish</TableHead>
                <TableCell>
                  {formatTime(chartData.t[0][chartData.t[0].length - 1] * 1.18)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Start delay</TableHead>
                <TableCell>{chartData.sdly[0].toFixed(4) + ' s'}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Top speed</TableHead>
                <TableCell>
                  {chartData.v[0]
                    .reduce((a, b) => Math.max(a, b), 0)
                    .toFixed(2) + ' m/s'}
                </TableCell>
              </TableRow>
              {rushedStats && allowRushedUma2 && (
                <TableRow>
                  <TableHead>Rushed frequency</TableHead>
                  <TableCell>
                    {rushedStats.uma1.frequency > 0
                      ? `${rushedStats.uma1.frequency.toFixed(
                          1,
                        )}% (${rushedStats.uma1.mean.toFixed(1)}m)`
                      : '0%'}
                  </TableCell>
                </TableRow>
              )}
              {leadCompetitionStats && (
                <TableRow>
                  <TableHead>Spot Struggle frequency</TableHead>
                  <TableCell>
                    {leadCompetitionStats.uma1.frequency > 0
                      ? `${leadCompetitionStats.uma1.frequency.toFixed(1)}%`
                      : '0%'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {chartData.sk[0].size > 0 && (
              <TableBody>
                {skillPositionsRunnerA.map(({ name, positions }, index) => (
                  <TableRow key={index}>
                    <TableHead>{name}</TableHead>
                    <TableCell>{`${positions[0].toFixed(
                      2,
                    )} m - ${positions[1].toFixed(2)} m`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>

        <div>
          <div className="text-[#c52a2a] text-center text-sm font-bold">
            Umamusume 2
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableHead>Time to finish</TableHead>
                <TableCell>
                  {formatTime(chartData.t[1][chartData.t[1].length - 1] * 1.18)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Start delay</TableHead>
                <TableCell>{chartData.sdly[1].toFixed(4) + ' s'}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Top speed</TableHead>
                <TableCell>
                  {chartData.v[1]
                    .reduce((a, b) => Math.max(a, b), 0)
                    .toFixed(2) + ' m/s'}
                </TableCell>
              </TableRow>
              {rushedStats && allowRushedUma2 && (
                <TableRow>
                  <TableHead>Rushed frequency</TableHead>
                  <TableCell>
                    {rushedStats.uma2.frequency > 0
                      ? `${rushedStats.uma2.frequency.toFixed(
                          1,
                        )}% (${rushedStats.uma2.mean.toFixed(1)}m)`
                      : '0%'}
                  </TableCell>
                </TableRow>
              )}
              {leadCompetitionStats && (
                <TableRow>
                  <TableHead>Spot Struggle frequency</TableHead>
                  <TableCell>
                    {leadCompetitionStats.uma2.frequency > 0
                      ? `${leadCompetitionStats.uma2.frequency.toFixed(1)}%`
                      : '0%'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {chartData.sk[1].size > 0 && (
              <TableBody>
                {skillPositionsRunnerB.map(({ name, positions }, index) => (
                  <TableRow key={index}>
                    <TableHead>{name}</TableHead>
                    <TableCell>{`${positions[0].toFixed(
                      2,
                    )} m - ${positions[1].toFixed(2)} m`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};
