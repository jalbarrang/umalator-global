import { Rule30CARng } from '../lib/utils/Random';
import { GameHpPolicy } from './health/game.policy';
import { NoopHpPolicy } from './health/health-policy';
import type { PRNG } from '../lib/utils/Random';
import type {
  CourseData,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '../lib/course/definitions';
import type { Runner } from './runner';

export type SimulationSettings = {
  /**
   * Whether the simulation should account for the health system
   */
  healthSystem: boolean;
  /**
   * Whether the simulation should account for the section modifier
   */
  sectionModifier: boolean;
  /**
   * Whether the simulation should account for the rushed state
   */
  rushed: boolean;
  /**
   * Whether the simulation should account for the downhill mode
   */
  downhill: boolean;
  /**
   * Whether the simulation should account for the spot struggle
   */
  spotStruggle: boolean;
  /**
   * Whether the simulation should account for the dueling
   */
  dueling: boolean;
  /**
   * Whether the simulation should account for wit checks
   *
   * Values:
   * - true: Wit checks are enabled
   * - false: Wit checks are disabled so skills always pass.
   */
  witChecks: boolean;
};

export type RaceParameters = {
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;
};

export type RaceSimulatorProps = {
  /**
   * The parameters for the race simulation
   */
  parameters: RaceParameters;

  /**
   * The number of participants in the race
   */
  umasCount: number;
  /**
   * The course data for the race
   */
  course: CourseData;
  /**
   * The settings for the race simulation
   */
  settings: SimulationSettings;
};

/**
 * # Race Simulator
 *
 * ## Overview
 *
 * The core class for running a race simulation.
 */
export class RaceSimulator {
  declare private _seed: number;
  declare private _rng: PRNG;
  declare private _pacerId: string;

  private _umasCount: number;

  private _settings: SimulationSettings;

  public course: CourseData;
  public ground: IGroundCondition;
  public timeOfDay: ITimeOfDay;
  public weather: IWeather;
  public grade: IGrade;
  public season: ISeason;

  /**
   * The runners in the race
   */
  private _runners: Map<string, Runner>;

  constructor(props: RaceSimulatorProps) {
    // From props
    this._umasCount = props.umasCount;
    this.course = props.course;

    this.ground = props.parameters.ground;
    this.timeOfDay = props.parameters.timeOfDay;
    this.weather = props.parameters.weather;
    this.grade = props.parameters.grade;
    this.season = props.parameters.season;

    this._settings = props.settings;

    // Default values
    this._runners = new Map();
  }

  // ==================
  // Lifecycle
  // ==================

  private assignGate(runner: Runner): number {
    throw new Error('Not implemented');
  }

  public prepareRace() {
    if (!this._rng) throw new Error('Seed must be set before preparing race');
    if (this._runners.size === 0) throw new Error('No runners added to race');

    // 1. Get a map of all common skills
    // 2. Get a map of each strategy count

    for (const runner of this._runners.values()) {
      // Generate runner-specific RNG
      const runnerRng = new Rule30CARng(this._rng.int32());
      runner.setupRng(runnerRng);

      // Assign gate (you'll implement this logic)
      const gate = this.assignGate(runner);
      runner.setGate(gate);

      // Setup health policy
      if (this._settings.healthSystem) {
        // Create health policy RNG (separate from runner's main RNG)
        const hpRng = new Rule30CARng(this._rng.int32());
        const healthPolicy = new GameHpPolicy(this.course, this.ground, hpRng);
        runner.setHealthPolicy(healthPolicy);
      } else {
        runner.setHealthPolicy(NoopHpPolicy);
      }

      // Validate runner is ready
      runner.onRaceSetup();
    }
  }

  /**
   * Called when the race starts
   */
  private onStartRace() {
    for (const runner of this._runners.values()) {
      runner.onRaceStart();
    }
  }

  private step(dt: number): void {
    for (const runner of this._runners.values()) {
      runner.step(dt);

      // NOTE: Might want to revise this.
      if (runner.hasFinishedRace) {
        this._finishedCount++;
      }
    }
  }

  declare private _finishedCount: number;

  /**
   * Runs the race simulation
   *
   * This will run until all runners have finished the race
   */
  public run() {
    this.onStartRace();

    this._finishedCount = 0;

    while (this._finishedCount < this._runners.size) {
      this.step(1 / 15);
    }
  }

  private markRunnerAsPacer(runnerId: string) {
    throw new Error('Not implemented');
  }

  // === runner management ===

  /**
   * Register a new runner to the race
   */
  public addRunner(runner: Runner) {
    runner.setRaceSimulator(this);
    this._runners.set(runner.internalId, runner);

    // NOTE: RNG propagation will happen before race starts.

    return this;
  }

  // === race management ===

  /**
   * Generates the PRNG seed for the race.
   *
   * This will be shared across all runners in the race,
   */
  public setSeed(masterSeed: number) {
    this._seed = masterSeed;
    this._rng = new Rule30CARng(masterSeed);

    return this;
  }

  // === Settings ===

  public setRushed(rushed: boolean) {
    this._settings.rushed = rushed;
    return this;
  }

  public setDownhill(downhill: boolean) {
    this._settings.downhill = downhill;
    return this;
  }

  public setSpotStruggle(spotStruggle: boolean) {
    this._settings.spotStruggle = spotStruggle;
    return this;
  }

  public setDueling(dueling: boolean) {
    this._settings.dueling = dueling;
    return this;
  }

  public setWitChecks(witChecks: boolean) {
    this._settings.witChecks = witChecks;
    return this;
  }

  /**
   * The base speed for the race
   */
  public get baseSpeed(): number {
    return 20.0 - (this.course.distance - 2000) / 1000.0;
  }

  public get runners(): Map<string, Runner> {
    return this._runners;
  }

  public get settings(): SimulationSettings {
    return this._settings;
  }
}
