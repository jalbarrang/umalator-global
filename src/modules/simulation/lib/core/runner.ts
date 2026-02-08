import { Rule30CARng } from '../utils/Random';
import { CourseHelpers } from '../course/CourseData';
import { Acceleration, CompensatedAccumulator, Speed, Timer } from './RaceSolver';
import type { IPositionKeepState } from '../skills/definitions';
import type { ActiveSkill, PendingSkill } from './RaceSolver';
import type { HpPolicy } from '../runner/health/health-policy';
import type { IAptitude, IMood, IStrategy } from '../runner/definitions';
import type { RaceSimulator } from './race-simulator';
import type { CourseData } from '../course/definitions';
import type { PRNG } from '../utils/Random';

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
  course: CourseData;
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
  declare private _race: RaceSimulator;

  /**
   * Unique ID for the runner
   *
   * Generated automatically by the RaceSimulator and set to the
   */
  private _id: string;

  /**
   * The Base Umamusume ID that this runner represents
   *
   * Default: `0001` for Mobs
   *
   * Example:
   * - `1001` for `Special Week`
   */
  private _umaId: string;

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
  private _outfitId: string;

  /**
   * The name of the runner
   *
   * Value is either <Random Name> or the name of the Umamusume that this runner represents
   *
   * Examples:
   * - `Special Week`
   * - `Silence Suzuka`
   */
  private _name: string;

  private _mood: IMood;
  private _strategy: IStrategy;
  private _stats: StatLine;
  private _aptitudes: RunnerAptitudes;

  declare private _rng: PRNG;
  declare private _rushedRng: PRNG;
  declare private _downhillRng: PRNG;
  declare private _posKeepRng: PRNG;
  declare private _laneMovementRng: PRNG;
  declare private _witRng: PRNG;

  /**
   * The gate number that the runner is in
   *
   * The value is between 1 and 9, where 1 is the leftmost gate and 9 is the rightmost gate.
   *
   * This value will be set by the RaceSimulator based on the gate roll.
   */
  declare private _gate: number;
  declare private _slopePenalties: Array<number>;

  declare private _sectionModifiers: Array<number>;
  declare private _baseAccel: Array<number>;
  declare private _baseTargetSpeedPerPhase: [number, number, number];

  declare private _isLastSpurt: boolean;
  declare private _lastSpurtSpeed: number;
  declare private _lastSpurtTransition: number;
  declare private _hasAchievedFullSpurt: boolean;

  // ===================
  // Starting Gate
  // ===================
  declare private _startDash: boolean;
  declare private _startDelay: number;
  declare private _startDelayAccumulator: number;

  /**
   * Current lane the runner is in
   */
  declare private _currentLane: number;

  declare private _position: number;
  /**
   * Whether the runner has finished the race.
   *
   * This is set to true when the runner crosses the finish line (reaches the courses distance).
   */
  declare private _hasFinishedRace: boolean;
  declare private _currentSpeed: number;
  declare private _targetSpeed: number;
  declare private _acceleration: number;
  declare private _modifiers: SpeedModifiers;

  /**
   * The health policy for the runner that determines how much HP is consumed and how much is recovered.
   */
  declare private _healthPolicy: HpPolicy;
  /**
   * Whether the runner has run out of HP and cannot maintain top speed at the last spurt.
   */
  declare private _outOfHp: boolean;

  /**
   * Whether the runner is currently in rushed mode
   */
  declare private _isRushed: boolean;

  // === Skill Tracking ===

  /**
   * The number of skills that have been activated by the runner
   */
  declare private _skillsActivatedCount: number;

  declare private _targetSpeedSkillsActive: Array<ActiveSkill>;
  declare private _currentSpeedSkillsActive: Array<ActiveSkill & { naturalDeceleration: boolean }>;
  declare private _accelerationSkillsActive: Array<ActiveSkill>;
  declare private _laneMovementSkillsActive: Array<ActiveSkill>;
  declare private _changeLaneSkillsActive: Array<ActiveSkill>;

  /**
   * The number of heals that have been activated by the runner
   */
  declare private _healsActivatedCount: number;

  /**
   * A map of phase to the number of skills that have been activated for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  declare private _skillsActivatedPhaseMap: [number, number, number, number];

  /**
   * A map of half race to the number of skills that have been activated for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  declare private _skillsActivatedHalfRaceMap: [number, number];

  /**
   * Skills that are pending activation
   */
  declare private _pendingSkills: Array<PendingSkill>;
  /**
   * Skills that are targeted by other runners
   */
  declare private _targetedSkills: Array<PendingSkill>;

  // ===================
  // Overtake
  // ===================

  /**
   * The number of times the runner has overtaken another runner
   */
  declare private _overtakeCount: number;

  /**
   * A map of phase to the number of times the runner has overtaken another runner for that phase
   *
   * Phases: [0, 1, 2, 3] (Early, Mid, Late, Last Spurt)
   */
  declare private _overtakeCountPerPhaseMap: [number, number, number, number];

  /**
   * A map of half race to the number of times the runner has overtaken another runner for that half race
   *
   * Half races: [0, 1] (First Half, Second Half)
   */
  declare private _overtakeCountPerHalfRaceMap: [number, number];

  // ===================
  // Spot Struggle
  // ===================

  /**
   * Whether the runner is currently in spot struggle.
   */
  declare private _inSpotStruggle: boolean;
  /**
   * The timer for the spot struggle.
   *
   * Counts for how long the runner has been in spot struggle.
   */
  declare private _spotStruggleTimer: Timer;
  declare private _spotStruggleStartPosition: number;
  declare private _spotStruggleEndPosition: number;
  /**
   * The IDs of the runners that this runner is spot struggling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  declare private _spotStruggleTargets: Set<string>;
  /**
   * Whether the runner has been in spot struggle at the start of the race.
   */
  declare private _hasSpotStruggle: boolean;

  // ===================
  // Dueling
  // ===================

  /**
   * Whether the runner is currently dueling with another runner.
   */
  declare private _isDueling: boolean;
  /**
   * The timer for the dueling.
   *
   * Counts for how long the runner has been in dueling.
   */
  declare private _duelingTimer: Timer;
  declare private _duelingStartPosition: number;
  declare private _duelingEndPosition: number;
  /**
   * The IDs of the runners that this runner is dueling with in the last spurt.
   *
   * Notes:
   * - This set doesn't get cleared until the race ends.
   * - This set doesn't include the runner itself.
   */
  declare private _duelTargets: Set<string>;
  /**
   * Whether the runner has dueled in the last spurt of this race.
   */
  declare private _hasDueled: boolean;

  // ===================
  // Hills
  // ===================

  /**
   * The index of the current hill that the runner is on.
   */
  declare private _currentHillIndex: number;
  /**
   * The index of the next hill that the runner needs to check.
   */
  declare private _nextHillToCheck: number;
  /**
   * The hills on the course.
   */
  declare private _hills: Array<{ start: number; end: number; slope: number }>;

  declare private _timers: Array<Timer>;
  declare private _accumulateTime: Timer;
  declare private _conditionTimer: Timer;
  declare private _phase: number;
  declare private _nextPhaseTransition: number;
  declare private _sectionLength: number;
  declare private _baseSpeed: number;
  declare private _minSpeed: number;
  declare private _gateRoll: number;
  declare private _randomLot: number;
  declare private _usedSkills: Set<string>;
  declare private _pendingSkillRemoval: Set<string>;
  declare private _rushedMaxDuration: number;
  declare private _rushedActivations: Array<[number, number]>;
  declare private _positionKeepActivations: Array<[number, number, IPositionKeepState]>;
  declare private _extraMoveLane: number;
  declare private _forceInSpeed: number;
  declare private _lastDownhillCheckFrame: number;
  declare private _targetLane: number;
  declare private _laneChangeSpeed: number;
  declare private _isDownhillMode: boolean;
  declare private _downhillModeStart: null;
  declare private _firstUmaInLateRace: boolean;
  declare private _hasBeenRushed: boolean;
  declare private _rushedSection: number;
  declare private _rushedStartPosition: number;
  declare private _rushedEndPosition: number;
  declare private _rushedTimer: Timer;

  constructor(props: RunnerProps) {
    // From props
    this._id = props.id;
    this._stats = props.stats;
    // Thought: Mood could be made so it could be randomly set per race as an option in the UI.
    this._mood = props.mood;
    this._strategy = props.strategy;
    this._aptitudes = props.aptitudes;

    // === Umamusume related ===
    this._umaId = props.umaId;
    this._outfitId = props.outfitId;
    this._name = props.name;
  }

  // === Setup ===

  public setGate(gate: number) {
    this._gate = gate;
    return this;
  }

  public setRaceSimulator(race: RaceSimulator) {
    this._race = race;
    return this;
  }

  public setupRng(rng: PRNG) {
    // Copy the master RNG
    this._rng = rng;

    // Derived RNGs
    this._rushedRng = new Rule30CARng(rng.int32());
    this._downhillRng = new Rule30CARng(rng.int32());
    this._posKeepRng = new Rule30CARng(rng.int32());
    this._laneMovementRng = new Rule30CARng(rng.int32());
    this._witRng = new Rule30CARng(rng.int32());

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
    this._baseAccel = [0, 1, 2, 0, 1, 2].map((phase, i) =>
      this.calculatePhaseBaseAccel(i > 2 ? UphillBaseAccel : BaseAccel, phase),
    );
  }

  /**
   * Cache frequently-accessed values for performance
   * Includes baseSpeed and slope penalties
   */
  private initializeCachedValues(): void {
    // Base speed is course-dependent constant
    this._baseSpeed = this._race.baseSpeed;

    // Cache slope penalties to avoid recalculating each hill
    this._slopePenalties = this._race.course.slopes.map(
      (s) => ((s.slope / 10000.0) * 200.0) / this._stats.power,
    );
  }

  /**
   * Initialize dueling and spot struggle tracking
   * These track multi-runner interactions
   */
  private initializeCompetitionTracking(): void {
    // === Dueling ===
    this._isDueling = false;
    this._hasDueled = false;
    this._duelingTimer = this.createTimer();
    this._duelingStartPosition = -1;
    this._duelingEndPosition = -1;
    this._duelTargets = new Set();

    // === Spot Struggle ===
    this._inSpotStruggle = false;
    this._hasSpotStruggle = false;
    this._spotStruggleTimer = this.createTimer();
    this._spotStruggleStartPosition = -1;
    this._spotStruggleEndPosition = -1;
    this._spotStruggleTargets = new Set();
  }

  /**
   * Initialize downhill mode state
   * Downhill mode can increase acceleration on downhill slopes
   */
  private initializeDownhillState(): void {
    this._isDownhillMode = false;
    this._downhillModeStart = null;
    this._lastDownhillCheckFrame = 0;
  }

  /**
   * Initialize health/stamina policy
   * Must be called after speed calculations
   */
  private initializeHealthPolicy(): void {
    this._healthPolicy.init(this);
    this._outOfHp = false;
    this._hasAchievedFullSpurt = false;
  }

  /**
   * Initialize hill tracking state
   * Sets up indices for efficient hill detection during race
   */
  private initializeHillTracking(): void {
    if (!CourseHelpers.isSortedByStart(this._race.course.slopes)) {
      throw new Error('slopes must be sorted by start location');
    }

    this._currentHillIndex = -1;
    this._nextHillToCheck = 0;
    this._hills = this._race.course.slopes.map((s) => ({
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
    const gateNumberRaw = this._gateRoll % 9;
    const gateNumber = gateNumberRaw < 9 ? gateNumberRaw : 1 + ((24 - gateNumberRaw) % 8);
    const initialLane = gateNumber * this._race.course.horseLane;

    this._currentLane = initialLane;
    this._targetLane = initialLane;
    this._laneChangeSpeed = 0.0;
    this._extraMoveLane = -1.0;
    this._forceInSpeed = 0.0;
  }

  /**
   * Initialize speed modifier accumulators
   * These track temporary skill effects on speed/accel
   */
  private initializeModifiers(): void {
    this._modifiers = {
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
    this._position = 0.0;
    this._acceleration = 0.0;
    this._currentSpeed = 3.0; // Initial speed at gate
    this._targetSpeed = 0.85 * this._race.baseSpeed;

    // Start dash state
    this._startDash = true;
    this._startDelay = 0.1 * this._rng.random(); // Random 0-100ms delay
    this._startDelayAccumulator = this._startDelay;
    this._modifiers.accel.add(24.0); // Start dash acceleration boost

    // Not finished yet
    this._hasFinishedRace = false;
  }

  /**
   * Initialize phase tracking
   * Phases: 0 (early), 1 (mid), 2 (late), last spurt
   */
  private initializePhaseTracking(): void {
    this._phase = 0;
    this._nextPhaseTransition = CourseHelpers.phaseStart(this._race.course.distance, 1);
    this._sectionLength = this._race.course.distance / 24.0;

    // Last spurt tracking
    this._isLastSpurt = false;
    this._lastSpurtTransition = -1;

    // First place tracking (for angling/scheming skills)
    // TODO: replace this later
    this._firstUmaInLateRace = false;
  }

  /**
   * Initialize random values used throughout race
   * These are drawn once at race start
   */
  private initializeRandomValues(): void {
    // Gate roll for position calculation
    // Uses LCM trick for uniform distribution when modding by numUmas
    this._gateRoll = this._rng.uniform(12252240);

    // Random lot for various skill conditions
    this._randomLot = this._rng.uniform(100);
  }

  /**
   * Initialize rushed state
   * Determines if/when runner will enter rushed state
   */
  private initializeRushedState(): void {
    this._isRushed = false;
    this._hasBeenRushed = false;
    this._rushedSection = -1;
    this._rushedStartPosition = -1;
    this._rushedEndPosition = -1;
    this._rushedTimer = this.createTimer();
    this._rushedMaxDuration = 12.0;
    this._rushedActivations = [];
  }

  /**
   * Initialize skill tracking arrays and counters
   * These track active and pending skills
   */
  private initializeSkillTracking(): void {
    // Active skill arrays (duration-based effects)
    this._targetSpeedSkillsActive = [];
    this._currentSpeedSkillsActive = [];
    this._accelerationSkillsActive = [];
    this._laneMovementSkillsActive = [];
    this._changeLaneSkillsActive = [];

    // Activation counters
    this._skillsActivatedCount = 0;
    this._skillsActivatedPhaseMap = [0, 0, 0, 0];
    this._skillsActivatedHalfRaceMap = [0, 0];
    this._healsActivatedCount = 0;

    // Pending skills (will be set by RaceSimulator)
    this._pendingSkills = [];
    this._targetedSkills = [];
    this._usedSkills = new Set();
    this._pendingSkillRemoval = new Set();

    // Overtake tracking
    this._overtakeCount = 0;
    this._overtakeCountPerPhaseMap = [0, 0, 0, 0];
    this._overtakeCountPerHalfRaceMap = [0, 0];
  }

  /**
   * Calculate speed values for each phase and last spurt
   * Must be called after gate skills activate (they can modify stats)
   */
  private initializeSpeedCalculations(): void {
    // Base target speeds for each phase [early, mid, late]
    this._baseTargetSpeedPerPhase = [0, 1, 2].map((phase) =>
      this.calculatePhaseTargetSpeed(phase),
    ) as [number, number, number];

    // Last spurt (final sprint) speed
    this._lastSpurtSpeed = this.calculateLastSpurtSpeed();

    // Minimum speed (prevents slowing below this after start dash)
    this._minSpeed = 0.85 * this._race.baseSpeed + Math.sqrt(200.0 * this._stats.guts) * 0.001;

    // Section modifiers (wisdom-based random variance per 1/24 section)
    this._sectionModifiers = Array.from({ length: 24 }, () => {
      if (!this._race.settings.sectionModifier) {
        return 0.0;
      }

      const max = (this._stats.wit / 5500.0) * Math.log10(this._stats.wit * 0.1);
      const factor = (max - 0.65 + this._witRng.random() * 0.65) / 100.0;
      return this._race.baseSpeed * factor;
    });

    // Add sentinel for race end
    this._sectionModifiers.push(0.0);
  }

  /**
   * Initialize timer system
   * Creates base timers used throughout race
   */
  private initializeTimers(): void {
    this._timers = [];
    this._accumulateTime = this.createTimer(0.0);
    this._conditionTimer = this.createTimer(-1.0);
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
    const strategyCoefficient = Acceleration.StrategyPhaseCoefficient[this._strategy][phase];
    const groundTypeProficiencyModifier =
      Acceleration.GroundTypeProficiencyModifier[this._aptitudes.surface];
    const distanceProficiencyModifier =
      Acceleration.DistanceProficiencyModifier[this._aptitudes.distance];

    // Accel = BaseAccel * sqrt(500.0 * PowerStat) * StrategyPhaseCoefficient * GroundTypeProficiencyModifier * DistanceProficiencyModifier
    return (
      accelModifier *
      Math.sqrt(500.0 * this._stats.power) *
      strategyCoefficient *
      groundTypeProficiencyModifier *
      distanceProficiencyModifier
    );
  }

  private calculatePhaseTargetSpeed(phase: number): number {
    const phaseCoefficient = Speed.StrategyPhaseCoefficient[this._strategy][phase];
    const baseTargetSpeed = this._race.baseSpeed * phaseCoefficient;

    if (phase === 2) {
      const proficiencyModifier = Speed.DistanceProficiencyModifier[this._aptitudes.distance];
      return baseTargetSpeed + Math.sqrt(500.0 * this._stats.speed) * proficiencyModifier * 0.002;
    }

    return baseTargetSpeed;
  }

  private calculateLastSpurtSpeed(): number {
    const courseBaseSpeed = this._race.baseSpeed;
    const lateRaceTargetSpeed = this._baseTargetSpeedPerPhase[2];
    const proficiencyModifier = Speed.DistanceProficiencyModifier[this._aptitudes.distance];

    let result =
      (lateRaceTargetSpeed + 0.01 * courseBaseSpeed) * 1.05 +
      Math.sqrt(500.0 * this._stats.speed) * proficiencyModifier * 0.002;

    // Add guts component
    result += Math.pow(450.0 * this._stats.guts, 0.597) * 0.0001;

    return result;
  }

  private initHills() {
    if (!CourseHelpers.isSortedByStart(this._race.course.slopes)) {
      throw new Error('slopes must be sorted by start location');
    }

    this._currentHillIndex = -1;
    this._nextHillToCheck = 0;
    this._hills = this._race.course.slopes.map((s) => ({
      start: s.start,
      end: s.start + s.length,
      slope: s.slope,
    }));
  }

  private updateHills() {
    // Check if we've exited current hill
    if (this._currentHillIndex >= 0) {
      const hill = this._hills[this._currentHillIndex];
      if (this._position > hill.end) {
        this._currentHillIndex = -1;
      }
    }

    // Check if we've entered next hill
    if (this._currentHillIndex === -1 && this._nextHillToCheck < this._hills.length) {
      const nextHill = this._hills[this._nextHillToCheck];
      if (this._position >= nextHill.start) {
        // Only track uphills with >1% grade
        if (nextHill.slope > 100) {
          this._currentHillIndex = this._nextHillToCheck;
        }

        this._nextHillToCheck++;
      }
    }
  }

  public step(dt: number): void {
    // Early exit if the runner has finished the race already.
    if (this._hasFinishedRace) {
      return;
    }

    let dtAfterDelay = dt;

    if (this._startDelayAccumulator > 0.0) {
      this._startDelayAccumulator -= dt;

      if (this._startDelayAccumulator > 0.0) {
        return;
      }
    }

    // Logic chunks
    this.updateHills();

    // Update position

    this._currentSpeed = Math.min(this._currentSpeed + this._acceleration * dt, this.maxSpeed);

    if (!this._startDash && this._currentSpeed < this.minSpeed) {
      this._currentSpeed = this.minSpeed;
    }

    const displacement =
      this._currentSpeed + this._modifiers.currentSpeed.acc + this._modifiers.currentSpeed.err;

    if (this._startDelayAccumulator < 0.0) {
      dtAfterDelay = Math.abs(this._startDelayAccumulator);
      this._startDelayAccumulator = 0.0;
    }

    this._position += displacement * dtAfterDelay;
    // this._healthPolicy.tick(this, dt);

    if (!this._healthPolicy.hasRemainingHp() && !this._outOfHp) {
      this._outOfHp = true;
    }

    if (this._startDash && this._currentSpeed >= 0.85 * this._race.baseSpeed) {
      this._startDash = false;
      this._modifiers.accel.add(-24.0);
    }

    this._modifiers.oneFrameAccel = 0.0;
  }

  private updatePosition() {}

  private activateSkill(): void {}

  /**
   * Does a Wit Check for a skill a Runner is trying to activate.
   */
  private doWitCheck(): boolean {
    if (!this._race.settings.witChecks) {
      return true;
    }

    const witStat = this._stats.wit;

    const rngRoll = this._witRng.random();

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
    const wisdomStat = this._stats.wit;

    return Math.pow(6.5 / Math.log10(0.1 * wisdomStat + 1), 2) / 100;
  }

  private get hasSelfControl(): boolean {
    return this._pendingSkills.some((s) => s.skillId === '202161');
  }

  private get rushedChance(): number {
    return this.baseRushedChance - (this.hasSelfControl ? 0.03 : 0);
  }

  private applyRushedState() {
    if (!this._race.settings.rushed) {
      return;
    }

    if (this._rushedRng.random() < this.rushedChance) {
      // Determine which section (2-9) the rushed state activates in
      this._rushedSection = 2 + this._rushedRng.uniform(8); // Random int from 2 to 9
      this._rushedStartPosition = this._sectionLength * this._rushedSection;
    }
  }

  private get maxSpeed(): number {
    if (this._startDash) {
      return Math.min(this._targetSpeed, 0.85 * this._race.baseSpeed);
    }

    if (this._currentSpeed + this._modifiers.oneFrameAccel > this._targetSpeed) {
      return 9999.0;
    }

    return this._targetSpeed;
  }

  private get minSpeed(): number {
    // TODO: Cache this value.
    return 0.85 * this._race.baseSpeed + Math.sqrt(200.0 * this._stats.guts) * 0.001;
  }

  public get hasFinishedRace(): boolean {
    return this._hasFinishedRace;
  }

  public get position(): number {
    return this._position;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Create a new timer and register it
   * @param initialValue Initial timer value (default 0)
   */
  private createTimer(initialValue: number = 0): Timer {
    const timer = new Timer(initialValue);
    this._timers.push(timer);
    return timer;
  }
}
