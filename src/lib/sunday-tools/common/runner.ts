// ===================
// Constants
// ===================

import { CompensatedAccumulator, Timer } from '../simulator.types';
import { PositionKeepState } from '../skills/definitions';
import { Rule30CARng } from '../shared/random';
import { Strategy } from '../runner/definitions';
import {
  Acceleration,
  GroundPowerModifier,
  GroundSpeedModifier,
  PositionKeep,
  Speed,
  StrategyModule,
} from '../shared/definitions';
import { CourseHelpers } from '../course/CourseData';
import { buildSkillData } from '../runner/runner.utils';
import type { IAptitude, IMood, IStrategy } from '../runner/definitions';
import type { HpPolicy } from '../health/health-policy';
import type { PRNG } from '../shared/random';
import type { Race } from './race';
import type { IPositionKeepState } from '../skills/definitions';
import type { CourseData, IGroundCondition, IPhase } from '../course/definitions';
import type { ActiveSkill, PendingSkill } from '../skills/skill.types';

const PhaseDeceleration = [-1.2, -0.8, -1.0];
const BaseAccel = 0.0006;
const UphillBaseAccel = 0.0004;

// ===================
// Types
// ===================

export type StatLine = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wit: number;
};

export type RunnerAptitudes = {
  distance: IAptitude;
  strategy: IAptitude;
  surface: IAptitude;
};

export type CreateRunner = {
  outfitId: string;
  mood: IMood;
  strategy: IStrategy;
  aptitudes: RunnerAptitudes;
  stats: StatLine;
  skills: Array<string>;
};

export type SpeedModifiers = {
  targetSpeed: CompensatedAccumulator;
  currentSpeed: CompensatedAccumulator;
  accel: CompensatedAccumulator;
  oneFrameAccel: number;
  specialSkillDurationScaling: number;
};

/**
 * # Runner Props
 *
 * ## Overview
 *
 * The props for creating a new Runner instance.
 */
export type RunnerProps = {
  id: number;
  umaId: string;
  outfitId: string;
  name: string;
  mood: IMood;
  strategy: IStrategy;
  aptitudes: RunnerAptitudes;
  stats: StatLine;
  skillIds: Array<string>;
};

export abstract class Runner {
  // ===================
  // Constructor Values
  // ===================

  public readonly id: number;
  public readonly umaId: string;
  public readonly outfitId: string;
  public readonly name: string;

  public race: Race;
  public readonly strategy: IStrategy;
  public readonly mood: IMood;
  public readonly aptitudes: Readonly<RunnerAptitudes>;
  public readonly stats: Readonly<StatLine>;
  public readonly _adjustedStats: Readonly<StatLine>;
  public readonly _baseStats: Readonly<StatLine>;

  public readonly skillIds: ReadonlyArray<string>;

  // ===================
  // Resetable Values
  // ===================

  // RNG
  declare public rng: PRNG;
  declare public rushedRng: PRNG;
  declare public witRng: PRNG;
  declare public randomLot: number;

  declare public accumulateTime: Timer;
  declare public timers: Array<Timer>;
  declare public phase: IPhase;
  declare public nextPhaseTransition: number;
  declare public sectionLength: number;

  declare public positionKeepStrategy: IStrategy;
  declare public preRushedPosKeepStrategy: IStrategy;
  declare public baseStats: StatLine;
  declare public adjustedStats: StatLine;

  // Starting Gate
  public startDash = true;
  /**
   * The gate number that the runner is in
   *
   * The value is between 0 and 8, where 0 is the leftmost gate and 8 is the rightmost gate.
   *
   * This value will be set by the RaceSimulator based on the gate roll.
   */
  declare public gate: number | null;
  declare public startDelay: number;
  declare public startDelayAccumulator: number;

  public finished = false;
  declare public position: number;
  declare public currentLane: number;
  declare public targetLane: number;
  declare public extraMoveLane: number;
  declare public laneChangeSpeed: number;
  declare public currentSpeed: number;
  declare public targetSpeed: number;
  declare public forceInSpeed: number;
  declare public minSpeed: number;
  declare public acceleration: number;
  declare public baseAccelerations: Array<number>;
  declare public baseTargetSpeedPerPhase: [number, number, number];
  declare public modifiers: SpeedModifiers;
  declare public sectionModifiers: Array<number>;

