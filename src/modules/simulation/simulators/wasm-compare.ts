// WASM-backed compare orchestration. Mirrors `vacuum-compare.ts` but sources
// the per-round, per-runner telemetry from the Rust `runCompare` read-model
// (two vacuum races sharing a master seed) instead of the TS engine. The
// bashin-delta + summary statistics live here on the TS side; the WASM boundary
// stays lean (two batch calls + this reduction).

import type {
  CompareResult,
  FirstUMAStats,
  SimulationRun,
  StaminaStats,
  Stats
} from '@/modules/simulation/compare.types';
import type { CompareParams } from '@/modules/simulation/types';
import type { CollectedRunnerRoundData } from 'sunday-tools/common/race-observer';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { compareParamsToWasm, wasmCompareRoundDataToCollected } from '@/lib/uma-sim-wasm/adapter';
import { runCompare } from '@/lib/uma-sim-wasm/loader';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createCompareSettings,
  createSkillSorterByGroup,
  toCreateRunner,
  toSundayRaceParameters
} from './shared';

type CompareStatsAccumulator = {
  lengths: Array<number>;
  count: number;
};

function calculateStats(stats: CompareStatsAccumulator, totalSamples: number) {
  if (stats.lengths.length === 0) {
    return { min: 0, max: 0, mean: 0, frequency: 0 };
  }

  const min = Math.min(...stats.lengths);
  const max = Math.max(...stats.lengths);
  const mean = stats.lengths.reduce((sum, value) => sum + value, 0) / stats.lengths.length;
  const frequency = totalSamples > 0 ? (stats.count / totalSamples) * 100 : 0;

  return { min, max, mean, frequency };
}

function resolveRunnerName(outfitId: string, fallbackIndex: number): string {
  const info = outfitId ? getUmaDisplayInfo(outfitId) : null;
  return info?.name ?? `Runner ${fallbackIndex + 1}`;
}

/**
 * Reduce two per-round vacuum telemetry streams into a {@link CompareResult}.
 *
 * Port of the reduction loop in `vacuum-compare.ts`. `roundsA[i]` / `roundsB[i]`
 * are the primary-runner round data for the same seed `seed + i`.
 */
