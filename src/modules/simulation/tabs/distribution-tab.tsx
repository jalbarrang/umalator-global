import { useMemo } from 'react';
import { useRaceStore } from '@/store/race/store';
import { Histogram } from '@/components/Histogram';

export const DistributionTab = () => {
  const { results } = useRaceStore();

  const distributionStats = useMemo(() => {
    if (results.length === 0) return null;

    const sorted = [...results].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    const variance = sorted.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const p5 = sorted[Math.floor(n * 0.05)];
    const p25 = sorted[Math.floor(n * 0.25)];
    const p50 = sorted[Math.floor(n * 0.5)];
    const p75 = sorted[Math.floor(n * 0.75)];
    const p95 = sorted[Math.floor(n * 0.95)];

    // Win rates
    const uma1Wins = sorted.filter((x) => x < 0).length;
    const uma2Wins = sorted.filter((x) => x > 0).length;
    const ties = sorted.filter((x) => x === 0).length;

    return {
      mean,
      stdDev,
      range: sorted[n - 1] - sorted[0],
      percentiles: { p5, p25, p50, p75, p95 },
      winRates: {
        uma1: ((uma1Wins / n) * 100).toFixed(1),
        uma2: ((uma2Wins / n) * 100).toFixed(1),
        tie: ((ties / n) * 100).toFixed(1),
      },
      sampleSize: n,
    };
  }, [results]);

  if (!distributionStats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="flex flex-col gap-2">
        {/* Basic Stats */}
        <div className="bg-background border-2 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Basic Statistics
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground">Mean:</span>
              <span className="font-mono font-medium">
                {distributionStats.mean.toFixed(3)} lengths
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Std Dev:</span>
              <span className="font-mono font-medium">
                {distributionStats.stdDev.toFixed(3)} lengths
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Range:</span>
              <span className="font-mono font-medium">
                {distributionStats.range.toFixed(3)} lengths
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Sample Size:</span>
              <span className="font-mono font-medium">
                {distributionStats.sampleSize}
              </span>
            </div>
          </div>
        </div>

        {/* Percentiles */}
        <div className="bg-background border-2 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Percentiles
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground">5th:</span>
              <span className="font-mono font-medium">
                {distributionStats.percentiles.p5.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">25th:</span>
              <span className="font-mono font-medium">
                {distributionStats.percentiles.p25.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">50th (Median):</span>
              <span className="font-mono font-medium">
                {distributionStats.percentiles.p50.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">75th:</span>
              <span className="font-mono font-medium">
                {distributionStats.percentiles.p75.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">95th:</span>
              <span className="font-mono font-medium">
                {distributionStats.percentiles.p95.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Win Rates */}
        <div className="bg-background border-2 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Win Distribution
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#2a77c5] dark:text-blue-500 font-medium">
                  Uma 1 Wins
                </span>
                <span className="font-mono font-bold text-[#2a77c5]">
                  {distributionStats.winRates.uma1}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2a77c5] transition-all"
                  style={{ width: `${distributionStats.winRates.uma1}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#c52a2a] font-medium">Uma 2 Wins</span>
                <span className="font-mono font-bold text-[#c52a2a]">
                  {distributionStats.winRates.uma2}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c52a2a] transition-all"
                  style={{ width: `${distributionStats.winRates.uma2}%` }}
                />
              </div>
            </div>
            {parseFloat(distributionStats.winRates.tie) > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 font-medium">Ties</span>
                  <span className="font-mono font-bold text-gray-500">
                    {distributionStats.winRates.tie}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 transition-all"
                    style={{ width: `${distributionStats.winRates.tie}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        {/* Full-width Histogram */}
        <div className="w-full">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Result Distribution
          </h3>
          <div className="flex justify-center h-[300px]">
            <Histogram data={results} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