  // Race Awareness
  public firstPositionInLateRace = false;

  // Last Spurt
  public isLastSpurt = false;
  public hasAchievedFullSpurt = false;
  declare public lastSpurtSpeed: number;
  declare public lastSpurtTransition: number;
  declare public nonFullSpurtVelocityDiff: number | null;
  declare public nonFullSpurtDelayDistance: number | null;

  // Skills

  /**
   * The number of skills that have been activated by the runner
   */
  declare public skillsActivatedCount: number;
  declare public targetSpeedSkillsActive: Array<ActiveSkill>;
  declare public currentSpeedSkillsActive: Array<ActiveSkill & { naturalDeceleration: boolean }>;
  declare public accelerationSkillsActive: Array<ActiveSkill>;
  declare public laneMovementSkillsActive: Array<ActiveSkill>;
  declare public changeLaneSkillsActive: Array<ActiveSkill>;
  declare public healsActivatedCount: number;
  declare public usedSkills: Set<string>;
  declare public pendingSkillRemoval: Set<string>;
  /**
   * A map of phase to the number of skills that have been activated for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  declare public skillsActivatedPhaseMap: [number, number, number, number];
  /**
   * A map of half race to the number of skills that have been activated for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  declare public skillsActivatedHalfRaceMap: [number, number];
  /**
   * Skills that are pending activation
   */
  declare public pendingSkills: Array<PendingSkill>;

  // Health System
  public outOfHp = false;
  declare public healthPolicy: HpPolicy;
  declare public outOfHpPosition: number | null;

  // Rushed State
  public isRushed = false;
  public hasBeenRushed = false;
  declare public rushedSection: number;
  declare public rushedEnterPosition: number;
  declare public rushedEndPosition: number;
  declare public rushedTimer: Timer;
  declare public rushedMaxDuration: number;
  declare public rushedActivations: Array<[number, number]>;

  // Downhill Mode
  public isDownhillMode = false;
  declare public downhillModeStart: number | null;
  declare public lastDownhillCheckFrame: number;

  // Spot Struggle
  public inSpotStruggle = false;
  public hasSpotStruggle = false;
  declare public spotStruggleTimer: Timer;
  declare public spotStruggleStartPosition: number | null;
  declare public spotStruggleEndPosition: number;

  // Dueling
  public isDueling = false;
  public hasDueled = false;
  declare public canDuel: boolean | null;
  declare public duelingTimer: Timer;
  declare public duelingStartPosition: number;
  declare public duelingEndPosition: number;

  // Position Keep
  declare public positionKeepState: IPositionKeepState;
  declare public posKeepSpeedCoef: number;
  declare public posKeepNextTimer: Timer;
  declare public posKeepExitDistance: number;
  declare public posKeepExitPosition: number;
  declare public posKeepMinThreshold: number;
  declare public posKeepMaxThreshold: number;
  declare public posKeepEnd: number;
  declare public positionKeepActivations: Array<[number, number, IPositionKeepState]>;

  // Hills
  declare public hills: Array<{ start: number; end: number; slope: number }>;
  declare public currentHillIndex: number;
  declare public nextHillToCheck: number;
  declare public slopePer: number;
  declare public slopePenalties: Array<number>;

  constructor(race: Race, props: RunnerProps) {
    this.race = race;

    this.id = props.id;
    this.umaId = props.umaId;
    this.outfitId = props.outfitId;
    this.name = props.name;

    this.strategy = props.strategy;
    this.positionKeepStrategy = props.strategy;
    this.mood = props.mood;
    this.aptitudes = props.aptitudes;
    this.stats = props.stats;
    this._baseStats = buildBaseStats(props.stats, props.mood);
    this._adjustedStats = buildAdjustedStats(
      this._baseStats,
      race.course,
      race.ground,
      props.aptitudes.strategy,
    );
    this.skillIds = props.skillIds;
  }

