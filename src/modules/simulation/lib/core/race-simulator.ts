import { Rule30CARng } from '../utils/Random';
import type { Runner } from './runner';
import type { CourseData } from '../course/definitions';
import type { PRNG } from '../utils/Random';

export type RaceSettings = {
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

export type RaceSimulatorProps = {
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
  settings: RaceSettings;
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
  private _course: CourseData;
  private _settings: RaceSettings;

  /**
   * The runners in the race
   */
  private _runners: Map<string, Runner>;

  constructor(props: RaceSimulatorProps) {
    // From props
    this._umasCount = props.umasCount;
    this._course = props.course;
    this._settings = props.settings;

    // Default values
    this._runners = new Map();
  }

  // ==================
  // Lifecycle
  // ==================

  /**
   * Prepares the race simulation by precalculating all the needed context for the runners
   *
   * Note: This needs to be called after all runners have been added to the race and before the race is run.
   */
  public prepareRace() {
    // 1. Get a map of all common skills
    // 2. Get a map of each strategy count
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

  private markRunnerAsPacer(runnerId: string) {}

  // === runner management ===

  /**
   * Register a new runner to the race
   */
  public addRunner(runner: any) {
    runner.setRaceSimulator(this);
    this._runners.set(runner.id, runner);

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
    return 20.0 - (this._course.distance - 2000) / 1000.0;
  }

  /**
   * The course data for the race
   */
  public get course(): CourseData {
    return this._course;
  }

  public get runners(): Map<string, Runner> {
    return this._runners;
  }

  public get settings(): RaceSettings {
    return this._settings;
  }
}
