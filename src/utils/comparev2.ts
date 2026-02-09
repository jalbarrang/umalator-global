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

import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type {
  RaceParameters,
  SimulationSettings,
} from '@/modules/simulation/simulator/race-simulator';
import type { CreateRunner } from '@/modules/simulation/simulator/runner';
import { RaceSimulator } from '@/modules/simulation/simulator/race-simulator';

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

  const raceSimulator = new RaceSimulator({
    umasCount: 2,
    parameters,
    settings,
    course,
  })
    .addRunner(runnerA)
    .addRunner(runnerB)
    // After all runners are added, prepare the race to calculate the stats for easier access
    .prepareRace();

  const results = [];

  raceSimulator.validateRaceSetup();

  for (let i = 0; i < sampleCount; i++) {
    const seed = startingSeed + i;

    // Prepare or reset every aspect of the race simulator and runners
    // This will:
    // - Set the seed for the race
    // - Reset the RNG for the race
    // - Reset the runners (including their RNG)
    // - Build or rebuild the skill and effect data for the runner using the new seed.
    raceSimulator.prepareRound(seed);

    // Run the race
    raceSimulator.run();

    // Collect the stats of the race
    const currentResult = raceSimulator.collectStats();

    results.push(currentResult);
  }

  // Handle post simulation results

  return results;
}