  /**
   * This method acts as a "reset" method so it can be used for reusing this instance for another round.
   */
  public onPrepare(masterSeed: number): void {
    this.timers = [];
    this.accumulateTime = this.createTimer(-1.0);

    this.baseStats = { ...this._baseStats };
    this.adjustedStats = { ...this._adjustedStats };

    this.modifiers = {
      targetSpeed: new CompensatedAccumulator(0.0),
      currentSpeed: new CompensatedAccumulator(0.0),
      accel: new CompensatedAccumulator(0.0),
      oneFrameAccel: 0.0,
      specialSkillDurationScaling: 1.0,
    };

    // Initialize values

    // [0, 1, 2] = normal phases
    // [3, 4, 5] = uphill phases (use UphillBaseAccel)
    this.baseAccelerations = [0, 1, 2, 0, 1, 2].map((phase, i) =>
      this.calculatePhaseBaseAccel(i > 2 ? UphillBaseAccel : BaseAccel, phase),
    );
    this.slopePenalties = this.race.course.slopes.map(
      (s) => ((s.slope / 10000.0) * 200.0) / this.adjustedStats.power,
    );

    this.initializePositionKeep();
  }

  public onUpdate(dt: number): void {
    this.updateTimers(dt);

    const shouldSkipUpdate = this.updateStartDelay(dt);
    if (shouldSkipUpdate) return;

    this.updateHills();
    this.updatePhase();
    this.updateRushed();
    this.updateDownhillMode();
    this.processSkillActivations();
    this.applyPositionKeepStates();
    this.updatePositionKeepCoefficient();
    this.updateDueling();
    this.updateSpotStruggle();
    this.updateLastSpurtState();
    this.updateTargetSpeed();
    this.applyForces();
    this.applyLaneMovement();
  }

  // ===================
  // Update Methods
  // ===================

  private updateTimers(dt: number): void {
    for (const timer of this.timers) {
      timer.t += dt;
    }
  }

  private updateStartDelay(dt: number): boolean {
    if (this.startDelayAccumulator > 0.0) {
      this.startDelayAccumulator -= dt;

      if (this.startDelayAccumulator > 0.0) {
        return true;
      }
    }

    return false;
  }

  // ===================
  // Getters
  // ===================

  /**
   * Calculates the chance of the runner being rushed (in percent).
   *
   * Formula: RushedChance = (6.5 / log10(0.1 * Wits + 1))²%
   */
  private get baseRushedChance(): number {
    const wisdomStat = this.adjustedStats.wit;

    return Math.pow(6.5 / Math.log10(0.1 * wisdomStat + 1), 2) / 100;
  }

  private get hasSelfControl(): boolean {
    return this.pendingSkills.some((s) => s.skillId === '202161');
  }

  private get rushedChance(): number {
    return this.baseRushedChance - (this.hasSelfControl ? 0.03 : 0);
  }

  public get maxStartDashSpeed(): number {
    return Math.min(this.targetSpeed, 0.85 * this.race.baseSpeed);
  }

  public get baseStrategy(): IStrategy {
    if (this.strategy === Strategy.Runaway) {
      return Strategy.FrontRunner;
    }

    return this.strategy;
  }

  private get isOnFinalStraight() {
    const course = this.race.course;
    const lastStraight = course.straights[course.straights.length - 1];

    return this.position >= lastStraight.start && this.position <= lastStraight.end;
  }

  private get isAfterFinalCorner() {
    const course = this.race.course;

    const finalCornerStart =
      course.corners.length > 0 ? course.corners[course.corners.length - 1].start : Infinity;

    return this.position >= finalCornerStart;
  }

  private get isAfterFinalCornerOrInFinalStraight() {
    return this.isAfterFinalCorner || this.isOnFinalStraight;
  }

  // ===================
  // Setters
  // ===================

  public setHealthPolicy(healthPolicy: HpPolicy) {
    this.healthPolicy = healthPolicy;
    return this;
  }

  public setGate(gate: number | null) {
    this.gate = gate;
    return this;
  }

  // ===================
  // Methods
  // ===================

  /**
   * Create a new timer and register it
   * @param initialValue Initial timer value (default 0)
   */
  protected createTimer(initialValue: number = 0): Timer {
    const timer = new Timer(initialValue);
    this.timers.push(timer);
    return timer;
  }

