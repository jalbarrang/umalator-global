import { PositionKeepState, SkillRarity, SkillTarget, SkillType } from './skills/definitions';
import { StrategyHelpers } from './runner/runner.types';
import {
  Acceleration,
  GroundPowerModifier,
  GroundSpeedModifier,
  PositionKeep,
  Speed,
  StrategyModule,
} from './common/definitions';
import { PosKeepMode, Strategy } from './runner/definitions';
import { Rule30CARng } from './Random';
import {
  createBlockedSideCondition,
  createOvertakeCondition,
} from './conditions/special-conditions';
import { CourseHelpers } from './course/CourseData';
import { CompensatedAccumulator, Timer } from './simulator.types';
import { buildSkillData } from './runner/runner.utils';
import type { ApproximateCondition, ConditionState } from './conditions/ApproximateStartContinue';
import type { IPositionKeepState } from './skills/definitions';
import type { IAptitude, IMood, IStrategy } from './runner/definitions';
import type { PRNG } from './Random';
import type { HpPolicy, RaceStateSlice } from './health/health-policy';
import type { RaceSimulator } from './race-simulator';
import type { CourseData, IGroundCondition, IPhase } from './course/definitions';
import type { ActiveSkill, PendingSkill, SkillEffect } from './skills/skill.types';
import { getUmaDisplayInfo } from '@/modules/runners/utils';

// ===================
// Constants
// ===================

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

export type SpeedModifiers = {
  targetSpeed: CompensatedAccumulator;
  currentSpeed: CompensatedAccumulator;
  accel: CompensatedAccumulator;
  oneFrameAccel: number;
  specialSkillDurationScaling: number;
};

// ===================
// Class Definition
// ===================

/**
 * # Runner
 *
 * ## Overview
 *
 * The class for representing a runner in the race that will be simulated.
 *
 */
export class Runner {
  public race: RaceSimulator;

  /**
   * Unique ID for the runner
   *
   * Generated automatically by the RaceSimulator and set to the
   */
  public internalId: number;

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

  // ===================
  // Basic Information
  // ===================

  public readonly mood: IMood;
  /**
   * The canonical strategy of the runner
   */
  public readonly strategy: IStrategy;
  /**
   * The strategy that the runner is using for position keeping.
   */
  public posKeepStrategy: IStrategy;
  /**
   * The strategy that the runner was using for position keeping before they were rushed.
   */
  declare public preRushedPosKeepStrategy: IStrategy;
  /**
   * Represents the Raw Stats of the runner
   */
  public readonly _stats: Readonly<StatLine>;
  /**
   * Represents the Base Stats of the runner (raw stats + mood coefficient)
   */
  public readonly _baseStats: Readonly<StatLine>;
  /**
   * Represents the Adjusted Stats of the runner
   */
  public readonly _adjustedStats: Readonly<StatLine>;
  /**
   * Runtime Mutable Base Stats of the runner
   */
  public baseStats: StatLine;
  /**
   * Runtime Mutable Adjusted Stats of the runner
   */
  public adjustedStats: StatLine;
  /**
   * Aptitudes of the runner
   */
  public readonly aptitudes: RunnerAptitudes;
  /**
   * Skill IDs that this runner has.
   */
  public readonly skillIds: Array<string>;

  // ===================
  // [Pending]
  // ===================

  public rng: PRNG;
  public rushedRng: PRNG;
  public posKeepRng: PRNG;
  public laneMovementRng: PRNG;
  public witRng: PRNG;
  public syncRng: PRNG;
  /**
   * RNG for force activating gold skills
   *
   * This is used to randomly select gold skills to activate.
   *
   * Skill Effects that use this:
   * - ActivateRandomGold
   */
  public forceSkillActivatorRng: PRNG;

  // ===================
  // Downhill mode
  // ===================

  /**
   * Whether the runner is currently in downhill mode
   */
  public isDownhillMode = false;
  /**
   * Frame when downhill mode started
   */
  public downhillModeStart: number | null;
  /**
   * Last frame we checked for downhill mode changes
   */
  public lastDownhillCheckFrame: number;
  /**
   * RNG for downhill mode
   */
  public downhillRng: PRNG;

  /**
   * The gate number that the runner is in
   *
   * The value is between 0 and 8, where 0 is the leftmost gate and 8 is the rightmost gate.
   *
   * This value will be set by the RaceSimulator based on the gate roll.
   */
  public gate: number | null = null;
  public slopePenalties: Array<number>;

  public sectionModifiers: Array<number>;
  public baseAccel: Array<number>;
  public baseTargetSpeedPerPhase: [number, number, number];

  public isLastSpurt = false;
  public lastSpurtSpeed: number;
  public lastSpurtTransition: number;
  public hasAchievedFullSpurt = false;

  // ===================
  // Starting Gate
  // ===================
  public startDash = true;
  public startDelay: number;
  public startDelayAccumulator: number;

  /**
   * Current lane the runner is in
   */
  public currentLane: number;
  /**
   * The position of the runner on the course.
   */
  public position: number;
  /**
   * Whether the runner has finished the race.
   *
   * This is set to true when the runner crosses the finish line (reaches the courses distance).
   */
  public hasFinishedRace = false;
  public currentSpeed: number;
  public targetSpeed: number;
  public acceleration: number;
  public modifiers: SpeedModifiers;

  /**
   * The health policy for the runner that determines how much HP is consumed and how much is recovered.
   */
  public healthPolicy: HpPolicy;
  /**
   * Whether the runner has run out of HP and cannot maintain top speed at the last spurt.
   */
  public outOfHp = false;
  /**
   * The position where the runner ran out of HP.
   */
  public outOfHpPosition: number | null = null;

  // ===================
  // Rushed State
  // ===================
  /**
   * Whether the runner is currently in rushed mode
   */
  public isRushed = false;
  /**
   * Whether the runner has been rushed in the last spurt of this race.
   */
  public hasBeenRushed = false;
  /**
   * The section that the runner is in when they are rushed.
   */
  public rushedSection: number;
  /**
   * The position where the runner enters rushed mode.
   */
  public rushedEnterPosition: number;
  /**
   * The position where the runner is when they are rushed.
   */
  public rushedEndPosition: number;
  /**
   * The timer for the rushed state.
   */
  public rushedTimer: Timer;
  /**
   * The maximum duration of the rushed state.
   */
  public rushedMaxDuration: number;
  /**
   * The activations of the rushed state.
   */
  public rushedActivations: Array<[number, number]>;

  // ===================
  // Skills
  // ===================