function reduceCompareRounds(
  roundsA: Array<CollectedRunnerRoundData>,
  roundsB: Array<CollectedRunnerRoundData>,
  nsamples: number
): CompareResult {
  const sign = 1;
  const diff: Array<number> = [];

  let min = Infinity;
  let max = -Infinity;
  let estMean = 0;
  let estMedian = 0;
  let bestMeanDiff = Infinity;
  let bestMedianDiff = Infinity;

  let minrun: SimulationRun = initializeSimulationRun();
  let maxrun: SimulationRun = initializeSimulationRun();
  let meanrun: SimulationRun = initializeSimulationRun();
  let medianrun: SimulationRun = initializeSimulationRun();

  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);

  const rushedStats = {
    uma1: { lengths: [], count: 0 } as CompareStatsAccumulator,
    uma2: { lengths: [], count: 0 } as CompareStatsAccumulator
  };
  const leadCompetitionStats = {
    uma1: { lengths: [], count: 0 } as CompareStatsAccumulator,
    uma2: { lengths: [], count: 0 } as CompareStatsAccumulator
  };
  const staminaCounters = {
    uma1: { total: 0, hpDiedCount: 0, fullSpurtCount: 0 },
    uma2: { total: 0, hpDiedCount: 0, fullSpurtCount: 0 }
  };
  const firstUmaCounters = {
    uma1: { total: 0, firstPlaceCount: 0 },
    uma2: { total: 0, firstPlaceCount: 0 }
  };

  for (let i = 0; i < nsamples; ++i) {
    const roundA = roundsA[i];
    const roundB = roundsB[i];

    if (!roundA || !roundB) {
      throw new Error('Missing collected runner data for compare simulation');
    }

    const data: SimulationRun = initializeSimulationRun({
      time: [roundA.time, roundB.time],
      position: [roundA.position, roundB.position],
      velocity: [roundA.velocity, roundB.velocity],
      hp: [roundA.hp, roundB.hp],
      currentLane: [roundA.currentLane, roundB.currentLane],
      pacerGap: [roundA.pacerGap, roundB.pacerGap],
      skillActivations: [roundA.skillActivations, roundB.skillActivations],
      targetedSkillActivations: [roundA.targetedSkillActivations, roundB.targetedSkillActivations],
      startDelay: [roundA.startDelay, roundB.startDelay],
      rushed: [roundA.rushed, roundB.rushed],
      duelingRegions: [roundA.duelingRegion, roundB.duelingRegion],
      spotStruggleRegions: [roundA.spotStruggleRegion, roundB.spotStruggleRegion]
    });

    if (roundA.rushed.length > 0) {
      const [start, end] = roundA.rushed[0];
      rushedStats.uma1.lengths.push(end - start);
      rushedStats.uma1.count++;
    }
    if (roundB.rushed.length > 0) {
      const [start, end] = roundB.rushed[0];
      rushedStats.uma2.lengths.push(end - start);
      rushedStats.uma2.count++;
    }

    if (roundA.spotStruggleRegion.length === 2) {
      const [start, end] = roundA.spotStruggleRegion;
      leadCompetitionStats.uma1.lengths.push(end - start);
      leadCompetitionStats.uma1.count++;
    }
    if (roundB.spotStruggleRegion.length === 2) {
      const [start, end] = roundB.spotStruggleRegion;
      leadCompetitionStats.uma2.lengths.push(end - start);
      leadCompetitionStats.uma2.count++;
    }

    staminaCounters.uma1.total++;
    staminaCounters.uma2.total++;
    if (roundA.outOfHp) staminaCounters.uma1.hpDiedCount++;
    if (roundB.outOfHp) staminaCounters.uma2.hpDiedCount++;
    if (roundA.hasAchievedFullSpurt) staminaCounters.uma1.fullSpurtCount++;
    if (roundB.hasAchievedFullSpurt) staminaCounters.uma2.fullSpurtCount++;

    firstUmaCounters.uma1.total++;
    firstUmaCounters.uma2.total++;
    if (roundA.firstPositionInLateRace) firstUmaCounters.uma1.firstPlaceCount++;
    if (roundB.firstPositionInLateRace) firstUmaCounters.uma2.firstPlaceCount++;

    const positionDiff = computePositionDiff(roundA.position, roundB.position);
    const basinn = (sign * positionDiff) / 2.5;
    diff.push(basinn);

    if (basinn < min) {
      min = basinn;
      minrun = data;
    }
    if (basinn > max) {
      max = basinn;
      maxrun = data;
    }

    if (i === sampleCutoff) {
      diff.sort((a, b) => a - b);
      estMean = diff.reduce((sum, value) => sum + value, 0) / diff.length;
      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
    }

    if (i >= sampleCutoff) {
      const meanDiff = Math.abs(basinn - estMean);
      const medianDiff = Math.abs(basinn - estMedian);
      if (meanDiff < bestMeanDiff) {
        bestMeanDiff = meanDiff;
        meanrun = data;
      }
      if (medianDiff < bestMedianDiff) {
        bestMedianDiff = medianDiff;
        medianrun = data;
      }
    }
  }

  diff.sort((a, b) => a - b);

  const rushedSummary: Stats = {
    uma1: calculateStats(rushedStats.uma1, nsamples),
    uma2: calculateStats(rushedStats.uma2, nsamples)
  };
  const leadCompetitionSummary: Stats = {
    uma1: calculateStats(leadCompetitionStats.uma1, nsamples),
    uma2: calculateStats(leadCompetitionStats.uma2, nsamples)
  };
  const staminaSummary: StaminaStats = {
    uma1: {
      staminaSurvivalRate:
        staminaCounters.uma1.total > 0
          ? ((staminaCounters.uma1.total - staminaCounters.uma1.hpDiedCount) /
              staminaCounters.uma1.total) *
            100
          : 0,
      fullSpurtRate:
        staminaCounters.uma1.total > 0
          ? (staminaCounters.uma1.fullSpurtCount / staminaCounters.uma1.total) * 100
          : 0
    },
    uma2: {
      staminaSurvivalRate:
        staminaCounters.uma2.total > 0
          ? ((staminaCounters.uma2.total - staminaCounters.uma2.hpDiedCount) /
              staminaCounters.uma2.total) *
            100
          : 0,
      fullSpurtRate:
        staminaCounters.uma2.total > 0
          ? (staminaCounters.uma2.fullSpurtCount / staminaCounters.uma2.total) * 100
          : 0
    }
  };
  const firstUmaSummary: FirstUMAStats = {
    uma1: {
      firstPlaceRate:
        firstUmaCounters.uma1.total > 0
          ? (firstUmaCounters.uma1.firstPlaceCount / firstUmaCounters.uma1.total) * 100
          : 0
    },
    uma2: {
      firstPlaceRate:
        firstUmaCounters.uma2.total > 0
          ? (firstUmaCounters.uma2.firstPlaceCount / firstUmaCounters.uma2.total) * 100
          : 0
    }
  };

  return {
    results: diff,
    runData: { minrun, maxrun, meanrun, medianrun },
    rushedStats: rushedSummary,
    leadCompetitionStats: leadCompetitionSummary,
    spurtInfo: null,
    staminaStats: staminaSummary,
    firstUmaStats: firstUmaSummary
  };
}

