import type {
  CompareResult,
  FirstUMAStats,
  SimulationRun,
  StaminaStats,
  Stats,
} from '@/modules/simulation/compare.types';
import type { CompareParams } from '@/modules/simulation/types';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { VacuumCompareDataCollector } from '@/lib/sunday-tools/common/race-observer';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createCompareSettings,
  createInitializedRace,
  createSkillSorterByGroup,
  toCreateRunner,
  toSundayRaceParameters,
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

export function runComparison(params: CompareParams): CompareResult {
  const { nsamples, course, racedef, uma1, uma2, options, forcedPositions, injectedDebuffs } =
    params;

  const seed = options.seed ?? 0;
  const raceParameters = toSundayRaceParameters(racedef);

  const allSkillIds = [...uma1.skills, ...uma2.skills];
  const skillSorter = createSkillSorterByGroup(allSkillIds);
  const runnerASortedSkills = uma1.skills.toSorted(skillSorter);
  const runnerBSortedSkills = uma2.skills.toSorted(skillSorter);

  const collectorA = new VacuumCompareDataCollector();
  const collectorB = new VacuumCompareDataCollector();

  const raceA = createInitializedRace({
    course,
    raceParameters,
    settings: createCompareSettings({
      healthSystem: true,
      spotStruggle: true,
      sectionModifier: options.allowSectionModifierUma1,
      rushed: options.allowRushedUma1,
      downhill: options.allowDownhillUma1,
      witChecks: options.skillCheckChanceUma1,
    }),
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(
      uma1,
      runnerASortedSkills,
      forcedPositions?.uma1,
      injectedDebuffs?.uma1,
    ),
    collector: collectorA,
  });

  const raceB = createInitializedRace({
    course,
    raceParameters,
    settings: createCompareSettings({
      healthSystem: true,
      spotStruggle: true,
      sectionModifier: options.allowSectionModifierUma2,
      rushed: options.allowRushedUma2,
      downhill: options.allowDownhillUma2,
      witChecks: options.skillCheckChanceUma2,
    }),
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(
      uma2,
      runnerBSortedSkills,
      forcedPositions?.uma2,
      injectedDebuffs?.uma2,
    ),
    collector: collectorB,
  });

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

  const rushedStats: { uma1: CompareStatsAccumulator; uma2: CompareStatsAccumulator } = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  const leadCompetitionStats: { uma1: CompareStatsAccumulator; uma2: CompareStatsAccumulator } = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  const staminaCounters = {
    uma1: { total: 0, hpDiedCount: 0, fullSpurtCount: 0 },
    uma2: { total: 0, hpDiedCount: 0, fullSpurtCount: 0 },
  };

  const firstUmaCounters = {
    uma1: { total: 0, firstPlaceCount: 0 },
    uma2: { total: 0, firstPlaceCount: 0 },
  };

  for (let i = 0; i < nsamples; ++i) {
    const sampleSeed = seed + i;
    raceA.prepareRound(sampleSeed);
    raceB.prepareRound(sampleSeed);

    raceA.run();
    raceB.run();

    const roundA = collectorA.getPrimaryRunnerRoundData();
    const roundB = collectorB.getPrimaryRunnerRoundData();

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
      startDelay: [roundA.startDelay, roundB.startDelay],
      rushed: [roundA.rushed, roundB.rushed],
      duelingRegions: [roundA.duelingRegion, roundB.duelingRegion],
      spotStruggleRegions: [roundA.spotStruggleRegion, roundB.spotStruggleRegion],
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

    if (roundA.outOfHp) {
      staminaCounters.uma1.hpDiedCount++;
    }
    if (roundB.outOfHp) {
      staminaCounters.uma2.hpDiedCount++;
    }
    if (roundA.hasAchievedFullSpurt) {
      staminaCounters.uma1.fullSpurtCount++;
    }
    if (roundB.hasAchievedFullSpurt) {
      staminaCounters.uma2.fullSpurtCount++;
    }

    firstUmaCounters.uma1.total++;
    firstUmaCounters.uma2.total++;
    if (roundA.firstPositionInLateRace) {
      firstUmaCounters.uma1.firstPlaceCount++;
    }
    if (roundB.firstPositionInLateRace) {
      firstUmaCounters.uma2.firstPlaceCount++;
    }

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
    uma2: calculateStats(rushedStats.uma2, nsamples),
  };

  const leadCompetitionSummary: Stats = {
    uma1: calculateStats(leadCompetitionStats.uma1, nsamples),
    uma2: calculateStats(leadCompetitionStats.uma2, nsamples),
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
          : 0,
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
          : 0,
    },
  };

  const firstUmaSummary: FirstUMAStats = {
    uma1: {
      firstPlaceRate:
        firstUmaCounters.uma1.total > 0
          ? (firstUmaCounters.uma1.firstPlaceCount / firstUmaCounters.uma1.total) * 100
          : 0,
    },
    uma2: {
      firstPlaceRate:
        firstUmaCounters.uma2.total > 0
          ? (firstUmaCounters.uma2.firstPlaceCount / firstUmaCounters.uma2.total) * 100
          : 0,
    },
  };

  return {
    results: diff,
    runData: { minrun, maxrun, meanrun, medianrun },
    rushedStats: rushedSummary,
    leadCompetitionStats: leadCompetitionSummary,
    spurtInfo: null,
    staminaStats: staminaSummary,
    firstUmaStats: firstUmaSummary,
  };
}
