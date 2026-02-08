import { Acceleration, CompensatedAccumulator, Speed, Timer } from '../lib/core/RaceSolver';
import { CourseHelpers } from '../lib/course/CourseData';
import { Rule30CARng } from '../lib/utils/Random';
import { Strategy } from '../lib/runner/definitions';
import {
  GroundPowerModifier,
  GroundSpeedModifier,
  StrategyProficiencyModifier,
} from '../lib/core/RaceSolverBuilder';
import type { IAptitude, IMood, IStrategy } from '../lib/runner/definitions';
import type { IPositionKeepState } from '../lib/skills/definitions';
import type { PRNG } from '../lib/utils/Random';
import type { HpPolicy } from './health/health-policy';
import type { RaceSimulator } from './race-simulator';
import type {
  CourseData,
  IGroundCondition,
  IPhase,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '../lib/course/definitions';
import type { ActiveSkill, PendingSkill } from '../lib/core/RaceSolver';

const BaseAccel = 0.0006;
const UphillBaseAccel = 0.0004;

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

  course: CourseData;
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
};

/**
 * # Runner Props
 *
 * ## Overview
 *
 * The props for creating a new Runner instance.
 */
export type RunnerProps = {
  id: string;
  umaId: string;
  outfitId: string;
  name: string;
  mood: IMood;
  strategy: IStrategy;
  aptitudes: RunnerAptitudes;
  stats: StatLine;
  rawStats: StatLine;
  skillIds: Array<string>;
};

export type SpeedModifiers = {
  targetSpeed: CompensatedAccumulator;
  currentSpeed: CompensatedAccumulator;
  accel: CompensatedAccumulator;
  oneFrameAccel: number;
  specialSkillDurationScaling: number;
};

/**
 * # Runner
 *
 * ## Overview
 *
 * The class for representing a runner in the race that will be simulated.
 *
 */
export class Runner {
  declare public race: RaceSimulator;

  /**
   * Unique ID for the runner
   *
   * Generated automatically by the RaceSimulator and set to the
   */
  public internalId: string;

  /**
   * The Base Umamusume ID that this runner represents
   *
   * Default: `0001` for Mobs
   *
   * Example:
   * - `1001` for `Special Week`
   */
  public umaId: string;

  /**
   *  Outfit ID for the runner
   *
   * Default:
   *  - `00101` for Mobs
   *
   * Examples:
   * - `100101` for `[Special Dreamer]` outfit
   * - `100102` for `[Hopp'n♪Happy Heart]` outfit
   */
  public outfitId: string;

  /**
   * The name of the runner
   *
   * Value is either <Random Name> or the name of the Umamusume that this runner represents
   *
   * Examples:
   * - `Special Week`
   * - `Silence Suzuka`
   */
  public name: string;

  public mood: IMood;
  public strategy: IStrategy;

  public stats: StatLine;
  public rawStats: StatLine;

  public aptitudes: RunnerAptitudes;

  public skillIds: Array<string>;

  declare public rng: PRNG;
  declare public rushedRng: PRNG;
  declare public downhillRng: PRNG;
  declare public posKeepRng: PRNG;
  declare public laneMovementRng: PRNG;
  declare public witRng: PRNG;

  /**
   * The gate number that the runner is in
   *
   * The value is between 1 and 9, where 1 is the leftmost gate and 9 is the rightmost gate.
   *
   * This value will be set by the RaceSimulator based on the gate roll.
   */
  declare public gate: number;
  declare public slopePenalties: Array<number>;

  declare public sectionModifiers: Array<number>;
  declare public baseAccel: Array<number>;
  declare public baseTargetSpeedPerPhase: [number, number, number];

  declare public isLastSpurt: boolean;
  declare public lastSpurtSpeed: number;
  declare public lastSpurtTransition: number;
  declare public hasAchievedFullSpurt: boolean;

  // ===================
  // Starting Gate
  // ===================
  declare public startDash: boolean;
  declare public startDelay: number;
  declare public startDelayAccumulator: number;

  /**
   * Current lane the runner is in
   */
  declare public currentLane: number;
  declare public position: number;
  /**
   * Whether the runner has finished the race.
   *
   * This is set to true when the runner crosses the finish line (reaches the courses distance).
   */
  declare public hasFinishedRace: boolean;
  declare public currentSpeed: number;
  declare public targetSpeed: number;
  declare public acceleration: number;
  declare public modifiers: SpeedModifiers;

