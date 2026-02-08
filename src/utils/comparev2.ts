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
import { Runner } from '@/modules/simulation/simulator/runner';
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
  });

  const results = [];

  // Add runners to the simulator
  // the idea is that the runners are created once and then used for all samples
  // For this Runner.create is a special method that will create a new instance with
  // both the base stats and adjusted statlines set before the race.
  // Concerns:
  // - Setting skills proc should be done right before the race.
  // - For each iteration the race simulator should be reset with a new seed that will propagate to the runners
  // .. so rng refresh should be again, before the race is run.
  const runnerAInstance = Runner.create(runnerA);
  const runnerBInstance = Runner.create(runnerB);

  raceSimulator.addRunner(runnerAInstance);
  raceSimulator.addRunner(runnerBInstance);

  for (let i = 0; i < sampleCount; i++) {
    raceSimulator.prepareRace();
    raceSimulator.run();

    const currentResult = raceSimulator.collectStats();

    results.push(currentResult);
  }
}
