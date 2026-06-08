/**
 * PARITY REFERENCE — TEST-ONLY. Not in the production path.
 *
 * Builds and initializes a legacy TypeScript `sunday-tools` {@link Race}. This is
 * the only place that instantiates the TS engine; it exists solely so the
 * statistical-parity oracle (see this directory's README and ADR-0004) can run
 * the reference engine. Production simulation is 100% WASM.
 */
import type {
  DuelingRates,
  RaceLifecycleObserver,
  SimulationSettings,
  RaceParameters as SundayRaceParameters
} from 'sunday-tools/common/race';
import type { CourseData } from 'sunday-tools/course/definitions';
import type { CreateRunner } from 'sunday-tools/common/runner';
import { Race } from 'sunday-tools/common/race';
import { subscribeObserver } from 'sunday-tools/common/race-events';

export function createInitializedRace(params: {
  course: CourseData;
  raceParameters: SundayRaceParameters;
  settings: SimulationSettings;
  duelingRates: DuelingRates;
  skillSamples: number;
  runner: CreateRunner;
  observer?: RaceLifecycleObserver;
}): Race {
  const race = new Race({
    course: params.course,
    parameters: params.raceParameters,
    settings: params.settings,
    skillSamples: params.skillSamples,
    duelingRates: params.duelingRates
  });

  if (params.observer) {
    subscribeObserver(race.events, params.observer);
  }

  race.onInitialize();
  race.skillSamples = params.skillSamples;
  race.addRunner(params.runner);
  race.prepareRace().validateRaceSetup();

  return race;
}