  /**
   * The number of skills that have been activated by the runner
   */
  public skillsActivatedCount: number;
  public targetSpeedSkillsActive: Array<ActiveSkill>;
  public currentSpeedSkillsActive: Array<ActiveSkill & { naturalDeceleration: boolean }>;
  public accelerationSkillsActive: Array<ActiveSkill>;
  public laneMovementSkillsActive: Array<ActiveSkill>;
  public changeLaneSkillsActive: Array<ActiveSkill>;
  /**
   * The number of heals that have been activated by the runner
   */
  public healsActivatedCount: number;
  /**
   * A map of phase to the number of skills that have been activated for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  public skillsActivatedPhaseMap: [number, number, number, number];
  /**
   * A map of half race to the number of skills that have been activated for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  public skillsActivatedHalfRaceMap: [number, number];
  /**
   * Skills that are pending activation
   */
  public pendingSkills: Array<PendingSkill>;
  /**
   * Skills that are targeted by other runners
   */
  public targetedSkills: Array<PendingSkill>;

  // ===================
  // Overtake
  // ===================

  /**
   * The number of times the runner has overtaken another runner
   */
  public overtakeCount: number;

  /**
   * A map of phase to the number of times the runner has overtaken another runner for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  public overtakeCountPerPhaseMap: [number, number, number, number];

  /**
   * A map of half race to the number of times the runner has overtaken another runner for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  public overtakeCountPerHalfRaceMap: [number, number];

  // ===================
  // Spot Struggle
  // ===================

  /**
   * Whether the runner is currently in spot struggle.
   */
  public inSpotStruggle = false;
  /**
   * The timer for the spot struggle.
   *
   * Counts for how long the runner has been in spot struggle.
   */
  public spotStruggleTimer: Timer;
  public spotStruggleStartPosition: number | null;
  public spotStruggleEndPosition: number;
  /**
   * The IDs of the runners that this runner is spot struggling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  public spotStruggleTargets: Set<number>;
  /**
   * Whether the runner has been in spot struggle at the start of the race.
   */
  public hasSpotStruggle = false;

  // ===================
  // Dueling
  // ===================

  /**
   * Whether the runner is currently dueling with another runner.
   */
  public isDueling = false;
  public canDuel: boolean | null = null;
  /**
   * The timer for the dueling.
   *
   * Counts for how long the runner has been in dueling.
   */
  public duelingTimer: Timer;
  public duelingStartPosition: number;
  public duelingEndPosition: number;
  /**
   * The IDs of the runners that this runner is dueling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  public duelTargets: Set<number>;
  /**
   * Whether the runner has dueled in the last spurt of this race.
   */
  public hasDueled = false;
  public duelingRng: PRNG;

  public positionKeepState: IPositionKeepState;

  private conditionTimer: Timer;
  private conditionValues: Map<string, number> = new Map();
  private conditions: Map<string, ApproximateCondition> = new Map();

  // ===================
  // Hills
  // ===================

  /**
   * The index of the current hill that the runner is on.
   */
  public currentHillIndex: number;
  /**
   * The index of the next hill that the runner needs to check.
   */
  public nextHillToCheck: number;
  /**
   * The hills on the course.
   */
  public hills: Array<{ start: number; end: number; slope: number }>;

  public timers: Array<Timer>;
  public accumulateTime: Timer;
  public phase: IPhase;
  public nextPhaseTransition: number;
  public sectionLength: number;
  public baseSpeed: number;
  public minSpeed: number;
  public randomLot: number;
  public usedSkills: Set<string>;
  public pendingSkillRemoval: Set<string>;

  public positionKeepActivations: Array<[number, number, IPositionKeepState]>;
  public extraMoveLane: number;
  public forceInSpeed: number;
  public targetLane: number;
  public laneChangeSpeed: number;
  public firstUmaInLateRace = false;
  posKeepSpeedCoef: number;
  posKeepNextTimer: any;
  posKeepExitDistance: number;
  posKeepExitPosition: number;
  posKeepMinThreshold: number;
  posKeepMaxThreshold: number;
  posKeepEnd: number;
  slopePer: number;
  nonFullSpurtVelocityDiff: number | null;
  nonFullSpurtDelayDistance: number | null;
  skillRng: PRNG;

  constructor(race: RaceSimulator, props: RunnerProps) {
    this.race = race;

    // From props
    this.internalId = props.id;

    // Thought: Mood could be made so it could be randomly set per race as an option in the UI.
    this.mood = props.mood;

    // This stats act as snapshots to be copied later to the mutable stats
    this._stats = props.stats;
    this._baseStats = buildBaseStats(props.stats, props.mood);
    this._adjustedStats = buildAdjustedStats(
      this._baseStats,
      race.course,
      race.ground,
      props.aptitudes.strategy,
    );

    // These stats are mutable and will be updated during the race
    this.baseStats = { ...this._baseStats };
    this.adjustedStats = { ...this._adjustedStats };

    this.strategy = props.strategy;
    this.posKeepStrategy = props.strategy;
    this.aptitudes = props.aptitudes;
    this.skillIds = props.skillIds;

    // === Umamusume related ===
    this.umaId = props.umaId;
    this.outfitId = props.outfitId;
    this.name = props.name;

    // === Other ===
  }

  // === Setup ===

  public setHealthPolicy(healthPolicy: HpPolicy) {
    this.healthPolicy = healthPolicy;
    return this;
  }