  /**
   * The health policy for the runner that determines how much HP is consumed and how much is recovered.
   */
  declare public healthPolicy: HpPolicy;
  /**
   * Whether the runner has run out of HP and cannot maintain top speed at the last spurt.
   */
  declare public outOfHp: boolean;

  /**
   * Whether the runner is currently in rushed mode
   */
  declare public isRushed: boolean;

  // === Skill Tracking ===

  /**
   * The number of skills that have been activated by the runner
   */
  declare public skillsActivatedCount: number;

  declare public targetSpeedSkillsActive: Array<ActiveSkill>;
  declare public currentSpeedSkillsActive: Array<ActiveSkill & { naturalDeceleration: boolean }>;
  declare public accelerationSkillsActive: Array<ActiveSkill>;
  declare public laneMovementSkillsActive: Array<ActiveSkill>;
  declare public changeLaneSkillsActive: Array<ActiveSkill>;

  /**
   * The number of heals that have been activated by the runner
   */
  declare public healsActivatedCount: number;

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
  /**
   * Skills that are targeted by other runners
   */
  declare public targetedSkills: Array<PendingSkill>;

  // ===================
  // Overtake
  // ===================

  /**
   * The number of times the runner has overtaken another runner
   */
  declare public overtakeCount: number;

  /**
   * A map of phase to the number of times the runner has overtaken another runner for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  declare public overtakeCountPerPhaseMap: [number, number, number, number];

  /**
   * A map of half race to the number of times the runner has overtaken another runner for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  declare public overtakeCountPerHalfRaceMap: [number, number];

  // ===================
  // Spot Struggle
  // ===================

  /**
   * Whether the runner is currently in spot struggle.
   */
  declare public inSpotStruggle: boolean;
  /**
   * The timer for the spot struggle.
   *
   * Counts for how long the runner has been in spot struggle.
   */
  declare public spotStruggleTimer: Timer;
  declare public spotStruggleStartPosition: number;
  declare public spotStruggleEndPosition: number;
  /**
   * The IDs of the runners that this runner is spot struggling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  declare public spotStruggleTargets: Set<string>;
  /**
   * Whether the runner has been in spot struggle at the start of the race.
   */
  declare public hasSpotStruggle: boolean;

  // ===================
  // Dueling
  // ===================

  /**
   * Whether the runner is currently dueling with another runner.
   */
  declare public isDueling: boolean;
  /**
   * The timer for the dueling.
   *
   * Counts for how long the runner has been in dueling.
   */
  declare public duelingTimer: Timer;
  declare public duelingStartPosition: number;
  declare public duelingEndPosition: number;
  /**
   * The IDs of the runners that this runner is dueling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  declare public duelTargets: Set<string>;
  /**
   * Whether the runner has dueled in the last spurt of this race.
   */
  declare public hasDueled: boolean;

  declare public positionKeepState: IPositionKeepState;

  // ===================
  // Hills
  // ===================

  /**
   * The index of the current hill that the runner is on.
   */
  declare public currentHillIndex: number;
  /**
   * The index of the next hill that the runner needs to check.
   */
  declare public nextHillToCheck: number;
  /**
   * The hills on the course.
   */
  declare public hills: Array<{ start: number; end: number; slope: number }>;

  declare public timers: Array<Timer>;
  declare public accumulateTime: Timer;
  declare public conditionTimer: Timer;
  declare public phase: IPhase;
  declare public nextPhaseTransition: number;
  declare public sectionLength: number;
  declare public baseSpeed: number;
  declare public minSpeed: number;
  declare public gateRoll: number;
  declare public randomLot: number;
  declare public usedSkills: Set<string>;
  declare public pendingSkillRemoval: Set<string>;
  declare public rushedMaxDuration: number;
  declare public rushedActivations: Array<[number, number]>;
  declare public positionKeepActivations: Array<[number, number, IPositionKeepState]>;
  declare public extraMoveLane: number;
  declare public forceInSpeed: number;
  declare public lastDownhillCheckFrame: number;
  declare public targetLane: number;
  declare public laneChangeSpeed: number;
  declare public isDownhillMode: boolean;
  declare public downhillModeStart: null;
  declare public firstUmaInLateRace: boolean;
  declare public hasBeenRushed: boolean;
  declare public rushedSection: number;
  declare public rushedEnterPosition: number;
  declare public rushedEndPosition: number;
  declare public rushedTimer: Timer;