  private calculatePhaseTargetSpeed(phase: number): number {
    const phaseCoefficient = Speed.StrategyPhaseCoefficient[this.strategy][phase];
    const baseTargetSpeed = this.race.baseSpeed * phaseCoefficient;

    if (phase === 2) {
      const proficiencyModifier = Speed.DistanceProficiencyModifier[this.aptitudes.distance];
      return (
        baseTargetSpeed + Math.sqrt(500.0 * this.adjustedStats.speed) * proficiencyModifier * 0.002
      );
    }

    return baseTargetSpeed;
  }

  private calculateLastSpurtSpeed(): number {
    if (!this.baseTargetSpeedPerPhase) throw new Error('Base target speed per phase not set');

    const courseBaseSpeed = this.race.baseSpeed;
    const lateRaceTargetSpeed = this.baseTargetSpeedPerPhase[2];
    const proficiencyModifier = Speed.DistanceProficiencyModifier[this.aptitudes.distance];

    let result =
      (lateRaceTargetSpeed + 0.01 * courseBaseSpeed) * 1.05 +
      Math.sqrt(500.0 * this.adjustedStats.speed) * proficiencyModifier * 0.002;

    // Add guts component
    result += Math.pow(450.0 * this.adjustedStats.guts, 0.597) * 0.0001;

    return result;
  }

  // ====================
  // Initializers
  // ====================

  private initializeRng(seed: number) {
    this.rng = new Rule30CARng(seed);

    this.rushedRng = new Rule30CARng(this.rng.int32());
    this.witRng = new Rule30CARng(this.rng.int32());

    // Random lot for various skill conditions
    this.randomLot = this.rng.uniform(100);
  }

  private initializePositionKeep() {
    this.positionKeepState = PositionKeepState.None;
    this.posKeepNextTimer = this.createTimer();
    this.posKeepSpeedCoef = 1.0;
    this.posKeepExitDistance = 0.0;
    this.posKeepExitPosition = 0.0;
    this.posKeepMinThreshold = PositionKeep.minThreshold(this.strategy, this.race.course.distance);
    this.posKeepMaxThreshold = PositionKeep.maxThreshold(this.strategy, this.race.course.distance);
    this.positionKeepActivations = [];
    this.posKeepEnd = this.calculatePosKeepEnd();
  }

  /**
   * Initialize phase tracking
   * Phases: 0 (early), 1 (mid), 2 (late), last spurt
   */
  private initializePhaseTracking(): void {
    this.phase = 0;
    this.nextPhaseTransition = CourseHelpers.phaseStart(this.race.course.distance, 1);
    this.sectionLength = this.race.course.distance / 24.0;

    // Race Tracking
    this.firstPositionInLateRace = false;
  }

  private initializeRushedState() {
    if (!this.rushedRng) throw new Error('Rushed RNG not set');
    if (!this.sectionLength) throw new Error('Section length not set');

    this.isRushed = false;
    this.hasBeenRushed = false;
    this.rushedSection = -1;
    this.rushedEnterPosition = -1;
    this.rushedEndPosition = -1;
    this.rushedTimer = this.createTimer();
    this.rushedMaxDuration = 12.0;
    this.rushedActivations = [];

    if (this.rushedRng.random() < this.rushedChance) {
      // Determine which section (2-9) the rushed state activates in
      this.rushedSection = 2 + this.rushedRng.uniform(8); // Random int from 2 to 9
      this.rushedEnterPosition = this.sectionLength * this.rushedSection;
    }
  }

  /**
   * Calculate speed values for each phase and last spurt
   * Must be called after gate skills activate (they can modify stats)
   */
  private initializeSpeedCalculations(): void {
    // Base target speeds for each phase [early, mid, late]
    this.baseTargetSpeedPerPhase = [0, 1, 2].map((phase) =>
      this.calculatePhaseTargetSpeed(phase),
    ) as [number, number, number];

    // Last spurt (final sprint) speed
    this.lastSpurtSpeed = this.calculateLastSpurtSpeed();

    // Minimum speed (prevents slowing below this after start dash)
    this.minSpeed = 0.85 * this.race.baseSpeed + Math.sqrt(200.0 * this.adjustedStats.guts) * 0.001;

    // Section modifiers (wisdom-based random variance per 1/24 section)
    this.sectionModifiers = Array.from({ length: 24 }, () => {
      const max = (this.adjustedStats.wit / 5500.0) * Math.log10(this.adjustedStats.wit * 0.1);
      const factor = (max - 0.65 + this.witRng.random() * 0.65) / 100.0;
      return this.race.baseSpeed * factor;
    });

    // Add sentinel for race end
    this.sectionModifiers.push(0.0);

    const strategyModifer = StrategyModule.forceInSpeedModifier[this.strategy];
    this.forceInSpeed = this.rng.uniform(100) * strategyModifer;
  }