/** Extract the primary-runner round data from a WASM compare-round list. */
function primaryRounds(
  rounds: Array<{ runners: Array<Parameters<typeof wasmCompareRoundDataToCollected>[0]> }>
): Array<CollectedRunnerRoundData> {
  return rounds.map((round) => {
    const primary = round.runners[0];
    if (!primary) {
      throw new Error('Missing primary runner in WASM compare round');
    }
    return wasmCompareRoundDataToCollected(primary);
  });
}

/** Primary-runner round telemetry for both contestants, aligned by round index. */
export type CompareRounds = {
  roundsA: Array<CollectedRunnerRoundData>;
  roundsB: Array<CollectedRunnerRoundData>;
};

/**
 * Run the two WASM vacuum batches and return the raw per-round primary telemetry
 * (no reduction). `seedOffset` shifts the master seed so callers can simulate a
 * contiguous chunk of rounds whose global index `seedOffset + j` still maps to
 * master seed `masterSeed + seedOffset + j` — keeping a chunked run bit-for-bit
 * identical to a single full run. The bashin reduction is a separate, cheap pass
 * ([`reduceCompareRoundsPublic`]) so progressive UI never re-simulates.
 */
export async function runComparisonRoundsWasm(
  params: CompareParams,
  chunkSamples: number,
  seedOffset: number
): Promise<CompareRounds> {
  const {
    course,
    racedef,
    uma1,
    uma2,
    options,
    forcedPositions,
    injectedDebuffs,
    scenarioOverrides
  } = params;

  const masterSeed = (options.seed ?? 0) + seedOffset;
  const raceParameters = toSundayRaceParameters(racedef);

  const allSkillIds = [...uma1.skills, ...uma2.skills];
  const skillSorter = createSkillSorterByGroup(allSkillIds);
  const runnerASortedSkills = uma1.skills.toSorted(skillSorter);
  const runnerBSortedSkills = uma2.skills.toSorted(skillSorter);

  const settingsA = createCompareSettings({
    healthSystem: true,
    spotStruggle: true,
    sectionModifier: options.allowSectionModifierUma1,
    rushed: options.allowRushedUma1,
    downhill: options.allowDownhillUma1,
    witChecks: options.skillCheckChanceUma1,
    staminaDrainOverrides: options.staminaDrainOverrides
  });
  const settingsB = createCompareSettings({
    healthSystem: true,
    spotStruggle: true,
    sectionModifier: options.allowSectionModifierUma2,
    rushed: options.allowRushedUma2,
    downhill: options.allowDownhillUma2,
    witChecks: options.skillCheckChanceUma2,
    staminaDrainOverrides: options.staminaDrainOverrides
  });

  const runnerA = toCreateRunner(
    uma1,
    runnerASortedSkills,
    forcedPositions?.uma1,
    injectedDebuffs?.uma1,
    scenarioOverrides?.uma1
  );
  const runnerB = toCreateRunner(
    uma2,
    runnerBSortedSkills,
    forcedPositions?.uma2,
    injectedDebuffs?.uma2,
    scenarioOverrides?.uma2
  );

  const [dataA, dataB] = await Promise.all([
    runCompare(
      compareParamsToWasm({
        course,
        parameters: raceParameters,
        settings: settingsA,
        duelingRates: DEFAULT_DUELING_RATES,
        runner: runnerA,
        name: resolveRunnerName(runnerA.outfitId, 0),
        nsamples: chunkSamples,
        masterSeed
      })
    ),
    runCompare(
      compareParamsToWasm({
        course,
        parameters: raceParameters,
        settings: settingsB,
        duelingRates: DEFAULT_DUELING_RATES,
        runner: runnerB,
        name: resolveRunnerName(runnerB.outfitId, 1),
        nsamples: chunkSamples,
        masterSeed
      })
    )
  ]);

  return { roundsA: primaryRounds(dataA.rounds), roundsB: primaryRounds(dataB.rounds) };
}

/** Reduce aligned per-round telemetry into a {@link CompareResult}. */
export function reduceCompareRoundsPublic(rounds: CompareRounds, nsamples: number): CompareResult {
  return reduceCompareRounds(rounds.roundsA, rounds.roundsB, nsamples);
}

/** Run a WASM-backed vacuum comparison and produce the {@link CompareResult}. */
export async function runComparisonWasm(params: CompareParams): Promise<CompareResult> {
  const rounds = await runComparisonRoundsWasm(params, params.nsamples, 0);
  return reduceCompareRoundsPublic(rounds, params.nsamples);
}