  constructor(props: RunnerProps) {
    // From props
    this.internalId = props.id;

    // Thought: Mood could be made so it could be randomly set per race as an option in the UI.
    this.mood = props.mood;

    this.stats = props.stats;
    this.rawStats = props.rawStats;

    this.strategy = props.strategy;
    this.aptitudes = props.aptitudes;
    this.skillIds = props.skillIds;

    // === Umamusume related ===
    this.umaId = props.umaId;
    this.outfitId = props.outfitId;
    this.name = props.name;
  }

  // === Setup ===

  public setHealthPolicy(healthPolicy: HpPolicy) {
    this.healthPolicy = healthPolicy;
    return this;
  }

  public setGate(gate: number) {
    this.gate = gate;
    return this;
  }

  public setRaceSimulator(race: RaceSimulator) {
    this.race = race;
    return this;
  }

  public setupRng(rng: PRNG) {
    // Copy the master RNG
    this.rng = rng;

    // Derived RNGs
    this.rushedRng = new Rule30CARng(rng.int32());
    this.downhillRng = new Rule30CARng(rng.int32());
    this.posKeepRng = new Rule30CARng(rng.int32());
    this.laneMovementRng = new Rule30CARng(rng.int32());
    this.witRng = new Rule30CARng(rng.int32());

    return this;
  }

  // === Runtime ===

  // ==========================================
  // INITIALIZATION METHODS (alphabetically organized)
  // ==========================================

  /**
   * Calculate and cache acceleration values for each phase
   * Must be called after speed calculations
   */
  private initializeAccelerationValues(): void {
    // [0, 1, 2] = normal phases
    // [3, 4, 5] = uphill phases (use UphillBaseAccel)
    this.baseAccel = [0, 1, 2, 0, 1, 2].map((phase, i) =>
      this.calculatePhaseBaseAccel(i > 2 ? UphillBaseAccel : BaseAccel, phase),
    );
  }

  /**
   * Cache frequently-accessed values for performance
   * Includes baseSpeed and slope penalties
   */
  private initializeCachedValues(): void {
    // Base speed is course-dependent constant
    this.baseSpeed = this.race.baseSpeed;

    // Cache slope penalties to avoid recalculating each hill
    this.slopePenalties = this.race.course.slopes.map(
      (s) => ((s.slope / 10000.0) * 200.0) / this.stats.power,
    );
  }

  /**
   * Initialize dueling and spot struggle tracking
   * These track multi-runner interactions
   */
  private initializeCompetitionTracking(): void {
    // === Dueling ===
    this.isDueling = false;
    this.hasDueled = false;
    this.duelingTimer = this.createTimer();
    this.duelingStartPosition = -1;
    this.duelingEndPosition = -1;
    this.duelTargets = new Set();

    // === Spot Struggle ===
    this.inSpotStruggle = false;
    this.hasSpotStruggle = false;
    this.spotStruggleTimer = this.createTimer();
    this.spotStruggleStartPosition = -1;
    this.spotStruggleEndPosition = -1;
    this.spotStruggleTargets = new Set();
  }

  /**
   * Initialize downhill mode state
   * Downhill mode can increase acceleration on downhill slopes
   */
  private initializeDownhillState(): void {
    this.isDownhillMode = false;
    this.downhillModeStart = null;
    this.lastDownhillCheckFrame = 0;
  }

  /**
   * Initialize health/stamina policy
   * Must be called after speed calculations
   */
  private initializeHealthPolicy(): void {
    this.healthPolicy.init(this);
    this.outOfHp = false;
    this.hasAchievedFullSpurt = false;
  }

  /**
   * Initialize hill tracking state
   * Sets up indices for efficient hill detection during race
   */
  private initializeHillTracking(): void {
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
  }

  /**
   * Initialize lane position and movement state
   * Lane is determined by gate number
   */
  private initializeLaneState(): void {
    // Calculate initial lane from gate
    const gateNumberRaw = this.gateRoll % 9;
    const gateNumber = gateNumberRaw < 9 ? gateNumberRaw : 1 + ((24 - gateNumberRaw) % 8);
    const initialLane = gateNumber * this.race.course.horseLane;

    this.currentLane = initialLane;
    this.targetLane = initialLane;
    this.laneChangeSpeed = 0.0;
    this.extraMoveLane = -1.0;
    this.forceInSpeed = 0.0;
  }