  private initializeSkillTracking() {
    // Active skill arrays (duration-based effects)
    this.targetSpeedSkillsActive = [];
    this.currentSpeedSkillsActive = [];
    this.accelerationSkillsActive = [];
    this.laneMovementSkillsActive = [];
    this.changeLaneSkillsActive = [];

    // Activation counters
    this.skillsActivatedCount = 0;
    this.skillsActivatedPhaseMap = [0, 0, 0, 0];
    this.skillsActivatedHalfRaceMap = [0, 0];
    this.healsActivatedCount = 0;

    this.pendingSkills = [];
    this.usedSkills = new Set();
    this.pendingSkillRemoval = new Set();

    // Populate Pending Skills
    const skillTrigers = this.skillIds.flatMap((skillId) =>
      buildSkillData({
        runner: this,
        raceParams: {
          ground: this.race.ground,
          timeOfDay: this.race.timeOfDay,
          weather: this.race.weather,
          grade: this.race.grade,
          season: this.race.season,
        },
        course: this.race.course,
        wholeCourse: this.race.wholeCourse,
        parser: this.race.parser,
        skillId: skillId,
        ignoreNullEffects: false,
      }),
    );

    const triggers = skillTrigers.map((skillTrigger) => {
      // As I've that the override is not being used in other compare files, i'll just use the one that comes with the trigger.
      const samplePolicy = skillTrigger.samplePolicy;
      return samplePolicy.sample(skillTrigger.regions, this.race.skillSamples, this.skillRng);
    });

    const roundIteration = this.race.roundIteration;

    this.pendingSkills = skillTrigers.map((skillTrigger, index) => ({
      skillId: skillTrigger.skillId,
      rarity: skillTrigger.rarity,
      trigger: triggers[index][roundIteration % triggers[index].length],
      extraCondition: skillTrigger.extraCondition,
      effects: skillTrigger.effects,
    }));
  }

  /**
   * Initialize position, speed, and start delay
   * Sets the runner at the starting gate
   */
  private initializeMovementState(): void {
    if (!this.rng) throw new Error('RNG not set');
    if (!this.modifiers) throw new Error('Modifiers not set');

    // Start at gate (position 0)
    this.position = 0.0;
    this.acceleration = 0.0;
    this.currentSpeed = 3.0; // Initial speed at gate
    this.targetSpeed = 0.85 * this.race.baseSpeed;

    // Start dash state
    this.startDash = true;
    this.startDelay = 0.1 * this.rng.random(); // Random 0-100ms delay
    this.startDelayAccumulator = this.startDelay;
    this.modifiers.accel.add(24.0); // Start dash acceleration boost

    // Reset finished state
    this.finished = false;
  }

  private initializeDownhillMode() {
    this.isDownhillMode = false;
    this.downhillModeStart = null;
    this.lastDownhillCheckFrame = 0;
  }

  private initializeHealthPolicy() {
    if (!this.healthPolicy) {
      throw new Error('Health policy not set');
    }

    this.healthPolicy.init(this);
    this.outOfHp = false;
  }

  private initializeDueling() {
    this.isDueling = false;
    this.canDuel = null;
    this.hasDueled = false;
    this.duelingTimer = this.createTimer();
    this.duelingStartPosition = -1;
    this.duelingEndPosition = -1;
  }

  private initializeSpotStruggle() {
    this.inSpotStruggle = false;
    this.hasSpotStruggle = false;
    this.spotStruggleTimer = this.createTimer();
    this.spotStruggleStartPosition = null;
    this.spotStruggleEndPosition = -1;
  }

