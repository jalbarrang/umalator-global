/**
 * # Runner Comparison for Sunday's Shadow
 *
 * ## Overview
 *
 * This module is used to compare the performance of two runners in a race by running
 * multiple samples of simulation using seeded runs for different aspects of the race.
 *
 * The goal of this Module is to provide a way a to compare how many Bashins is a Runner
 * able to achieve in a race compared to another.
 *
 * The Comparison works best when you have two runner of the same outfit but with different Skills or Statlines.
 *
 * ### Notes
 *
 * As this only compares two runners, it is not possible to simulate races with 9 runners as it would defeat the purpose of this compare tool.
 */

import type { CreateRunner } from '@/lib/sunday-tools/common/runner';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters, SimulationSettings } from '@/lib/sunday-tools/common/race';
import { Race } from '@/lib/sunday-tools/common/race';

type ComparisonParams = {
  startingSeed: number;
  sampleCount: number;
  runnerA: CreateRunner;
  runnerB: CreateRunner;
  course: CourseData;
  parameters: RaceParameters;
  settings: SimulationSettings;
};

export function runComparison(params: ComparisonParams) {
  const { startingSeed, sampleCount, runnerA, runnerB, course, parameters, settings } = params;

  const commonRaceConfig = {
    umasCount: 2,
    parameters,
    settings,
    course,
    skillSamples: sampleCount,
    duelingRates: {
      runaway: 10,
      frontRunner: 10,
      paceChaser: 10,
      lateSurger: 10,
      endCloser: 10,
    },
  };

  const pacers: Array<CreateRunner> = [];

  const raceA = new Race(commonRaceConfig).addRunner(runnerA);
  const raceB = new Race(commonRaceConfig).addRunner(runnerB);

  for (const pacer of pacers) {
    raceA.addRunner(pacer);
    raceB.addRunner(pacer);
  }

  raceA.prepareRace().validateRaceSetup();
  raceB.prepareRace().validateRaceSetup();

  const results = [];

  for (let i = 0; i < sampleCount; i++) {
    const seed = startingSeed + i;

    // Prepare or reset every aspect of the race simulator and runners
    // This will:
    // - Set the seed for the race
    // - Reset the RNG for the race
    // - Reset the runners (including their RNG)
    // - Build or rebuild the skill and effect data for the runner using the new seed.
    raceA.prepareRound(seed);
    raceB.prepareRound(seed);

    // Run the race
    // TODO: This should run in parallel
    raceA.run();
    raceB.run();

    // Collect the stats of the race
    const currentResultA = raceA.collectStats();
    const currentResultB = raceB.collectStats();

    results.push({
      seed,
      resultA: currentResultA,
      resultB: currentResultB,
    });
  }

  // Handle post simulation results

  return results;
}