  /**
   * Initialize speed modifier accumulators
   * These track temporary skill effects on speed/accel
   */
  private initializeModifiers(): void {
    this.modifiers = {
      targetSpeed: new CompensatedAccumulator(0.0),
      currentSpeed: new CompensatedAccumulator(0.0),
      accel: new CompensatedAccumulator(0.0),
      oneFrameAccel: 0.0,
      specialSkillDurationScaling: 1.0,
    };
  }

  /**
   * Initialize position, speed, and start delay
   * Sets the runner at the starting gate
   */
  private initializeMovementState(): void {
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

    // Not finished yet
    this.hasFinishedRace = false;
  }

  /**
   * Initialize phase tracking
   * Phases: 0 (early), 1 (mid), 2 (late), last spurt
   */
  private initializePhaseTracking(): void {
    this.phase = 0;
    this.nextPhaseTransition = CourseHelpers.phaseStart(this.race.course.distance, 1);
    this.sectionLength = this.race.course.distance / 24.0;

    // Last spurt tracking
    this.isLastSpurt = false;
    this.lastSpurtTransition = -1;

    // First place tracking (for angling/scheming skills)
    // TODO: replace this later
    this.firstUmaInLateRace = false;
  }

  /**
   * Initialize random values used throughout race
   * These are drawn once at race start
   */
  private initializeRandomValues(): void {
    // Gate roll for position calculation
    // Uses LCM trick for uniform distribution when modding by numUmas
    this.gateRoll = this.rng.uniform(12252240);

    // Random lot for various skill conditions
    this.randomLot = this.rng.uniform(100);
  }