  public setGate(gate: number | null) {
    this.gate = gate;
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
    this.forceSkillActivatorRng = new Rule30CARng(rng.int32());
    this.duelingRng = new Rule30CARng(rng.int32());
    this.syncRng = new Rule30CARng(rng.int32());
    this.skillRng = new Rule30CARng(rng.int32());

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
      (s) => ((s.slope / 10000.0) * 200.0) / this.adjustedStats.power,
    );
  }

  /**
   * Initialize dueling and spot struggle tracking
   * These track multi-runner interactions
   */
  private initializeDuelTracking(): void {
    // === Dueling ===
    this.isDueling = false;
    this.canDuel = null;
    this.hasDueled = false;
    this.duelingTimer = this.createTimer();
    this.duelingStartPosition = -1;
    this.duelingEndPosition = -1;
    this.duelTargets = new Set();
  }

  private initializeSpotStruggleTracking(): void {
    // === Spot Struggle ===
    this.inSpotStruggle = false;
    this.hasSpotStruggle = false;
    this.spotStruggleTimer = this.createTimer();
    this.spotStruggleStartPosition = null;
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
    if (!this.healthPolicy) {
      throw new Error('Health policy not set');
    }

    // reset mutable stats
    this.baseStats = { ...this._baseStats };
    this.adjustedStats = { ...this._adjustedStats };

    this.healthPolicy.init(this);
    this.outOfHp = false;
  }

  private initializeLastSpurtTracking(): void {
    this.isLastSpurt = false;
    this.lastSpurtTransition = -1;
    this.lastSpurtSpeed = 0.0;
    this.hasAchievedFullSpurt = false;
    this.nonFullSpurtVelocityDiff = null;
    this.nonFullSpurtDelayDistance = null;
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
    this.slopePer = 0.0;
  }

  /**
   * Initialize lane position and movement state
   * Lane is determined by gate number
   */
  private initializeLaneState(): void {
    if (this.gate === undefined || this.gate === null) {
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

    // First place tracking (for angling/scheming skills)
    // TODO: replace this later
    this.firstUmaInLateRace = false;
  }

  /**
   * Initialize random values used throughout race
   * These are drawn once at race start
   */
  private initializeRandomValues(): void {
    if (!this.rng) throw new Error('RNG not set');

    // Random lot for various skill conditions
    this.randomLot = this.rng.uniform(100);

    const strategyModifer = StrategyModule.forceInSpeedModifier[this.strategy];
    this.forceInSpeed = this.rng.uniform(100) * strategyModifer;
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

    this.pendingSkills = [];
    /**
     * Compare mode: Doesn't use targeted skills as the two runners being compared are isolated from each other.
     * Normal mode: 9-runner setups use targeted skills as runners interact with each other.
     */
    this.targetedSkills = [];
    this.usedSkills = new Set();
    this.pendingSkillRemoval = new Set();

    // Overtake tracking
    // NOTE: this values only apply in normal mode, not in compare mode.
    // Compare mode uses artificial values to resolve the overtake not handled here.
    this.overtakeCount = 0;
    this.overtakeCountPerPhaseMap = [0, 0, 0, 0];
    this.overtakeCountPerHalfRaceMap = [0, 0];

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
      if (!this.race.settings.sectionModifier) {
        return 0.0;
      }

      const max = (this.adjustedStats.wit / 5500.0) * Math.log10(this.adjustedStats.wit * 0.1);
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
    this.processSkillActivations();
  }

  private registerCondition(name: string, condition: ApproximateCondition): void {
    this.conditions.set(name, condition);

    if (!this.conditionValues.has(name)) {
      this.conditionValues.set(name, condition.valueOnStart);
    }
  }

  /**
   * Register dynamic conditions for skill system
   * Conditions like blocked_side, overtake, etc.
   */
  private registerConditions(): void {
    this.registerCondition('blocked_side', createBlockedSideCondition());
    this.registerCondition('overtake', createOvertakeCondition());
  }

  private initializePositionKeep() {
    this.positionKeepState = PositionKeepState.None;
    this.posKeepNextTimer = this.createTimer();
    this.posKeepSpeedCoef = 1.0;
    this.posKeepExitDistance = 0.0;
    this.posKeepExitPosition = 0.0;
    this.posKeepMinThreshold = PositionKeep.minThreshold(this.strategy, this.race.course.distance);
    this.posKeepMaxThreshold = PositionKeep.maxThreshold(this.strategy, this.race.course.distance);
    this.posKeepEnd = this.sectionLength * (this.race.settings.mode === 'compare' ? 10.0 : 3.0);
    this.positionKeepActivations = [];
  }

  public validateSetup(): void {
    if (!this.race) throw new Error('Race not set');
    if (!this.rng) throw new Error('RNG not set');
    if (!this.healthPolicy) throw new Error('Health policy not set');
    if (this.gate === undefined) throw new Error('Gate not assigned');
  }

  public prepareRunner(): void {
    this.initializeTimers();
    this.initializeRandomValues();
    this.initializePhaseTracking();
    this.initializeLastSpurtTracking();

    this.initializeSkillTracking();
    this.initializeDuelTracking();
    this.initializeSpotStruggleTracking();

    this.initializeLaneState();
    this.initializeMovementState();
    this.initializeModifiers();
    this.initializePositionKeep();

    // Activate gate skills (must be before min speed calc)
    this.activateGateSkills();

    // Calculate derived values
    this.initializeSpeedCalculations();
    this.initializeAccelerationValues();

    // Initialize mechanics
    this.initializeHillTracking();
    this.initializeRushedState();
    this.initializeDownhillState();

    // Initialize health system
    this.initializeHealthPolicy();

    // Cache frequently-accessed values
    this.initializeCachedValues();

    // Register dynamic conditions
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
      Math.sqrt(500.0 * this.adjustedStats.power) *
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

  private updateHills() {
    // Check if we've exited current hill
    if (this.currentHillIndex >= 0) {
      const hill = this.hills[this.currentHillIndex];
      if (this.position > hill.end) {
        this.currentHillIndex = -1;
        this.slopePer = 0;
      }
    }

    // Check if we've entered next hill
    if (this.currentHillIndex === -1 && this.nextHillToCheck < this.hills.length) {
      const nextHill = this.hills[this.nextHillToCheck];

      if (this.position >= nextHill.start) {
        this.currentHillIndex = this.nextHillToCheck;
        this.slopePer = nextHill.slope;

        this.nextHillToCheck++;
      }
    }
  }

  /**
   * Updates the phase of the race the runner is in.
   *
   * Ported from RaceSolver.updatePhase:
   * NB. there is actually a phase 3 which starts at 5/6 distance, but for purposes of
   * strategy phase modifiers, activate_count_end_after, etc it is the same as phase 2
   * and it's easier to treat them together, so cap phase at 2.
   */
  private updatePhase() {
    if (this.position >= this.nextPhaseTransition && this.phase < 2) {
      ++this.phase;

      const nextPhase = this.phase + 1;
      this.nextPhaseTransition = CourseHelpers.phaseStart(
        this.race.course.distance,
        nextPhase as IPhase,
      );
    }
  }

  private updateRushed() {
    // Check if we should enter rushed state (can only happen once per race)
    if (
      this.rushedSection >= 0 &&
      !this.isRushed &&
      !this.hasBeenRushed &&
      this.position >= this.rushedEnterPosition
    ) {
      this.isRushed = true;
      this.preRushedPosKeepStrategy = this.posKeepStrategy;
      // Mark that this runner has been rushed
      this.hasBeenRushed = true;

      this.rushedTimer.t = 0;

      // Start tracking, end position will be filled later
      this.rushedActivations.push([this.position, -1]);

      // Always consume 1 RNG call to keep deterministic behavior.
      const strategyRoll = this.rushedRng.random();

      // Override position keep strategy based on canonical strategy
      switch (this.strategy) {
        case Strategy.Runaway:
        case Strategy.FrontRunner:
          this.posKeepStrategy = Strategy.FrontRunner;
          break;
        case Strategy.PaceChaser:
          this.posKeepStrategy = Strategy.FrontRunner;
          break;
        case Strategy.LateSurger: {
          this.posKeepStrategy = strategyRoll < 0.75 ? Strategy.FrontRunner : Strategy.PaceChaser;
          break;
        }
        case Strategy.EndCloser: {
          if (strategyRoll < 0.7) {
            this.posKeepStrategy = Strategy.FrontRunner;
          } else if (strategyRoll < 0.9) {
            this.posKeepStrategy = Strategy.PaceChaser;
          } else {
            this.posKeepStrategy = Strategy.LateSurger;
          }
          break;
        }
      }
    }

    // Update rushed state if active
    if (!this.isRushed) {
      return;
    }

    // Check for recovery every 3 seconds
    if (
      this.rushedTimer.t > 0 &&
      Math.floor(this.rushedTimer.t / 3) > Math.floor((this.rushedTimer.t - 0.017) / 3)
    ) {
      // 55% chance to snap out of it
      if (this.rushedRng.random() < 0.55) {
        this.leaveRushed();
        return;
      }
    }

    // Force end after max duration
    if (this.rushedTimer.t >= this.rushedMaxDuration) {
      this.leaveRushed();
    }
  }

  /**
   * Leaves the rushed state.
   */
  private leaveRushed() {
    this.isRushed = false;
    // Restore position keep strategy
    this.posKeepStrategy = this.preRushedPosKeepStrategy;

    // Mark the end position for UI display
    if (this.rushedActivations.length > 0) {
      const lastIdx = this.rushedActivations.length - 1;

      if (this.rushedActivations[lastIdx][1] === -1) {
        this.rushedActivations[lastIdx][1] = this.position;
      }
    }
  }

  // ==========================
  // Downhill Mode
  // ==========================

  private updateDownhillMode() {
    // Check if we should update downhill mode (once per second, at 15 FPS)
    const currentFrame = Math.floor(this.accumulateTime.t * 15);
    const changeSecond = currentFrame % 15 === 14; // Check on the last frame of each second

    if (!changeSecond || currentFrame === this.lastDownhillCheckFrame) {
      return; // Not time to check yet, or already checked this second
    }

    this.lastDownhillCheckFrame = currentFrame;

    if (!this.race.settings.downhill) {
      // Downhill mode is disabled, exit immediately
      if (this.isDownhillMode) {
        this.downhillModeStart = null;
        this.isDownhillMode = false;
      }

      return;
    }

    // Check if we're on a downhill slope
    const course = this.race.course;
    const currentSlope = course.slopes.find(
      (s) => this.position >= s.start && this.position <= s.start + s.length,
    );

    const isOnDownhill = currentSlope && currentSlope.slope < -1; // Only on downhills with >1.0% grade

    if (!isOnDownhill) {
      // Not on a downhill slope, exit downhill mode immediately
      if (this.isDownhillMode) {
        this.downhillModeStart = null;
        this.isDownhillMode = false;
      }

      return;
    }

    // Keep rng synced for the virtual pacemaker so that it's the same pacer for both umas
    const downHillCheckRng =
      this.race.settings.positionKeepMode === PosKeepMode.Virtual && !this.race.pacer
        ? this.syncRng.random()
        : this.downhillRng.random();

    if (this.downhillModeStart === null) {
      // Check for entry: Wisdom * 0.0004 chance each second (matching Kotlin implementation)
      if (downHillCheckRng < this.adjustedStats.wit * 0.0004) {
        this.downhillModeStart = currentFrame;
        this.isDownhillMode = true;
      }

      return;
    }

    // Check for exit: 20% chance each second to exit downhill mode
    if (downHillCheckRng < 0.2) {
      this.downhillModeStart = null;
      this.isDownhillMode = false;
    }
  }

  tickConditions(): void {
    const state: ConditionState = {
      runner: this,
    };

    for (const [name, condition] of this.conditions.entries()) {
      const currentValue = this.conditionValues.get(name) ?? condition.valueOnStart;
      const newValue = condition.update(state, currentValue);
      this.conditionValues.set(name, newValue);
    }
  }

  public onUpdate(dt: number): void {
    let dtAfterDelay = dt;

    // Update timers
    for (const timer of this.timers) {
      timer.t += dt;
    }

    // Update condition timer
    if (this.conditionTimer.t >= 0.0) {
      this.tickConditions();
      this.conditionTimer.t = -1.0;
    }

    // Update start delay accumulator
    if (this.startDelayAccumulator > 0.0) {
      this.startDelayAccumulator -= dt;

      if (this.startDelayAccumulator > 0.0) {
        return;
      }
    }

    // Logic chunks
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

    // Update position

    let newSpeed: number;

    if (this.currentSpeed <= this.targetSpeed) {
      newSpeed = Math.min(this.currentSpeed + this.acceleration * dt, this.targetSpeed);
    } else {
      newSpeed = Math.max(this.currentSpeed + this.acceleration * dt, this.targetSpeed);
    }

    if (this.startDash && newSpeed > this.maxStartDashSpeed) {
      newSpeed = this.maxStartDashSpeed;
    }

    if (!this.startDash && this.currentSpeed < this.minSpeed) {
      newSpeed = this.minSpeed;
    }

    this.currentSpeed = newSpeed;

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
      this.outOfHpPosition = this.race.course.distance - this.position;
    }

    if (this.startDash && this.currentSpeed >= 0.85 * this.race.baseSpeed) {
      this.startDash = false;
      this.modifiers.accel.add(-24.0);
    }

    this.modifiers.oneFrameAccel = 0.0;

    if (this.position >= this.race.course.distance) {
      this.hasFinishedRace = true;
    }
  }

  /**
   * Applies a targeted skill effect to the runner.
   */
  public receiveTargetedEffect(skillEffect: SkillEffect) {
    // TODO: 1. Support other targeted skill effects that would need timer duration
    // TODO: 2. Have a configuration to disable being targeted by skills
    // TODO: 3. Team support where only beneficial effects are applied to the runner.

    switch (skillEffect.type) {
      case SkillType.Recovery:
        // Either recover HP or drain HP, depending on the modifier
        // Positive modifier = recover HP, negative modifier = drain HP
        this.healthPolicy.recover(skillEffect.modifier);
        break;
    }
  }

  private processSkillActivations() {
    // Clean up target speed effects
    for (let i = this.targetSpeedSkillsActive.length; --i >= 0; ) {
      const skillEffect = this.targetSpeedSkillsActive[i];

      if (skillEffect.durationTimer.t >= 0) {
        this.targetSpeedSkillsActive.splice(i, 1);
        // TODO: Depending on the modifier, reverse the sign of the modifier
        this.modifiers.targetSpeed.add(-skillEffect.modifier);
      }
    }

    // Clean up current speed effects
    for (let i = this.currentSpeedSkillsActive.length; --i >= 0; ) {
      const skillEffects = this.currentSpeedSkillsActive[i];

      if (skillEffects.durationTimer.t >= 0) {
        this.currentSpeedSkillsActive.splice(i, 1);
        this.modifiers.currentSpeed.add(-skillEffects.modifier);

        if (skillEffects.naturalDeceleration) {
          this.modifiers.oneFrameAccel += skillEffects.modifier;
        }
      }
    }

    // Clean up acceleration effects
    for (let i = this.accelerationSkillsActive.length; --i >= 0; ) {
      const skillEffects = this.accelerationSkillsActive[i];
      if (skillEffects.durationTimer.t >= 0) {
        this.accelerationSkillsActive.splice(i, 1);
        this.modifiers.accel.add(-skillEffects.modifier);
      }
    }

    // Clean up lane movement effects
    for (let i = this.laneMovementSkillsActive.length; --i >= 0; ) {
      const skillEffects = this.laneMovementSkillsActive[i];
      if (skillEffects.durationTimer.t >= 0) {
        this.laneMovementSkillsActive.splice(i, 1);
      }
    }

    // Clean up change lane effects
    for (let i = this.changeLaneSkillsActive.length; --i >= 0; ) {
      const skillEffects = this.changeLaneSkillsActive[i];
      if (skillEffects.durationTimer.t >= 0) {
        this.changeLaneSkillsActive.splice(i, 1);
      }
    }

    for (let i = this.pendingSkills.length; --i >= 0; ) {
      const skill = this.pendingSkills[i];

      if (this.position >= skill.trigger.end || this.pendingSkillRemoval.has(skill.skillId)) {
        // NB. `Region`s are half-open [start,end) intervals. If pos == end we are out of the trigger.
        // skill failed to activate
        this.pendingSkills.splice(i, 1);
        this.pendingSkillRemoval.delete(skill.skillId);

        continue;
      }

      if (this.position >= skill.trigger.start && skill.extraCondition(this)) {
        if (this.shouldSkipWitCheck(skill)) {
          // Wit check skipped - activate skill
          this.activateSkill(skill);
          this.pendingSkills.splice(i, 1);
          continue;
        }

        if (this.doWitCheck()) {
          // Wisdom check passed - activate skill
          this.activateSkill(skill);
          this.pendingSkills.splice(i, 1);
          continue;
        }

        // Wisdom check failed - don't keep
        this.pendingSkills.splice(i, 1);
      }
    }
  }

  /**
   * Checks if the wit check should be skipped for a skill.
   */
  private shouldSkipWitCheck(skill: PendingSkill): boolean {
    if (!this.race.settings.witChecks) {
      return true;
    }

    // Green skills
    if (
      skill.effects.length > 0 &&
      skill.effects[0].type >= SkillType.SpeedUp &&
      skill.effects[0].type <= SkillType.WisdomUp
    ) {
      return true;
    }

    // Uniques
    // (Inherited uniques are White rarity so this works fine)
    if (skill.rarity === SkillRarity.Unique) {
      return true;
    }

    return false;
  }

  /**
   * Does a Wit Check for a skill a Runner is trying to activate.
   */
  private doWitCheck(): boolean {
    const witStat = this._baseStats.wit;

    const rngRoll = this.witRng.random();

    // NOTE: Might actually want to check this later.
    const witCheckThreshold = Math.max(100 - 9000 / witStat, 20) * 0.01;

    return rngRoll <= witCheckThreshold;
  }

  private activateSkill(skill: PendingSkill) {
    const skillEffects = skill.effects.toSorted((a, b) => +(a.type == 42) - +(b.type == 42));
    // sort so that the ExtendEvolvedDuration effect always activates after other effects, since it shouldn't extend the duration of other
    // effects on the same skill

    const course = this.race.course;

    for (const skillEffect of skillEffects) {
      // TODO should probably be awakened skills and not just pinks
      const scaling =
        skill.rarity === SkillRarity.Evolution ? this.modifiers.specialSkillDurationScaling : 1;
      const scaledDuration = skillEffect.baseDuration * (course.distance / 1000) * scaling;

      /**
       * If target is not Self, send the skill to the targeted runners so they handle the effect of the skill themselves.
       */
      if (skillEffect.target !== SkillTarget.Self) {
        this.race.broadcastSkillEffect(this, skillEffect);
        continue;
      }

      switch (skillEffect.type) {
        case SkillType.Noop:
          break;
        case SkillType.SpeedUp:
          this.adjustedStats.speed = Math.max(this.adjustedStats.speed + skillEffect.modifier, 1);
          break;
        case SkillType.StaminaUp:
          this.adjustedStats.stamina = Math.max(
            this.adjustedStats.stamina + skillEffect.modifier,
            1,
          );
          this.baseStats.stamina = Math.max(this.baseStats.stamina + skillEffect.modifier, 1);
          break;
        case SkillType.PowerUp:
          this.adjustedStats.power = Math.max(this.adjustedStats.power + skillEffect.modifier, 1);
          break;
        case SkillType.GutsUp:
          this.adjustedStats.guts = Math.max(this.adjustedStats.guts + skillEffect.modifier, 1);
          break;
        case SkillType.WisdomUp:
          this.adjustedStats.wit = Math.max(this.adjustedStats.wit + skillEffect.modifier, 1);
          break;
        case SkillType.MultiplyStartDelay:
          this.startDelay *= skillEffect.modifier;
          break;
        case SkillType.SetStartDelay:
          this.startDelay = skillEffect.modifier;
          break;
        case SkillType.TargetSpeed:
          this.modifiers.targetSpeed.add(skillEffect.modifier);
          this.targetSpeedSkillsActive.push({
            skillId: skill.skillId,
            durationTimer: this.createTimer(-scaledDuration),
            modifier: skillEffect.modifier,
            effectTarget: skillEffect.target,
            effectType: skillEffect.type,
          });
          break;
        case SkillType.Accel:
          this.modifiers.accel.add(skillEffect.modifier);
          this.accelerationSkillsActive.push({
            skillId: skill.skillId,
            durationTimer: this.createTimer(-scaledDuration),
            modifier: skillEffect.modifier,
            effectTarget: skillEffect.target,
            effectType: skillEffect.type,
          });
          break;
        case SkillType.LaneMovementSpeed:
          this.laneMovementSkillsActive.push({
            skillId: skill.skillId,
            durationTimer: this.createTimer(-scaledDuration),
            modifier: skillEffect.modifier,
            effectTarget: skillEffect.target,
            effectType: skillEffect.type,
          });
          break;
        case SkillType.CurrentSpeed:
        case SkillType.CurrentSpeedWithNaturalDeceleration:
          this.modifiers.currentSpeed.add(skillEffect.modifier);
          this.currentSpeedSkillsActive.push({
            skillId: skill.skillId,
            durationTimer: this.createTimer(-scaledDuration),
            modifier: skillEffect.modifier,
            naturalDeceleration: skillEffect.type == SkillType.CurrentSpeedWithNaturalDeceleration,
            effectTarget: skillEffect.target,
            effectType: skillEffect.type,
          });
          break;
        case SkillType.Recovery:
          this.healsActivatedCount += 1;

          // Apply health modifier to health policy
          this.healthPolicy.recover(skillEffect.modifier);

          if (this.phase >= 2 && !this.isLastSpurt) {
            this.updateLastSpurtState(true);
          }
          break;
        case SkillType.ActivateRandomGold:
          this.activateRandomGoldSkill(skillEffect.modifier);
          break;
        case SkillType.ExtendEvolvedDuration:
          this.modifiers.specialSkillDurationScaling = skillEffect.modifier;
          break;
        case SkillType.ChangeLane:
          this.changeLaneSkillsActive.push({
            skillId: skill.skillId,
            durationTimer: this.createTimer(-scaledDuration),
            modifier: skillEffect.modifier,
            effectTarget: skillEffect.target,
            effectType: skillEffect.type,
          });
          break;
      }
    }

    const halfRace = this.position < this.race.course.distance / 2 ? 0 : 1;
    this.skillsActivatedHalfRaceMap[halfRace] += 1;
    this.skillsActivatedPhaseMap[this.phase] += 1;
    this.skillsActivatedCount += 1;

    this.usedSkills.add(skill.skillId);
  }

  private activateRandomGoldSkill(skillsToActivateCount: number) {
    const goldIndices = this.pendingSkills.reduce((acc, skill, skillIndex) => {
      const goldOrEvolution =
        skill.rarity === SkillRarity.Gold || skill.rarity === SkillRarity.Evolution;

      if (
        goldOrEvolution &&
        skill.effects.every((skillEffect) => skillEffect.type > SkillType.WisdomUp)
      ) {
        acc.push(skillIndex);
      }

      return acc;
    }, [] as Array<number>);

    for (let i = goldIndices.length; --i >= 0; ) {
      const j = this.forceSkillActivatorRng.uniform(i + 1);

      [goldIndices[i], goldIndices[j]] = [goldIndices[j], goldIndices[i]];
    }

    for (let i = 0; i < Math.min(skillsToActivateCount, goldIndices.length); ++i) {
      const skill = this.pendingSkills[goldIndices[i]];

      // Force Activation
      this.activateSkill(skill);

      // important: we can't actually remove this from pendingSkills directly, since this function runs inside the loop in
      // processSkillActivations. modifying the pendingSkills array here would mess up that loop. this function used to modify
      // the trigger on the skill itself to ensure it was before this.pos and force it to be cleaned up, but mutating the skill
      // is error-prone and undesirable since it means the same PendingSkill instance can't be used with multiple RaceSolvers.
      // instead, flag the skill later to be removed in processSkillActivations (either later in the loop that called us, or
      // the next time processSkillActivations is called).
      this.pendingSkillRemoval.add(skill.skillId);
    }
  }

  applyPositionKeepStates() {
    if (
      this.position >= this.posKeepEnd ||
      this.race.settings.positionKeepMode === PosKeepMode.None
    ) {
      // State change triggered by poskeep end
      if (
        this.positionKeepState !== PositionKeepState.None &&
        this.positionKeepActivations.length > 0
      ) {
        this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.position;
      }

      this.positionKeepState = PositionKeepState.None;
      return;
    }

    if (!this.race.pacer) {
      return;
    }

    const pacer = this.race.pacer;
    const behind = pacer.position - this.position;
    const myStrategy = this.posKeepStrategy;

    switch (this.positionKeepState) {
      case PositionKeepState.None:
        if (this.posKeepNextTimer.t < 0) {
          return;
        }

        if (StrategyHelpers.strategyMatches(myStrategy, Strategy.FrontRunner)) {
          // Speed Up
          if (pacer === this) {
            const umas = this.getUmaByDistanceDescending();
            const secondPlaceUma = umas[1];
            const distanceAhead = pacer.position - secondPlaceUma.position;
            const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

            if (this.posKeepNextTimer.t < 0) {
              return;
            }

            if (this.isRushed || (distanceAhead < threshold && this.speedUpOvertakeWitCheck())) {
              this.positionKeepActivations.push([this.position, 0, PositionKeepState.SpeedUp]);
              this.positionKeepState = PositionKeepState.SpeedUp;
              this.posKeepExitPosition =
                this.position +
                Math.floor(this.sectionLength) *
                  (this.posKeepStrategy === Strategy.Runaway ? 3 : 1);
            }
          }
          // Overtake
          else if (this.speedUpOvertakeWitCheck()) {
            this.positionKeepState = PositionKeepState.Overtake;
            this.positionKeepActivations.push([this.position, 0, PositionKeepState.Overtake]);
          }
        } else {
          // Pace Up
          if (behind > this.posKeepMaxThreshold) {
            if (this.paceUpWitCheck()) {
              this.positionKeepState = PositionKeepState.PaceUp;
              this.positionKeepActivations.push([this.position, 0, PositionKeepState.PaceUp]);
              this.posKeepExitDistance =
                this.posKeepRng.random() * (this.posKeepMaxThreshold - this.posKeepMinThreshold) +
                this.posKeepMinThreshold;
            }
          }
          // Pace Down
          else if (behind < this.posKeepMinThreshold) {
            if (
              this.targetSpeedSkillsActive.length == 0 &&
              this.currentSpeedSkillsActive.length == 0
            ) {
              this.positionKeepState = PositionKeepState.PaceDown;
              this.positionKeepActivations.push([this.position, 0, PositionKeepState.PaceDown]);
              this.posKeepExitDistance =
                this.posKeepRng.random() * (this.posKeepMaxThreshold - this.posKeepMinThreshold) +
                this.posKeepMinThreshold;
            }
          }
        }

        if (this.positionKeepState == PositionKeepState.None) {
          this.posKeepNextTimer.t = -2;
        } else {
          const multiplier = this.posKeepStrategy === Strategy.Runaway ? 3 : 1;
          this.posKeepExitPosition = this.position + Math.floor(this.sectionLength) * multiplier;
        }

        break;
      case PositionKeepState.SpeedUp:
        if (this.position >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.position;
          this.posKeepNextTimer.t = -3;
        } else if (pacer == this) {
          const umas = this.getUmaByDistanceDescending();
          const secondPlaceUma = umas[1];
          const distanceAhead = pacer.position - secondPlaceUma.position;
          const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

          if (distanceAhead >= threshold) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] =
              this.position;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.Overtake:
        if (this.position >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.position;
          this.posKeepNextTimer.t = -3;
        } else if (pacer == this) {
          const umas = this.getUmaByDistanceDescending();
          const secondPlaceUma = umas[1];
          const distanceAhead = this.position - secondPlaceUma.position;

          const threshold = myStrategy === Strategy.Runaway ? 27.5 : 10;

          if (distanceAhead >= threshold) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] =
              this.position;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.PaceUp:
        if (this.position >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.position;
          this.posKeepNextTimer.t = -3;
        } else {
          if (behind < this.posKeepExitDistance) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] =
              this.position;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.PaceDown:
        if (this.position >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.position;
          this.posKeepNextTimer.t = -3;
        } else {
          if (
            behind > this.posKeepExitDistance ||
            this.targetSpeedSkillsActive.length > 0 ||
            this.currentSpeedSkillsActive.length > 0
          ) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] =
              this.position;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      default:
        break;
    }
  }

  /**
   * Returns the runners sorted by distance descending.
   * ! NOTE: this operation is O(n) and should be avoided if possible.
   */
  getUmaByDistanceDescending() {
    return Array.from(this.race.runners.values()).sort((a, b) => b.position - a.position);
  }

  speedUpOvertakeWitCheck() {
    // If rushed, with check passes automatically
    if (this.isRushed) {
      return true;
    }

    return this.posKeepRng.random() < 0.2 * Math.log10(0.1 * this.adjustedStats.wit);
  }

  paceUpWitCheck() {
    // If rushed, with check passes automatically
    if (this.isRushed) {
      return true;
    }

    return this.posKeepRng.random() < 0.15 * Math.log10(0.1 * this.adjustedStats.wit);
  }

  updatePositionKeepCoefficient() {
    switch (this.positionKeepState) {
      case PositionKeepState.SpeedUp:
        this.posKeepSpeedCoef = 1.04;
        break;
      case PositionKeepState.Overtake:
        this.posKeepSpeedCoef = 1.05;
        break;
      case PositionKeepState.PaceUp:
        this.posKeepSpeedCoef = 1.04;
        break;
      case PositionKeepState.PaceDown:
        this.posKeepSpeedCoef = 0.915; // 0.945x in mid-race post 1st-anniversary
        break;
      default:
        this.posKeepSpeedCoef = 1.0;
        break;
    }
  }

  updateDueling() {
    if (!this.race.settings.dueling) {
      return;
    }

    if (this.isDueling) {
      if (this.healthPolicy.healthRatioRemaining() <= 0.05) {
        this.isDueling = false;
        this.duelingEndPosition = this.position;
      }

      return;
    }

    if (StrategyHelpers.strategyMatches(this.posKeepStrategy, Strategy.FrontRunner)) {
      return;
    }

    if (this.healthPolicy.healthRatioRemaining() < 0.15 || !this.isOnFinalStraight) {
      return;
    }

    /**
     * Comments:
     * The following logic is layed out so it "artificially" mimics the dueling mechanic
     * as right now in "compare" mode, only 2 runners are in the race.
     *
     * In a 9-runner setup this logic wont apply, as runners will see and interact with each other
     * naturally.
     */

    if (this.race.settings.mode === 'compare') {
      this.artificialDueling();
      return;
    }

    // TODO: Implement actual dueling logic for 9-runners setup
  }

  private artificialDueling() {
    const duelingRates = this.race.duelingRates;
    if (this.canDuel === null) {
      if (duelingRates) {
        let rate = 0;
        if (this.posKeepStrategy === Strategy.Runaway) {
          rate = duelingRates.runaway;
        } else if (this.posKeepStrategy === Strategy.FrontRunner) {
          rate = duelingRates.frontRunner;
        } else if (this.posKeepStrategy === Strategy.PaceChaser) {
          rate = duelingRates.paceChaser;
        } else if (this.posKeepStrategy === Strategy.LateSurger) {
          rate = duelingRates.lateSurger;
        } else if (this.posKeepStrategy === Strategy.EndCloser) {
          rate = duelingRates.endCloser;
        }

        this.canDuel = this.duelingRng.random() < rate / 100;
        this.duelingTimer.t = 0;
      } else {
        this.canDuel = false;
      }
    }

    if (!this.canDuel) {
      return;
    }

    // "2s proximity" timer
    if (this.duelingTimer.t >= 2) {
      if (this.duelingRng.random() <= 0.4) {
        this.isDueling = true;
        this.duelingStartPosition = this.position;
      } else {
        this.duelingTimer.t = 0;
      }
    }
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

  updateSpotStruggle() {
    if (!this.race.settings.spotStruggle) {
      return;
    }

    if (this.inSpotStruggle) {
      const spotStruggleDuration = Math.pow(700 * this.adjustedStats.guts, 0.5) * 0.012;

      if (
        this.spotStruggleTimer.t >= spotStruggleDuration ||
        this.position >= this.spotStruggleEndPosition
      ) {
        // Leave spot struggle

        this.inSpotStruggle = false;
        this.spotStruggleEndPosition = this.position;

        this.spotStruggleTargets.clear();
      }
    }

    if (this.spotStruggleStartPosition !== null) {
      return;
    }

    const isInSection = this.position >= 150 && this.position <= Math.floor(this.sectionLength * 5);

    if (
      isInSection &&
      StrategyHelpers.strategyMatches(this.posKeepStrategy, Strategy.FrontRunner)
    ) {
      const otherUmas = this.race.runnersPerStrategy.get(this.posKeepStrategy)!;
      const distanceGap = this.posKeepStrategy === Strategy.FrontRunner ? 3.75 : 5;
      const laneGap = this.posKeepStrategy === Strategy.FrontRunner ? 0.165 : 0.416;

      const umasWithinGap = otherUmas.filter((u) => {
        const withinDistance = Math.abs(u.position - this.position) <= distanceGap;
        const withinLane = Math.abs(u.currentLane - this.currentLane) < laneGap;

        return withinDistance && withinLane;
      });

      if (umasWithinGap.length >= 2) {
        for (const uma of umasWithinGap) {
          uma.spotStruggleTimer.t = 0;
          uma.inSpotStruggle = true;
          uma.spotStruggleStartPosition = uma.position;
          uma.spotStruggleEndPosition = uma.position + Math.floor(this.sectionLength * 8);

          // Add the runner to the spot struggle targets
          // Note: the other runner will handle their own spot struggle targets.
          this.spotStruggleTargets.add(uma.internalId);
        }
      }
    }
  }

  updateLastSpurtState(forceState: boolean = false) {
    // Pass if already in last spurt mechanic is active or Phase is either Early or Mid race.
    if (this.isLastSpurt || this.phase < 2) return;

    if (this.lastSpurtTransition === -1 || forceState) {
      const initialLastSpurtSpeed = this.lastSpurtSpeed;

      const raceState: RaceStateSlice = {
        phase: this.phase,
        positionKeepState: this.positionKeepState,
        pos: this.position,
        currentSpeed: this.currentSpeed,
        inSpotStruggle: this.inSpotStruggle,
        isDownhillMode: this.isDownhillMode,
        isRushed: this.isRushed,
        posKeepStrategy: this.posKeepStrategy,
      };

      const lateRaceTargetSpeed = this.baseTargetSpeedPerPhase[2];

      const [transition, speed] = this.healthPolicy.getLastSpurtPair(
        raceState,
        this.lastSpurtSpeed,
        lateRaceTargetSpeed,
      );

      this.lastSpurtTransition = transition;
      this.lastSpurtSpeed = speed;

      if (this.healthPolicy.isMaxSpurt()) {
        this.hasAchievedFullSpurt = true;

        return;
      }

      const course = this.race.course;

      this.nonFullSpurtVelocityDiff = this.lastSpurtSpeed - initialLastSpurtSpeed;
      this.nonFullSpurtDelayDistance =
        this.lastSpurtTransition >= 0 ? this.lastSpurtTransition - (course.distance * 2) / 3 : null;
    }

    if (this.position >= this.lastSpurtTransition) {
      this.isLastSpurt = true;
    }
  }

  updateTargetSpeed() {
    if (!this.healthPolicy.hasRemainingHealth()) {
      this.targetSpeed = this.minSpeed;
    } else if (this.isLastSpurt) {
      this.targetSpeed = this.lastSpurtSpeed;
    } else {
      const phase = this.phase as 0 | 1 | 2;
      const baseTargetSpeed = this.baseTargetSpeedPerPhase[phase];

      this.targetSpeed = baseTargetSpeed * this.posKeepSpeedCoef;
      this.targetSpeed += this.sectionModifiers[Math.floor(this.position / this.sectionLength)];
    }

    this.targetSpeed += this.modifiers.targetSpeed.acc + this.modifiers.targetSpeed.err;

    if (this.isDownhillMode) {
      this.targetSpeed += 0.3 + this.slopePer / 100000.0;
    } else if (this.currentHillIndex != -1 && this.slopePer > 0) {
      // recalculating this every frame is actually measurably faster than calculating the penalty for each slope ahead of time, somehow
      this.targetSpeed -= ((this.slopePer / 10000.0) * 200.0) / this.adjustedStats.power;
      this.targetSpeed = Math.max(this.targetSpeed, this.minSpeed);
    }

    if (this.isDueling) {
      this.targetSpeed += Math.pow(200 * this.adjustedStats.guts, 0.708) * 0.0001;
    }

    if (this.inSpotStruggle) {
      this.targetSpeed += Math.pow(500 * this.adjustedStats.guts, 0.6) * 0.0001;
    }

    if (this.laneChangeSpeed > 0.0 && this.laneMovementSkillsActive.length > 0) {
      const moveLaneModifier = Math.sqrt(0.0002 * this.adjustedStats.power);
      this.targetSpeed += moveLaneModifier;
    }
  }

  applyForces() {
    if (!this.healthPolicy.hasRemainingHealth()) {
      this.acceleration = -1.2;
      return;
    }
    if (this.currentSpeed > this.targetSpeed) {
      this.acceleration =
        this.positionKeepState === PositionKeepState.PaceDown
          ? -0.5
          : PhaseDeceleration[this.phase];
      return;
    }
    this.acceleration = this.baseAccel[+(this.slopePer > 0) * 3 + this.phase];
    this.acceleration += this.modifiers.accel.acc + this.modifiers.accel.err;

    if (this.isDueling) {
      this.acceleration += Math.pow(160 * this.adjustedStats.guts, 0.59) * 0.0001;
    }
  }

  applyLaneMovement() {
    const course = this.race.course;

    const currentLane = this.currentLane;
    const sideBlocked = this.getConditionValue('blocked_side') === 1;
    const overtake = this.getConditionValue('overtake') === 1;

    if (this.extraMoveLane < 0.0 && this.isAfterFinalCornerOrInFinalStraight) {
      this.extraMoveLane =
        Math.min(currentLane / 0.1, course.maxLaneDistance) * 0.5 +
        this.laneMovementRng.random() * 0.1;
    }

    if (this.changeLaneSkillsActive.length > 0) {
      this.targetLane = 9.5 * course.horseLane;
    } else if (overtake) {
      this.targetLane = Math.max(this.targetLane, course.horseLane, this.extraMoveLane);
    } else if (!this.healthPolicy.hasRemainingHealth()) {
      this.targetLane = currentLane;
    } else if (this.positionKeepState === PositionKeepState.PaceDown) {
      this.targetLane = 0.18;
    } else if (this.extraMoveLane > currentLane) {
      this.targetLane = this.extraMoveLane;
    } else if (this.phase <= 1 && !sideBlocked) {
      this.targetLane = Math.max(0.0, currentLane - 0.05);
    } else {
      this.targetLane = currentLane;
    }

    if (
      (sideBlocked && this.targetLane < currentLane) ||
      Math.abs(this.targetLane - currentLane) < 0.00001
    ) {
      this.laneChangeSpeed = 0.0;
    } else {
      let targetSpeed = 0.02 * (0.3 + 0.001 * this.adjustedStats.power);

      if (this.position < this.race.course.moveLanePoint) {
        targetSpeed *= 1 + (currentLane / course.maxLaneDistance) * 0.05;
      }

      this.laneChangeSpeed = Math.min(
        this.laneChangeSpeed + course.laneChangeAccelerationPerFrame,
        targetSpeed,
      );

      const actualSpeed = Math.min(
        this.laneChangeSpeed +
          this.laneMovementSkillsActive.reduce((sum, skill) => sum + skill.modifier, 0),
        0.6,
      );

      if (this.targetLane > currentLane) {
        this.currentLane = Math.min(this.targetLane, currentLane + actualSpeed);
      } else {
        this.currentLane = Math.max(
          this.targetLane,
          currentLane - actualSpeed * (1.0 + currentLane),
        );
      }
    }
  }
  getConditionValue(name: string): number {
    if (!this.conditionValues.has(name)) {
      if (this.conditions.has(name)) {
        const condition = this.conditions.get(name)!;
        return condition.valueOnStart;
      }

      throw new Error(`Condition "${name}" is not registered`);
    }

    return this.conditionValues.get(name)!;
  }

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

  public get maxSpeed(): number {
    if (this.startDash) {
      return this.maxStartDashSpeed;
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

  /**
   * Helper method to create a new Runner instance.
   *
   * This will apply the mood coefficient and adjust the stats based on the course, ground, and strategy.
   */
  public static create(race: RaceSimulator, id: number, props: CreateRunner): Runner {
    const umaId = props.outfitId.slice(0, 4);

    const displayInfo = getUmaDisplayInfo(props.outfitId);
    const name = displayInfo?.name ?? `Mob ${id}`;

    const runner = new Runner(race, {
      id: id,
      outfitId: props.outfitId,
      umaId,
      name,
      mood: props.mood,
      strategy: props.strategy,
      aptitudes: props.aptitudes,
      stats: props.stats,
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
