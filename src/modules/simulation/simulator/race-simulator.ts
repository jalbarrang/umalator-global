import { Rule30CARng } from '../lib/utils/Random';
import { Strategy } from '../lib/runner/definitions';
import { GameHpPolicy } from './health/game.policy';
import { NoopHpPolicy } from './health/health-policy';
import { Runner } from './runner';
import type { IPosKeepMode, IStrategy } from '../lib/runner/definitions';
import type { CreateRunner } from './runner';
import type { PRNG } from '../lib/utils/Random';
import type {
  CourseData,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '../lib/course/definitions';

export type RunnerMap = Map<number, Runner>;

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
  /**
   * The position keep mode that the simulation should use for the runners
   */
  positionKeepMode: IPosKeepMode;
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
  private _seed: number;
  private _rng: PRNG | null;
  private _pacerId: number;
  private _umasCount: number;

  private _lastRunnerId: number;

  private _settings: SimulationSettings;

  public course: CourseData;
  public ground: IGroundCondition;
  public timeOfDay: ITimeOfDay;
  public weather: IWeather;
  public grade: IGrade;
  public season: ISeason;

  // ==================
  // Race Stats
  // ==================

  public commonSkills: Map<string, number>;
  public strategyCounts: Map<IStrategy, number>;
  public runnersPerStrategy: Map<IStrategy, Array<Runner>>;

  /**
   * The runners in the race
   */
  private _runners: RunnerMap;
  /**
   * Internal map of finished runners
   */
  private _finishedRunners: RunnerMap;

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
    this._seed = -1;
    this._rng = null;
    this._lastRunnerId = 0;
    this._pacerId = -1; // -1 means no pacer has been set yet
    this._runners = new Map();
    this._finishedRunners = new Map();

    this.commonSkills = new Map();
    this.strategyCounts = new Map();
    this.runnersPerStrategy = new Map();
  }

  // ==================
  // Lifecycle
  // ==================

  /**
   * Assign unique gate positions to all runners.
   *
   * Uses a Fisher-Yates shuffle seeded from the race RNG to produce
   * a fair, deterministic, unique gate assignment for each runner.
   *
   * Gate numbers are 0-8 (9 positions), mapped to lane positions
   * by the runner using `gate * course.horseLane`.
   */
  private assignGates(): void {
    if (!this._rng) throw new Error('Race RNG not set');

    // Create gate pool (0 to 8, always 9 gates)
    const gates = Array.from({ length: 9 }, (_, i) => i);

    // Fisher-Yates shuffle using race RNG
    for (let i = gates.length - 1; i > 0; i--) {
      const j = this._rng.uniform(i + 1);
      [gates[i], gates[j]] = [gates[j], gates[i]];
    }

    // Assign first N gates to runners (in iteration order, which is insertion order for Map)
    let gateIndex = 0;
    for (const runner of this._runners.values()) {
      runner.setGate(gates[gateIndex]);
      gateIndex++;
    }
  }

  public validateRaceSetup(): void {
    if (this._runners.size === 0) throw new Error('No runners added to race');
  }

  public prepareRace() {
    const commonSkills = new Map<string, number>();
    const strategyCounts = new Map<IStrategy, number>([
      [Strategy.Runaway, 0],
      [Strategy.FrontRunner, 0],
      [Strategy.PaceChaser, 0],
      [Strategy.LateSurger, 0],
      [Strategy.EndCloser, 0],
    ]);

    const runnersPerStrategy = new Map<IStrategy, Array<Runner>>([
      [Strategy.Runaway, []],
      [Strategy.FrontRunner, []],
      [Strategy.PaceChaser, []],
      [Strategy.LateSurger, []],
      [Strategy.EndCloser, []],
    ]);

    for (const runner of this._runners.values()) {
      const strategy = runner.strategy;
      const skills = runner.skillIds;

      for (const skill of skills) {
        const count = commonSkills.get(skill) ?? 0;
        commonSkills.set(skill, count + 1);
      }

      const stratCount = strategyCounts.get(strategy)!;
      strategyCounts.set(strategy, stratCount + 1);

      const runners = runnersPerStrategy.get(strategy)!;
      runners.push(runner);
      runnersPerStrategy.set(strategy, runners);
    }

    this.commonSkills = commonSkills;
    this.strategyCounts = strategyCounts;
    this.runnersPerStrategy = runnersPerStrategy;

    return this;
  }

  public prepareRound(masterSeed: number) {
    this._seed = masterSeed;
    this._rng = new Rule30CARng(masterSeed);

    this.assignGates();

    for (const runner of this._runners.values()) {
      // Generate runner-specific RNG
      const runnerRng = new Rule30CARng(this._rng.int32());
      runner.setupRng(runnerRng);

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
      runner.validateSetup();
      runner.prepareRunner();
    }
  }

  private step(dt: number): void {
    for (const runner of this._runners.values()) {
      runner.step(dt);

      if (runner.hasFinishedRace) {
        // Remove runner from the active runners and add to the finished runners.
        this._finishedRunners.set(runner.internalId, runner);
        this._runners.delete(runner.internalId);
      }
    }
  }

  /**
   * Runs the race simulation
   *
   * This will run until all runners have finished the race
   */
  public run() {
    // Get the number of runners.
    const runnerSize = this._runners.size;

    // Run the race until all runners have finished.
    while (this._finishedRunners.size < runnerSize) {
      this.step(1 / 15);
    }

    // When the race is over, reset the runners map
    this._runners = new Map(this._finishedRunners.entries());
    this._finishedRunners = new Map();
  }

  private markRunnerAsPacer(runnerId: number) {
    throw new Error('Not implemented');
  }

  public collectStats(): Array<unknown> {
    throw new Error('Not implemented');
  }

  // === runner management ===

  /**
   * Register a new runner to the race
   */
  public addRunner(params: CreateRunner) {
    const runner = Runner.create(this, this._lastRunnerId, params);
    this._runners.set(this._lastRunnerId, runner);

    this._lastRunnerId++;

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

  public get runners(): RunnerMap {
    return this._runners;
  }

  public get settings(): SimulationSettings {
    return this._settings;
  }
}