  /**
   * Initialize rushed state
   * Determines if/when runner will enter rushed state
   */
  private initializeRushedState(): void {
    if (!this.race.settings.rushed) {
      this.isRushed = false;
      this.hasBeenRushed = false;
      this.rushedSection = -1;
      this.rushedEnterPosition = -1;
      this.rushedEndPosition = -1;
      this.rushedTimer = this.createTimer();
      this.rushedMaxDuration = 12.0;
      this.rushedActivations = [];
      return;
    }

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
   * Initialize skill tracking arrays and counters
   * These track active and pending skills
   */
  private initializeSkillTracking(): void {
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

    // Pending skills (will be set by RaceSimulator)
    this.pendingSkills = [];
    this.targetedSkills = [];
    this.usedSkills = new Set();
    this.pendingSkillRemoval = new Set();

    // Overtake tracking
    this.overtakeCount = 0;
    this.overtakeCountPerPhaseMap = [0, 0, 0, 0];
    this.overtakeCountPerHalfRaceMap = [0, 0];
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
    this.minSpeed = 0.85 * this.race.baseSpeed + Math.sqrt(200.0 * this.stats.guts) * 0.001;

    // Section modifiers (wisdom-based random variance per 1/24 section)
    this.sectionModifiers = Array.from({ length: 24 }, () => {
      if (!this.race.settings.sectionModifier) {
        return 0.0;
      }

      const max = (this.stats.wit / 5500.0) * Math.log10(this.stats.wit * 0.1);
      const factor = (max - 0.65 + this.witRng.random() * 0.65) / 100.0;
      return this.race.baseSpeed * factor;
    });

    // Add sentinel for race end
    this.sectionModifiers.push(0.0);
  }

  /**
   * Initialize timer system
   * Creates base timers used throughout race
   */
  private initializeTimers(): void {
    this.timers = [];
    this.accumulateTime = this.createTimer(0.0);
    this.conditionTimer = this.createTimer(-1.0);
  }

  // ==========================================
  // SPECIAL INITIALIZATION
  // ==========================================

  /**
   * Activate gate skills (green skills that activate at race start)
   * Must be called before min speed calculation (can modify guts)
   */
  private activateGateSkills(): void {
    // This will be implemented when skill system is ready
    // For now, placeholder
    // this.processSkillActivations();
  }

  /**
   * Register dynamic conditions for skill system
   * Conditions like blocked_side, overtake, etc.
   */
  private registerConditions(): void {
    // Will be implemented when condition system is ready
    // this.registerBlockedSideCondition();
    // this.registerOvertakeCondition();
  }

  private validateInitialization(): void {
    if (!this.race) throw new Error('Race not set');
    if (!this.rng) throw new Error('RNG not set');
    if (!this.healthPolicy) throw new Error('Health policy not set');
    if (!this.gateRoll) throw new Error('Gate roll not set');
  }

  public onRaceSetup() {
    this.validateInitialization();
  }

  public onRaceStart(): void {
    // 2. Initialize core systems
    this.initializeTimers();
    this.initializeRandomValues();
    this.initializePhaseTracking();

    // 3. Initialize tracking systems
    this.initializeSkillTracking();
    this.initializeCompetitionTracking();

    // 4. Initialize physical state
    this.initializeLaneState();
    this.initializeMovementState();
    this.initializeModifiers();

    // 5. Calculate derived values
    this.initializeCachedValues();
    this.initializeSpeedCalculations();
    this.initializeAccelerationValues();

    // 6. Initialize mechanics
    this.initializeHillTracking();
    this.initializeRushedState();
    this.initializeDownhillState();

    // 7. Initialize health system
    this.initializeHealthPolicy();

    // 8. Activate gate skills (must be before min speed calc)
    this.activateGateSkills();

    // 9. Register dynamic conditions
    this.registerConditions();
  }

  private calculatePhaseBaseAccel(accelModifier: number, phase: number): number {
    const strategyCoefficient = Acceleration.StrategyPhaseCoefficient[this.strategy][phase];
    const groundTypeProficiencyModifier =
      Acceleration.GroundTypeProficiencyModifier[this.aptitudes.surface];
    const distanceProficiencyModifier =
      Acceleration.DistanceProficiencyModifier[this.aptitudes.distance];

    // Accel = BaseAccel * sqrt(500.0 * PowerStat) * StrategyPhaseCoefficient * GroundTypeProficiencyModifier * DistanceProficiencyModifier
    return (
      accelModifier *
      Math.sqrt(500.0 * this.stats.power) *
      strategyCoefficient *
      groundTypeProficiencyModifier *
      distanceProficiencyModifier
    );
  }

  private calculatePhaseTargetSpeed(phase: number): number {
    const phaseCoefficient = Speed.StrategyPhaseCoefficient[this.strategy][phase];
    const baseTargetSpeed = this.race.baseSpeed * phaseCoefficient;

    if (phase === 2) {
      const proficiencyModifier = Speed.DistanceProficiencyModifier[this.aptitudes.distance];
      return baseTargetSpeed + Math.sqrt(500.0 * this.stats.speed) * proficiencyModifier * 0.002;
    }

    return baseTargetSpeed;
  }

  private calculateLastSpurtSpeed(): number {
    const courseBaseSpeed = this.race.baseSpeed;
    const lateRaceTargetSpeed = this.baseTargetSpeedPerPhase[2];
    const proficiencyModifier = Speed.DistanceProficiencyModifier[this.aptitudes.distance];

    let result =
      (lateRaceTargetSpeed + 0.01 * courseBaseSpeed) * 1.05 +
      Math.sqrt(500.0 * this.stats.speed) * proficiencyModifier * 0.002;

    // Add guts component
    result += Math.pow(450.0 * this.stats.guts, 0.597) * 0.0001;

    return result;
  }

  private updateHills() {
    // Check if we've exited current hill
    if (this.currentHillIndex >= 0) {
      const hill = this.hills[this.currentHillIndex];
      if (this.position > hill.end) {
        this.currentHillIndex = -1;
      }
    }

    // Check if we've entered next hill
    if (this.currentHillIndex === -1 && this.nextHillToCheck < this.hills.length) {
      const nextHill = this.hills[this.nextHillToCheck];
      if (this.position >= nextHill.start) {
        // Only track uphills with >1% grade
        if (nextHill.slope > 100) {
          this.currentHillIndex = this.nextHillToCheck;
        }

        this.nextHillToCheck++;
      }
    }
  }

  public step(dt: number): void {
    // Early exit if the runner has finished the race already.
    if (this.hasFinishedRace) {
      return;
    }

    let dtAfterDelay = dt;

    if (this.startDelayAccumulator > 0.0) {
      this.startDelayAccumulator -= dt;

      if (this.startDelayAccumulator > 0.0) {
        return;
      }
    }

    // Logic chunks
    this.updateHills();

    // Update position

    this.currentSpeed = Math.min(this.currentSpeed + this.acceleration * dt, this.maxSpeed);

    if (!this.startDash && this.currentSpeed < this.minSpeed) {
      this.currentSpeed = this.minSpeed;
    }

    const displacement =
      this.currentSpeed + this.modifiers.currentSpeed.acc + this.modifiers.currentSpeed.err;

    if (this.startDelayAccumulator < 0.0) {
      dtAfterDelay = Math.abs(this.startDelayAccumulator);
      this.startDelayAccumulator = 0.0;
    }

    this.position += displacement * dtAfterDelay;
    this.healthPolicy.tick(this, dt);

    if (!this.healthPolicy.hasRemainingHealth() && !this.outOfHp) {
      this.outOfHp = true;
    }

    if (this.startDash && this.currentSpeed >= 0.85 * this.race.baseSpeed) {
      this.startDash = false;
      this.modifiers.accel.add(-24.0);
    }

    this.modifiers.oneFrameAccel = 0.0;
  }

  private activateSkill(): void {}

  /**
   * Does a Wit Check for a skill a Runner is trying to activate.
   */
  private doWitCheck(): boolean {
    if (!this.race.settings.witChecks) {
      return true;
    }

    const witStat = this.stats.wit;

    const rngRoll = this.witRng.random();

    // NOTE: Might actually want to check this later.
    const witCheckThreshold = Math.max(100 - 9000 / witStat, 20) * 0.01;

    return rngRoll <= witCheckThreshold;
  }

  /**
   * Calculates the chance of the runner being rushed (in percent).
   *
   * Formula: RushedChance = (6.5 / log10(0.1 * Wits + 1))²%
   */
  private get baseRushedChance(): number {
    const wisdomStat = this.stats.wit;

    return Math.pow(6.5 / Math.log10(0.1 * wisdomStat + 1), 2) / 100;
  }

  private get hasSelfControl(): boolean {
    return this.pendingSkills.some((s) => s.skillId === '202161');
  }

  private get rushedChance(): number {
    return this.baseRushedChance - (this.hasSelfControl ? 0.03 : 0);
  }

  public get maxSpeed(): number {
    if (this.startDash) {
      return Math.min(this.targetSpeed, 0.85 * this.race.baseSpeed);
    }

    if (this.currentSpeed + this.modifiers.oneFrameAccel > this.targetSpeed) {
      return 9999.0;
    }

    return this.targetSpeed;
  }

  public get baseStrategy(): IStrategy {
    if (this.strategy === Strategy.Runaway) {
      return Strategy.FrontRunner;
    }

    return this.strategy;
  }

  /**
   * Create a new timer and register it
   * @param initialValue Initial timer value (default 0)
   */
  private createTimer(initialValue: number = 0): Timer {
    const timer = new Timer(initialValue);
    this.timers.push(timer);
    return timer;
  }

  public static create(props: CreateRunner): Runner {
    const id = crypto.randomUUID();
    const umaId = props.outfitId.slice(0, 4);

    const statsWithMood = applyMoodCoefficient(props.stats, props.mood);
    const adjustedStats = adjustStats(statsWithMood, props.course, props.ground, props.strategy);

    const runner = new Runner({
      id,
      umaId,
      outfitId: props.outfitId,
      name: '',
      mood: props.mood,
      strategy: props.strategy,
      aptitudes: props.aptitudes,
      stats: adjustedStats,
      rawStats: props.stats,
      skillIds: props.skills,
    });

    return runner;
  }
}

const adjustOvercap = (stat: number): number => {
  return stat > 1200 ? 1200 + Math.floor((stat - 1200) / 2) : stat;
};

export const calculateMoodCoefficient = (mood: IMood): number => {
  return 1 + 0.02 * mood;
};

const applyMoodCoefficient = (stats: StatLine, mood: IMood): StatLine => {
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

const adjustStats = (
  stats: StatLine,
  course: CourseData,
  ground: IGroundCondition,
  strategy: IStrategy,
): StatLine => {
  const speedModifier = calculateSpeedModifier(course, stats);
  const groundModifier = GroundSpeedModifier[course.surface][ground];
  const surfaceModifier = GroundPowerModifier[course.surface][ground];
  const strategyModifier = StrategyProficiencyModifier[strategy];

  return {
    speed: Math.max(stats.speed * speedModifier + groundModifier, 1),
    stamina: stats.stamina,
    power: Math.max(stats.power + surfaceModifier, 1),
    guts: stats.guts,
    wit: stats.wit * strategyModifier,
  };
};
