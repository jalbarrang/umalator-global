import { Region, RegionList } from '../shared/region';
import { createParser } from '../skills/parser/ConditionParser';
import { Strategy } from '../runner/definitions';
import { Rule30CARng } from '../shared/random';
import { GameHpPolicy } from '../health/game.policy';
import { NoopHpPolicy } from '../health/health-policy';
import { StrategyHelpers } from '../runner/runner.types';
import { Runner } from './runner';
import type { CreateRunner } from './runner';
import type { PRNG } from '../shared/random';
import type { IPosKeepMode, IStrategy } from '../runner/definitions';
import type { DefaultParser } from '../skills/parser/definitions';
import type {
  CourseData,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '../course/definitions';

export type RunnerMap = Map<number, Runner>;

export type SimulationSettings = {
  mode: 'compare' | 'normal';
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

export type DuelingRates = {
  runaway: number;
  frontRunner: number;
  paceChaser: number;
  lateSurger: number;
  endCloser: number;
};

export type RaceParameters = {
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;

  [key: string]: any;
};

export type RaceSimulatorProps = {
  /**
   * The parameters for the race simulation
   */
  parameters: RaceParameters;
  /**
   * The course data for the race
   */
  course: CourseData;

  /**
   * The settings for the race simulation
   */
  settings: SimulationSettings;

  /**
   * The number of skill samples to use for the race simulation
   */
  skillSamples: number;

  duelingRates: DuelingRates;
};

export class Race {
  // ===================
  // Private
  // ===================

  public seed!: number;
  public rng!: PRNG;
  public lastRunnerId!: number;
  public settings: SimulationSettings;
  public duelingRates: DuelingRates;

  // ===================
  // Public
  // ===================

  declare public pacer: Runner;
  declare public commonSkills: Map<string, number>;
  declare public strategyCounts: Map<IStrategy, number>;
  declare public runnersPerStrategy: Map<IStrategy, Array<Runner>>;
  declare public accumulatedTime: number;

  declare public parser: DefaultParser;
  declare public wholeCourse: RegionList;
  declare public skillSamples: number;
  declare public roundIteration: number;

  public course: CourseData;
  public ground: IGroundCondition;
  public weather: IWeather;
  public season: ISeason;
  public timeOfDay: ITimeOfDay;
  public grade: IGrade;

  public runners: Map<number, Runner>;
  public finishedRunners: Array<number>;

  constructor(props: RaceSimulatorProps) {
    this.course = props.course;

    this.ground = props.parameters.ground;
    this.weather = props.parameters.weather;
    this.season = props.parameters.season;
    this.timeOfDay = props.parameters.timeOfDay;
    this.grade = props.parameters.grade;

    this.runners = new Map();
    this.finishedRunners = [];

    this.settings = props.settings;
    this.duelingRates = props.duelingRates;
  }

  public onInitialize(): void {
    // Default values
    this.seed = -1;
    this.lastRunnerId = 0;

    this.parser = createParser();
    this.wholeCourse = new RegionList();
    this.wholeCourse.push(new Region(0, this.course.distance));
    this.skillSamples = 0;
    this.roundIteration = 0;
  }

  public onPrepare(): void {
    this.accumulatedTime = 0;

    this.commonSkills = new Map();
    this.strategyCounts = new Map();
    this.runnersPerStrategy = new Map();
  }

  // ===================
  // Getters
  // ===================

  public get baseSpeed(): number {
    return 20.0 - (this.course.distance - 2000) / 1000.0;
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
    if (!this.rng) throw new Error('Race RNG not set');

    // Create gate pool (0 to 8, always 9 gates)
    const gates = Array.from({ length: 9 }, (_, i) => i);

    // Fisher-Yates shuffle using race RNG
    for (let i = gates.length - 1; i > 0; i--) {
      const j = this.rng.uniform(i + 1);
      [gates[i], gates[j]] = [gates[j], gates[i]];
    }

    // Assign first N gates to runners (in iteration order, which is insertion order for Map)
    let gateIndex = 0;
    for (const runner of this.runners.values()) {
      runner.setGate(gates[gateIndex]);
      gateIndex++;
    }
  }

  public validateRaceSetup(): void {
    if (this.runners.size === 0) throw new Error('No runners added to race');
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

    for (const runner of this.runners.values()) {
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

    this.accumulatedTime = 0;
    this.roundIteration = 0;

    return this;
  }

  public prepareRound(masterSeed: number) {
    this.seed = masterSeed;
    this.rng = new Rule30CARng(masterSeed);

    this.assignGates();

    for (const runner of this.runners.values()) {
      // Generate runner-specific RNG
      const runnerRng = new Rule30CARng(this.rng.int32());

      // Setup health policy
      if (this.settings.healthSystem) {
        // Create health policy RNG (separate from runner's main RNG)
        const hpRng = new Rule30CARng(this.rng.int32());
        const healthPolicy = new GameHpPolicy(this.course, this.ground, hpRng);
        runner.setHealthPolicy(healthPolicy);
      } else {
        runner.setHealthPolicy(NoopHpPolicy);
      }

      runner.onPrepare(runnerRng);
    }

    // Increment the round iteration as setup is complete, so this value should not be used until the next round.
    this.roundIteration++;
  }

  /**
   * Steps the race simulation for a given time step.
   *
   * @param dt The time step to advance the simulation by.
   * @param runners The runners to step.
   */
  public onUpdate(dt: number): void {
    this.accumulatedTime += dt;

    // Internally set the pacer.
    // ? Should this be done every frame?
    const pacer = this.getPacer();
    if (pacer) {
      this.pacer = pacer;
    }

    for (const runner of this.runners.values()) {
      if (this.finishedRunners.includes(runner.id)) continue;

      runner.onUpdate(dt);

      if (runner.finished) {
        this.finishedRunners.push(runner.id);
      }
    }
  }

  /**
   * Runs the race simulation
   *
   * This will run until all runners have finished the race
   */
  public run() {
    // Reset the runners to step.
    this.finishedRunners = [];

    // Run the race until all runners have finished.
    while (this.runners.size !== this.finishedRunners.length) {
      this.onUpdate(1 / 15);
    }
  }

  private getPacer() {
    // Select furthest-forward front runner
    for (const strategy of [Strategy.Runaway, Strategy.FrontRunner]) {
      // ! NOTE: might revise this.
      const frontRunners = this.runners
        .values()
        .filter((runner) => runner.positionKeepStrategy === strategy)
        .toArray();

      const firstRunner = frontRunners[0];

      if (frontRunners.length > 0) {
        const pacer = frontRunners.reduce((max, currRunner) => {
          return currRunner.position > max.position ? currRunner : max;
        }, firstRunner);

        return pacer;
      }
    }

    // Get pacerOverride uma
    const pacerOverrideUma = this.pacer;

    if (pacerOverrideUma) {
      return pacerOverrideUma;
    }

    // Otherwise, lucky pace (set pacerOverride)
    for (const strategy of [Strategy.PaceChaser, Strategy.LateSurger, Strategy.EndCloser]) {
      // ! NOTE: might revise this.
      const runnersWithStrat = this.runners
        .values()
        .filter((runner) => StrategyHelpers.strategyMatches(runner.positionKeepStrategy, strategy))
        .toArray();

      const firstRunner = runnersWithStrat[0];

      if (runnersWithStrat.length > 0) {
        const luckyPacer = runnersWithStrat.reduce((max, currRunner) => {
          return currRunner.position > max.position ? currRunner : max;
        }, firstRunner);

        luckyPacer.positionKeepStrategy = Strategy.FrontRunner;

        return luckyPacer;
      }
    }

    // Otherwise, get virtual pacemaker
    // (this should never happen though)
    const pacer = this.pacer;

    if (pacer) {
      pacer.positionKeepStrategy = Strategy.FrontRunner;
      return pacer;
    }

    return null;
  }

  public collectStats(): Array<unknown> {
    throw new Error('Not implemented');
  }

  // === runner management ===

  /**
   * Register a new runner to the race
   */
  public addRunner(params: CreateRunner) {
    const runner = Runner.create(this, this.lastRunnerId, params);
    this.runners.set(this.lastRunnerId, runner);

    this.lastRunnerId++;

    return this;
  }

  // === Settings ===

  public setRushed(rushed: boolean) {
    this.settings.rushed = rushed;
    return this;
  }

  public setDownhill(downhill: boolean) {
    this.settings.downhill = downhill;
    return this;
  }

  public setSpotStruggle(spotStruggle: boolean) {
    this.settings.spotStruggle = spotStruggle;
    return this;
  }

  public setDueling(dueling: boolean) {
    this.settings.dueling = dueling;
    return this;
  }

  public setWitChecks(witChecks: boolean) {
    this.settings.witChecks = witChecks;
    return this;
  }
}