  private initializeHills() {
    if (!CourseHelpers.isSortedByStart(this.race.course.slopes)) {
      throw new Error('slopes must be sorted by start location');
    }

    this.currentHillIndex = -1;
    this.nextHillToCheck = 0;
    this.hills = this.race.course.slopes.map((s) => ({
      start: s.start,
      end: s.start + s.length,
      slope: s.slope,
    }));
    this.slopePer = 0.0;
  }

  private initializeLastSpurt() {
    this.isLastSpurt = false;
    this.lastSpurtTransition = -1;
    this.lastSpurtSpeed = 0.0;
    this.hasAchievedFullSpurt = false;
    this.nonFullSpurtVelocityDiff = null;
    this.nonFullSpurtDelayDistance = null;
  }

  private initializeLaneState() {
    if (this.gate === null) {
      throw new Error('Gate not set');
    }

    // Calculate initial lane from gate
    const initialLane = this.gate * this.race.course.horseLane;

    this.currentLane = initialLane;
    this.targetLane = initialLane;
    this.laneChangeSpeed = 0.0;
    this.extraMoveLane = -1.0;
    this.forceInSpeed = 0.0;
  }

  /**
   * Activate gate skills (green skills that activate at race start)
   * Must be called before min speed calculation (can modify guts)
   */
  private activateGateSkills(): void {
    this.processSkillActivations();
  }

  protected abstract calculatePosKeepEnd(): number;

  private calculatePhaseBaseAccel(accelModifier: number, phase: number): number {
    const strategyCoefficient = Acceleration.StrategyPhaseCoefficient[this.strategy][phase];
    const groundTypeProficiencyModifier =
      Acceleration.GroundTypeProficiencyModifier[this.aptitudes.surface];
    const distanceProficiencyModifier =
      Acceleration.DistanceProficiencyModifier[this.aptitudes.distance];

    return (
      accelModifier *
      Math.sqrt(500.0 * this.adjustedStats.power) *
      strategyCoefficient *
      groundTypeProficiencyModifier *
      distanceProficiencyModifier
    );
  }
}

const adjustOvercap = (stat: number): number => {
  return stat > 1200 ? 1200 + Math.floor((stat - 1200) / 2) : stat;
};

export const calculateMoodCoefficient = (mood: IMood): number => {
  return 1 + 0.02 * mood;
};

const buildBaseStats = (stats: StatLine, mood: IMood): StatLine => {
  const moodCoefficient = calculateMoodCoefficient(mood);

  return {
    speed: adjustOvercap(stats.speed) * moodCoefficient,
    stamina: adjustOvercap(stats.stamina) * moodCoefficient,
    power: adjustOvercap(stats.power) * moodCoefficient,
    guts: adjustOvercap(stats.guts) * moodCoefficient,
    wit: adjustOvercap(stats.wit) * moodCoefficient,
  };
};

const calculateSpeedModifier = (course: CourseData, stats: StatLine): number => {
  const statvalues = [0, stats.speed, stats.stamina, stats.power, stats.guts, stats.wit].map((x) =>
    Math.min(x, 901),
  );

  return (
    1 +
    course.courseSetStatus
      .map((stat) => (1 + Math.floor(statvalues[stat] / 300.01)) * 0.05)
      .reduce((a, b) => a + b, 0) /
      Math.max(course.courseSetStatus.length, 1)
  );
};

const buildAdjustedStats = (
  stats: StatLine,
  course: CourseData,
  ground: IGroundCondition,
  strategyAptitude: IAptitude,
): StatLine => {
  const speedModifier = calculateSpeedModifier(course, stats);
  const groundModifier = GroundSpeedModifier[course.surface][ground];
  const surfaceModifier = GroundPowerModifier[course.surface][ground];
  const strategyAptitudeModifier = StrategyModule.aptitudeModifier[strategyAptitude];

  return {
    speed: Math.max(stats.speed * speedModifier + groundModifier, 1),
    stamina: stats.stamina,
    power: Math.max(stats.power + surfaceModifier, 1),
    guts: stats.guts,
    wit: stats.wit * strategyAptitudeModifier,
  };
};
