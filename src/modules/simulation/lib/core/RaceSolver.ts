import { cloneDeep } from 'es-toolkit';
import { ApproximateMultiCondition, ApproximateStartContinue } from './ApproximateStartContinue';
import type { IPosKeepMode, IStrategy } from '@/modules/simulation/lib/runner/definitions';
import type {
  IPositionKeepState,
  ISkillPerspective,
  ISkillRarity,
  ISkillTarget,
  ISkillType,
} from '@/modules/simulation/lib/skills/definitions';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { Region } from '@/modules/simulation/lib/utils/Region';
import type { HorseParameters } from '@/modules/simulation/lib/runner/HorseTypes';
import type { CourseData, IPhase } from '@/modules/simulation/lib/course/definitions';
import type {
  ApproximateCondition,
  ConditionEntry,
  ConditionState,
} from '@/modules/simulation/lib/core/ApproximateStartContinue';
import type { HpPolicy } from '@/modules/simulation/lib/runner/health/HpPolicy';
import { PosKeepMode, Strategy } from '@/modules/simulation/lib/runner/definitions';
import {
  PositionKeepState,
  SkillPerspective,
  SkillRarity,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';
import { Rule30CARng } from '@/modules/simulation/lib/utils/Random';
import { StrategyHelpers } from '@/modules/simulation/lib/runner/HorseTypes';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const Speed = {
  StrategyPhaseCoefficient: [
    [], // strategies start numbered at 1
    [1.0, 0.98, 0.962],
    [0.978, 0.991, 0.975],
    [0.938, 0.998, 0.994],
    [0.931, 1.0, 1.0],
    [1.063, 0.962, 0.95],
  ],
  DistanceProficiencyModifier: [1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1],
};

function baseTargetSpeed(horse: HorseParameters, courseBaseSpeed: number, phase: IPhase) {
  const phaseCoefficient = Speed.StrategyPhaseCoefficient[horse.strategy][phase];

  return (
    courseBaseSpeed * phaseCoefficient +
    (phase == 2
      ? Math.sqrt(500.0 * horse.speed) *
        Speed.DistanceProficiencyModifier[horse.distanceAptitude] *
        0.002
      : 0)
  );
}

function lastSpurtSpeed(horse: HorseParameters, courseBaseSpeed: number) {
  let v =
    (baseTargetSpeed(horse, courseBaseSpeed, 2) + 0.01 * courseBaseSpeed) * 1.05 +
    Math.sqrt(500.0 * horse.speed) *
      Speed.DistanceProficiencyModifier[horse.distanceAptitude] *
      0.002;
  v += Math.pow(450.0 * horse.guts, 0.597) * 0.0001;
  return v;
}

export const Acceleration = {
  StrategyPhaseCoefficient: [
    [],
    [1.0, 1.0, 0.996],
    [0.985, 1.0, 0.996],
    [0.975, 1.0, 1.0],
    [0.945, 1.0, 0.997],
    [1.17, 0.94, 0.956],
  ],
  GroundTypeProficiencyModifier: [1.05, 1.0, 0.9, 0.8, 0.7, 0.5, 0.3, 0.1],
  DistanceProficiencyModifier: [1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.5, 0.4],
};

const BaseAccel = 0.0006;
const UphillBaseAccel = 0.0004;

function baseAccel(baseAccel: number, horse: HorseParameters, phase: IPhase) {
  const strategyCoefficient = Acceleration.StrategyPhaseCoefficient[horse.strategy][phase];
  const groundTypeProficiencyModifier =
    Acceleration.GroundTypeProficiencyModifier[horse.surfaceAptitude];
  const distanceProficiencyModifier =
    Acceleration.DistanceProficiencyModifier[horse.distanceAptitude];

  // Accel = BaseAccel * sqrt(500.0 * PowerStat) * StrategyPhaseCoefficient * GroundTypeProficiencyModifier * DistanceProficiencyModifier
  return (
    baseAccel *
    Math.sqrt(500.0 * horse.power) *
    strategyCoefficient *
    groundTypeProficiencyModifier *
    distanceProficiencyModifier
  );
}

export const PhaseDeceleration: ReadonlyArray<number> = [-1.2, -0.8, -1.0];

export const PositionKeep = {
  BaseMinimumThreshold: [0, 0, 3.0, 6.5, 7.5],
  BaseMaximumThreshold: [0, 0, 5.0, 7.0, 8.0],

  courseFactor(distance: number) {
    return 0.0008 * (distance - 1000) + 1.0;
  },

  minThreshold(strategy: IStrategy, distance: number) {
    // senkou minimum threshold is a constant 3.0 independent of the course factor for some reason
    return (
      this.BaseMinimumThreshold[strategy] *
      (strategy == Strategy.PaceChaser ? 1.0 : this.courseFactor(distance))
    );
  },

  maxThreshold(strategy: IStrategy, distance: number) {
    return this.BaseMaximumThreshold[strategy] * this.courseFactor(distance);
  },
};

// these are commonly initialized with a negative number and then checked >= 0 to see if a duration is up
// (the reason for doing that instead of initializing with 0 and then checking against the duration is if
// the code that checks for the duration expiring is separate from the code that initializes the timer and
// has to deal with different durations)
export class Timer {
  constructor(public t: number) {}
}

export class CompensatedAccumulator {
  constructor(
    public acc: number,
    public err: number = 0.0,
  ) {}

  add(n: number) {
    const t = this.acc + n;
    if (Math.abs(this.acc) >= Math.abs(n)) {
      this.err += this.acc - t + n;
    } else {
      this.err += n - t + this.acc;
    }
    this.acc = t;
  }
}

export type RaceState = {
  accumulatetime: Readonly<Timer>;
  activateCount: Array<number>;
  activateCountHeal: number;
  currentSpeed: number;
  isLastSpurt: boolean;
  lastSpurtSpeed: number;
  lastSpurtTransition: number;
  positionKeepState: IPositionKeepState;
  isDownhillMode: boolean;
  phase: IPhase;
  pos: number;
  hp: Readonly<HpPolicy>;
  randomLot: number;
  startDelay: number;
  gateRoll: number;
  usedSkills: ReadonlySet<string>;
  leadCompetition: boolean;
  posKeepStrategy: IStrategy;
};

export type DynamicCondition = (state: RaceState) => boolean;

export function getPositionKeepStateName(state: IPositionKeepState): string {
  switch (state) {
    case PositionKeepState.None:
      return 'None';
    case PositionKeepState.PaceUp:
      return 'PaceUp';
    case PositionKeepState.PaceDown:
      return 'PaceDown';
    case PositionKeepState.SpeedUp:
      return 'SpeedUp';
    case PositionKeepState.Overtake:
      return 'Overtake';
    default:
      return 'Unknown';
  }
}

export function getPosKeepModeName(mode: IPosKeepMode): string {
  switch (mode) {
    case PosKeepMode.None:
      return 'None';
    case PosKeepMode.Approximate:
      return 'Approximate';
    case PosKeepMode.Virtual:
      return 'Virtual';
    default:
      return 'Unknown';
  }
}

export interface SkillEffect {
  type: ISkillType;
  baseDuration: number;
  modifier: number;
  target: ISkillTarget;
}

export interface PendingSkill {
  skillId: string;
  perspective: ISkillPerspective;
  rarity: ISkillRarity;
  trigger: Region;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
  originWisdom?: number;
}

export interface ActiveSkill {
  executionId: string;
  skillId: string;
  perspective: ISkillPerspective;
  durationTimer: Timer;
  modifier: number;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
}

function noop(..._args: Array<unknown>) {}

export type OnSkillCallback = (event: {
  raceSolver: RaceSolver;
  currentPosition: number;
  skillId: string;
}) => void;

export type OnSkillEffectCallback = (
  raceSolver: RaceSolver,
  currentPosition: number,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  type: ISkillType,
  target: ISkillTarget,
) => void;

type RaceSolverParams = {
  horse: HorseParameters;
  course: CourseData;
  rng: PRNG;
  skills: Array<PendingSkill>;
  hp: HpPolicy;
  onSkillActivated: OnSkillCallback | undefined;
  onEffectActivated: OnSkillEffectCallback | undefined;
  onEffectExpired: OnSkillEffectCallback | undefined;
  disableRushed?: boolean;
  disableDownhill?: boolean;
  disableSectionModifier?: boolean;
  speedUpProbability?: number;
  skillCheckChance?: boolean;
  posKeepMode?: IPosKeepMode;
  mode?: string;
  isPacer?: boolean;
};

export class RaceSolver {
  accumulatetime: Timer;
  pos: number;
  minSpeed: number;
  currentSpeed: number;
  targetSpeed: number;
  accel: number;
  baseTargetSpeed: Array<number>;
  lastSpurtSpeed: number;
  lastSpurtTransition: number;
  sectionModifier: Array<number>;
  baseAccel: Array<number>;
  horse: { -readonly [P in keyof HorseParameters]: HorseParameters[P] };
  course: CourseData;
  // Cached values for performance optimization
  baseSpeed: number;
  cachedSlopePenalties: Array<number>;
  hp: HpPolicy;
  rng: PRNG;
  syncRng: PRNG;
  gorosiRng: PRNG;
  rushedRng: PRNG;
  downhillRng: PRNG;
  wisdomRollRng: PRNG;
  posKeepRng: PRNG;
  laneMovementRng: PRNG;
  timers: Array<Timer>;
  startDash: boolean;
  startDelay: number;
  startDelayAccumulator: number;
  gateRoll: number;
  randomLot: number;
  declare isLastSpurt: boolean;
  phase: IPhase;
  nextPhaseTransition: number;
  activeTargetSpeedSkills: Array<ActiveSkill>;
  activeCurrentSpeedSkills: Array<ActiveSkill & { naturalDeceleration: boolean }>;
  activeAccelSkills: Array<ActiveSkill>;
  activeLaneMovementSkills: Array<ActiveSkill>;
  activeChangeLaneSkills: Array<ActiveSkill>;
  pendingSkills: Array<PendingSkill>;
  pendingRemoval: Set<string>;
  usedSkills: Set<string>;
  declare nHills: number;
  declare hillIdx: number;
  declare hillStart: Array<number>;
  declare hillEnd: Array<number>;

  //=== Skill Tracking ===

  /**
   * Tracks the number of times a skill has been activated.
   */
  activateCount: Array<number>;

  /**
   * Tracks the number of times a skill has been activated for healing specifically.
   */
  activateCountHeal: number;

  /**
   * Callback when a skill is being activated by a runner.
   *
   * Normally this will also call the `onEffectActivated` callback for each effect in the skill.
   */
  onSkillActivated: OnSkillCallback;

  /**
   * Callback for when a skill effect is being activated.
   */
  onEffectActivated: OnSkillEffectCallback;

  /**
   * Callback for when a skill effect is being expired.
   */
  onEffectExpired: (
    raceSolver: RaceSolver,
    currentPosition: number,
    executionId: string,
    skillId: string,
    perspective: ISkillPerspective,
    type: ISkillType,
    target: ISkillTarget,
  ) => void;

  sectionLength: number;
  umas: Array<RaceSolver>;
  isPacer: boolean;
  pacerOverride: boolean;
  posKeepMinThreshold: number;
  posKeepMaxThreshold: number;
  declare posKeepCooldown: Timer;
  posKeepNextTimer: Timer;
  declare posKeepExitPosition: number;
  declare posKeepExitDistance: number;
  posKeepEnd: number;
  positionKeepState: IPositionKeepState;
  posKeepMode: IPosKeepMode;
  posKeepSpeedCoef: number;
  posKeepStrategy: IStrategy;
  mode: string | undefined;
  pacer: RaceSolver | null;

  // Rushed state
  isRushed: boolean;
  hasBeenRushed: boolean; // Track if horse has already been rushed this race (can only happen once)
  rushedSection: number; // Which section (2-9) the rushed state activates in
  rushedEnterPosition: number; // Position where rushed state should activate
  rushedTimer: Timer; // Tracks time in rushed state
  rushedMaxDuration: number; // Maximum duration (12s + extensions)
  rushedActivations: Array<[number, number]>; // Track [start, end] positions for UI
  positionKeepActivations: Array<[number, number, IPositionKeepState]>; // Track [start, end, state] positions for UI

  speedUpProbability: number; // 0-100, probability of entering speed-up mode

  //downhill mode
  isDownhillMode: boolean;
  disableDownhill: boolean;
  downhillModeStart: number | null; // Frame when downhill mode started
  lastDownhillCheckFrame: number; // Last frame we checked for downhill mode changes

  //skill check chance
  skillCheckChance: boolean;

  // Compete Fight
  competeFight: boolean;
  competeFightStart: number | null;
  competeFightEnd: number | null;
  competeFightTimer: Timer;
  competeFightTargets: Set<RaceSolver>;

  // Lead Competition
  leadCompetition: boolean;
  leadCompetitionStart: number | null;
  leadCompetitionEnd: number | null;
  leadCompetitionTimer: Timer;

  // lane movement..........
  currentLane: number;
  targetLane: number;
  laneChangeSpeed: number;
  extraMoveLane: number;
  forceInSpeed: number;

  firstUmaInLateRace: boolean;

  hpDied: boolean;
  fullSpurt: boolean;

  modifiers: {
    targetSpeed: CompensatedAccumulator;
    currentSpeed: CompensatedAccumulator;
    accel: CompensatedAccumulator;
    oneFrameAccel: number;
    specialSkillDurationScaling: number;
  };

  private conditionTimer: Timer;
  private conditionValues: Map<string, number> = new Map();
  private conditions: Map<string, ApproximateCondition> = new Map();

  constructor(params: RaceSolverParams) {
    // clone since green skills may modify the stat values
    this.horse = Object.assign({}, params.horse);
    this.course = params.course;
    this.hp = params.hp;
    this.rng = params.rng;
    this.pendingSkills = cloneDeep(params.skills); // copy since we remove from it
    this.pendingRemoval = new Set();
    this.usedSkills = new Set();
    this.syncRng = new Rule30CARng(this.rng.int32());
    this.gorosiRng = new Rule30CARng(this.rng.int32());
    this.rushedRng = new Rule30CARng(this.rng.int32());
    this.downhillRng = new Rule30CARng(this.rng.int32());
    this.wisdomRollRng = new Rule30CARng(this.rng.int32());
    this.posKeepRng = new Rule30CARng(this.rng.int32());
    this.laneMovementRng = new Rule30CARng(this.rng.int32());
    this.timers = [];
    this.conditionTimer = this.getNewTimer(-1.0);
    this.accumulatetime = this.getNewTimer();
    // bit of a hack because implementing post_number is surprisingly annoying, since we don't have RaceParameters.numUmas available here
    // and can't draw random numbers in the conditions. instead what we do is draw a random number here that decides the gate, and then
    // in the post_number dynamic condition we mod that by the number of umas to figure out our starting position, and then figure out
    // which gate block that is in. however, n%k is not in general uniformly distributed for a random n, and we can't/don't want to instantiate
    // a new rng instance in the dynamic condition for rejection sampling. fortunately n%k IS uniformly distributed when n_max ≡ k - 1 (mod k)
    // the smallest n_max where that is true for every k in [1,18] is lcm(1, 2, … 18) - 1 (n_max ≡ k-1 (mod k) means k divides n_max+1. the
    // smallest n_max where this is true for every k = 1, 2, … 18 is lcm(1, 2, … 18) - 1), which is 12252239. since PRNG#uniform excludes its
    // upper bound, just generate up to lcm(1, 2, … 18) = 12252240
    this.gateRoll = this.rng.uniform(12252240);
    this.randomLot = this.rng.uniform(100);
    this.phase = 0;
    this.nextPhaseTransition = CourseHelpers.phaseStart(this.course.distance, 1);

    // ## Skill Tracking

    // ### Skill activations
    this.activeTargetSpeedSkills = [];
    this.activeCurrentSpeedSkills = [];
    this.activeAccelSkills = [];
    this.activeLaneMovementSkills = [];
    this.activeChangeLaneSkills = [];
    this.activateCount = [0, 0, 0];
    this.activateCountHeal = 0;

    // ### Skill callback
    this.onSkillActivated = params.onSkillActivated ?? noop;
    // ### Effect callbacks
    this.onEffectActivated = params.onEffectActivated ?? noop;
    this.onEffectExpired = params.onEffectExpired ?? noop;

    this.sectionLength = this.course.distance / 24.0;
    this.posKeepMinThreshold = PositionKeep.minThreshold(this.horse.strategy, this.course.distance);
    this.posKeepMaxThreshold = PositionKeep.maxThreshold(this.horse.strategy, this.course.distance);
    this.posKeepNextTimer = this.getNewTimer();
    this.positionKeepState = PositionKeepState.None;
    this.posKeepMode = params.posKeepMode ?? PosKeepMode.None;
    this.posKeepStrategy = this.horse.strategy;
    this.mode = params.mode;

    // For skill chart we want to minimize poskeep skewing results
    // (i.e. in rare situations, an uma can proc a velocity skill, and gain initial positioning
    // but then lose that positioning because they are too far forward to proc Pace Up)
    // this then results in -L in the charts

    this.posKeepEnd = this.sectionLength * (this.mode === 'compare' ? 10.0 : 3.0);
    this.posKeepSpeedCoef = 1.0;
    this.isPacer = params.isPacer ?? false;
    this.pacerOverride = false;
    this.umas = [];
    this.pacer = null;

    // init timer
    this.speedUpProbability = params.speedUpProbability != null ? params.speedUpProbability : 100;

    // Initialize rushed state
    this.isRushed = false;
    this.hasBeenRushed = false;
    this.rushedSection = -1;
    this.rushedEnterPosition = -1;
    this.rushedTimer = this.getNewTimer();
    this.rushedMaxDuration = 12.0;

    // Initialize downhill mode
    this.isDownhillMode = false;
    this.disableDownhill = params.disableDownhill ?? false;
    this.downhillModeStart = null;
    this.lastDownhillCheckFrame = 0;

    // Initialize skill check chance
    this.skillCheckChance = params.skillCheckChance ?? true; // Default to true
    this.rushedActivations = [];
    this.positionKeepActivations = [];
    this.firstUmaInLateRace = false;
    this.hpDied = false;
    this.fullSpurt = false;
    // Calculate rushed chance and determine if/when it activates
    this.initRushedState(params.disableRushed ?? false);

    this.competeFight = false;
    this.competeFightStart = null;
    this.competeFightEnd = null;
    this.competeFightTimer = this.getNewTimer();
    this.competeFightTargets = new Set();

    this.leadCompetition = false;
    this.leadCompetitionStart = null;
    this.leadCompetitionEnd = null;
    this.leadCompetitionTimer = this.getNewTimer();

    const gateNumberRaw = this.gateRoll % 9;
    const gateNumber = gateNumberRaw < 9 ? gateNumberRaw : 1 + ((24 - gateNumberRaw) % 8);
    const initialLane = gateNumber * this.course.horseLane;

    this.currentLane = initialLane;
    this.targetLane = initialLane;
    this.laneChangeSpeed = 0.0;
    this.extraMoveLane = -1.0;
    this.forceInSpeed = 0.0;

    this.modifiers = {
      targetSpeed: new CompensatedAccumulator(0.0),
      currentSpeed: new CompensatedAccumulator(0.0),
      accel: new CompensatedAccumulator(0.0),
      oneFrameAccel: 0.0,
      specialSkillDurationScaling: 1.0,
    };

    this.initHills();

    // Cache baseSpeed and slope penalties for performance
    this.baseSpeed = 20.0 - (this.course.distance - 2000) / 1000.0;
    this.cachedSlopePenalties = this.course.slopes.map(
      (s) => ((s.slope / 10000.0) * 200.0) / this.horse.power,
    );

    this.startDelay = 0.1 * this.rng.random();

    this.pos = 0.0;
    this.accel = 0.0;
    this.currentSpeed = 3.0;
    this.targetSpeed = 0.85 * this.baseSpeed;
    this.processSkillActivations(); // activate gate skills (must come before setting minimum speed because green skills can modify guts)
    this.minSpeed = 0.85 * this.baseSpeed + Math.sqrt(200.0 * this.horse.guts) * 0.001;
    this.startDash = true;
    this.modifiers.accel.add(24.0); // start dash accel

    this.startDelayAccumulator = this.startDelay;

    // similarly this must also come after the first round of skill activations
    this.baseTargetSpeed = [0, 1, 2].map((phase) =>
      baseTargetSpeed(this.horse, this.baseSpeed, phase as IPhase),
    );
    this.lastSpurtSpeed = lastSpurtSpeed(this.horse, this.baseSpeed);
    this.lastSpurtTransition = -1;

    this.sectionModifier = Array.from({ length: 24 }, () => {
      if (params.disableSectionModifier) {
        return 0.0;
      }
      const max = (this.horse.wisdom / 5500.0) * Math.log10(this.horse.wisdom * 0.1);
      const factor = (max - 0.65 + this.wisdomRollRng.random() * 0.65) / 100.0;
      return this.baseSpeed * factor;
    });
    this.sectionModifier.push(0.0); // last tick after the race is done, or in a comparison in case one uma runs off the end of the track

    this.hp.init(this.horse);

    this.baseAccel = [0, 1, 2, 0, 1, 2].map((phase, i) =>
      baseAccel(i > 2 ? UphillBaseAccel : BaseAccel, this.horse, phase as IPhase),
    );

    this.registerBlockedSideCondition();
    this.registerOvertakeCondition();
  }

  private registerBlockedSideCondition(): void {
    const conditions: Array<ConditionEntry> = [
      {
        condition: new ApproximateStartContinue('Outer lane', 0.0, 0.0),
        predicate: (state: ConditionState) => {
          const sim = state.simulation;
          const section = Math.floor(sim.pos / sim.sectionLength);
          return section >= 1 && section <= 3 && sim.currentLane > 3.0 * this.course.horseLane;
        },
      },
      {
        condition: new ApproximateStartContinue('Early race', 0.1, 0.85),
        predicate: (state: ConditionState) => state.simulation.phase === 0,
      },
      {
        condition: new ApproximateStartContinue('Mid race', 0.08, 0.75),
        predicate: (state: ConditionState) => state.simulation.phase === 1,
      },
      {
        condition: new ApproximateStartContinue('Other', 0.07, 0.5),
        predicate: null,
      },
    ];

    const blockedSideCondition = new ApproximateMultiCondition('blocked_side', conditions, 1);

    this.registerCondition('blocked_side', blockedSideCondition);
  }

  private registerOvertakeCondition(): void {
    const conditions: Array<ConditionEntry> = [
      {
        condition: new ApproximateStartContinue('逃げ', 0.05, 0.5),
        predicate: (state: ConditionState) => {
          return state.simulation.horse.strategy === Strategy.FrontRunner;
        },
      },
      {
        condition: new ApproximateStartContinue('先行', 0.15, 0.55),
        predicate: (state: ConditionState) => {
          return state.simulation.horse.strategy === Strategy.PaceChaser;
        },
      },
      {
        condition: new ApproximateStartContinue('その他', 0.2, 0.6),
        predicate: null,
      },
    ];

    const overtakeCondition = new ApproximateMultiCondition('overtake', conditions);

    this.registerCondition('overtake', overtakeCondition);
  }

  initUmas(umas: Array<RaceSolver>) {
    this.umas = [...umas.filter((uma) => uma != null), this];
  }

  initHills() {
    // note that slopes are not always sorted by start location in course_data.json
    // sometimes (?) they are sorted by hill type and then by start
    // require this here because the code relies on encountering them sequentially

    if (!CourseHelpers.isSortedByStart(this.course.slopes)) {
      throw new Error('slopes must be sorted by start location');
    }

    this.nHills = this.course.slopes.length;
    this.hillStart = this.course.slopes.map((s) => s.start).reverse();
    this.hillEnd = this.course.slopes.map((s) => s.start + s.length).reverse();
    this.hillIdx = -1;
    if (this.hillStart.length > 0 && this.hillStart[this.hillStart.length - 1] == 0) {
      // Only set hillIdx for uphills with >1.0% grade
      if (this.course.slopes[0].slope > 100) {
        this.hillIdx = 0;
      } else {
        this.hillEnd.pop();
      }
      this.hillStart.pop();
    }
  }

  getNewTimer(t: number = 0) {
    const tm = new Timer(t);
    this.timers.push(tm);
    return tm;
  }

  initRushedState(disabled: boolean) {
    // Skip rushed calculation if disabled
    if (disabled) {
      return;
    }

    // Calculate rushed chance based on wisdom
    // Formula: RushedChance = (6.5 / log10(0.1 * WizStat + 1))²%
    const wisdomStat = this.horse.wisdom;
    const rushedChance = Math.pow(6.5 / Math.log10(0.1 * wisdomStat + 1), 2) / 100;

    // Check if horse has The Restraint skill - ID 202161
    // This reduces rushed chance by flat 3%
    const hasSelfControl = this.pendingSkills.some((s) => s.skillId === '202161');
    const finalRushedChance = Math.max(0, rushedChance - (hasSelfControl ? 0.03 : 0));

    // Roll for rushed state
    if (this.rushedRng.random() < finalRushedChance) {
      // Determine which section (2-9) the rushed state activates in
      this.rushedSection = 2 + this.rushedRng.uniform(8); // Random int from 2 to 9
      this.rushedEnterPosition = this.sectionLength * this.rushedSection;
    }
  }

  updateRushedState() {
    // Check if we should enter rushed state (can only happen once per race)
    if (
      this.rushedSection >= 0 &&
      !this.isRushed &&
      !this.hasBeenRushed &&
      this.pos >= this.rushedEnterPosition
    ) {
      this.isRushed = true;
      this.hasBeenRushed = true; // Mark that this horse has been rushed
      this.rushedTimer.t = 0;
      this.rushedActivations.push([this.pos, -1]); // Start tracking, end will be filled later
    }

    // Update rushed state if active
    if (this.isRushed) {
      // Check for recovery every 3 seconds
      if (
        this.rushedTimer.t > 0 &&
        Math.floor(this.rushedTimer.t / 3) > Math.floor((this.rushedTimer.t - 0.017) / 3)
      ) {
        // 55% chance to snap out of it
        if (this.rushedRng.random() < 0.55) {
          this.endRushedState();
          return;
        }
      }

      // Force end after max duration
      if (this.rushedTimer.t >= this.rushedMaxDuration) {
        this.endRushedState();
      }
    }
  }

  endRushedState() {
    this.isRushed = false;
    // Mark the end position for UI display
    if (this.rushedActivations.length > 0) {
      const lastIdx = this.rushedActivations.length - 1;
      if (this.rushedActivations[lastIdx][1] === -1) {
        this.rushedActivations[lastIdx][1] = this.pos;
      }
    }
  }

  getMaxSpeed() {
    if (this.startDash) {
      // target speed can be below 0.85 * BaseSpeed for non-runners if there is a hill at the start of the course
      // in this case you actually don't exit start dash until your target speed is high enough to be over 0.85 * BaseSpeed
      return Math.min(this.targetSpeed, 0.85 * this.baseSpeed);
    } else if (this.currentSpeed + this.modifiers.oneFrameAccel > this.targetSpeed) {
      return 9999.0; // allow decelerating if targetSpeed drops
    } else {
      return this.targetSpeed;
    }
    // technically, there's a hard cap of 30m/s, but there's no way to actually hit that without implementing the Pace Up Ex position keep mode
  }

  step(dt: number) {
    let dtAfterDelay = dt;

    this.timers.forEach((tm) => (tm.t += dt));

    if (this.conditionTimer.t >= 0.0) {
      this.tickConditions();
      this.conditionTimer.t = -1.0;
    }

    if (this.startDelayAccumulator > 0.0) {
      this.startDelayAccumulator -= dt;

      if (this.startDelayAccumulator > 0.0) {
        return;
      }
    }

    this.updateHills();
    this.updatePhase();
    this.updateRushedState();
    this.updateDownhillMode();
    this.processSkillActivations();
    this.applyPositionKeepStates();
    this.updatePositionKeepCoefficient();
    this.updateCompeteFight();
    this.updateLeadCompetition();
    this.updateLastSpurtState();
    this.updateTargetSpeed();
    this.applyForces();
    this.applyLaneMovement();

    this.currentSpeed = Math.min(this.currentSpeed + this.accel * dt, this.getMaxSpeed());

    if (!this.startDash && this.currentSpeed < this.minSpeed) {
      this.currentSpeed = this.minSpeed;
    }

    const displacement =
      this.currentSpeed + this.modifiers.currentSpeed.acc + this.modifiers.currentSpeed.err;

    if (this.startDelayAccumulator < 0.0) {
      dtAfterDelay = Math.abs(this.startDelayAccumulator);
      this.startDelayAccumulator = 0.0;
    }

    this.pos += displacement * dtAfterDelay;
    this.hp.tick(this, dt);

    if (!this.hp.hasRemainingHp() && !this.hpDied) {
      this.hpDied = true;
    }

    if (this.startDash && this.currentSpeed >= 0.85 * this.baseSpeed) {
      this.startDash = false;
      this.modifiers.accel.add(-24.0);
    }

    this.modifiers.oneFrameAccel = 0.0;
  }

  applyLaneMovement() {
    const currentLane = this.currentLane;
    const sideBlocked = this.getConditionValue('blocked_side') === 1;
    const overtake = this.getConditionValue('overtake') === 1;
    // TODO: Simulate 'overtake' condition to prevent umas from getting stuck on inside rail late-race
    // At the moment this doesn't matter because all we care about is early-race behavior.

    if (this.extraMoveLane < 0.0 && this.isAfterFinalCornerOrInFinalStraight()) {
      this.extraMoveLane =
        Math.min(currentLane / 0.1, this.course.maxLaneDistance) * 0.5 +
        this.laneMovementRng.random() * 0.1;
    }

    if (this.activeChangeLaneSkills.length > 0) {
      this.targetLane = 9.5 * this.course.horseLane;
    } else if (overtake) {
      this.targetLane = Math.max(this.targetLane, this.course.horseLane, this.extraMoveLane);
    } else if (!this.hp.hasRemainingHp()) {
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
      let targetSpeed = 0.02 * (0.3 + 0.001 * this.horse.power);

      if (this.pos < this.course.moveLanePoint) {
        targetSpeed *= 1 + (currentLane / this.course.maxLaneDistance) * 0.05;
      }

      this.laneChangeSpeed = Math.min(
        this.laneChangeSpeed + this.course.laneChangeAccelerationPerFrame,
        targetSpeed,
      );

      const actualSpeed = Math.min(
        this.laneChangeSpeed +
          this.activeLaneMovementSkills.reduce((sum, skill) => sum + skill.modifier, 0),
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

  // Slightly scuffed way of ensuring all umas use the same pacemaker
  // in compare.ts, call .getPacer() on any uma (doesn't matter which)
  // and then call .updatePacer(result) on all umas to update pacer reference
  updatePacer(pacemaker: RaceSolver) {
    this.pacer = pacemaker;
  }

  getPacer(): RaceSolver | null {
    // Select furthest-forward front runner
    for (const strategy of [Strategy.Runaway, Strategy.FrontRunner]) {
      const umas = this.umas.filter((uma) => uma.posKeepStrategy === strategy);

      if (umas.length > 0) {
        const uma = umas.reduce((max, uma) => {
          return uma.pos > max.pos ? uma : max;
        }, umas[0]);

        return uma;
      }
    }

    // Get pacerOverride uma
    const pacerOverrideUma = this.umas.find((uma) => uma.pacerOverride);

    if (pacerOverrideUma) {
      return pacerOverrideUma;
    }

    // Otherwise, lucky pace (set pacerOverride)
    for (const strategy of [Strategy.PaceChaser, Strategy.LateSurger, Strategy.EndCloser]) {
      const umas = this.umas.filter((uma) =>
        StrategyHelpers.strategyMatches(uma.posKeepStrategy, strategy),
      );

      if (umas.length > 0) {
        const uma = umas.reduce((max, uma) => {
          return uma.pos > max.pos ? uma : max;
        }, umas[0]);

        uma.pacerOverride = true;
        uma.posKeepStrategy = Strategy.FrontRunner;

        return uma;
      }
    }

    // Otherwise, get virtual pacemaker
    // (this should never happen though)
    const pacer = this.umas.find((uma) => uma.isPacer);

    if (pacer) {
      pacer.posKeepStrategy = Strategy.FrontRunner;
      return pacer;
    }

    return null;
  }

  getUmaByDistanceDescending(): Array<RaceSolver> {
    return this.umas.toSorted((a, b) => b.pos - a.pos);
  }

  isOnlyFrontRunner(): boolean {
    const frontRunners = this.umas.filter((uma) =>
      StrategyHelpers.strategyMatches(uma.posKeepStrategy, Strategy.FrontRunner),
    );
    return frontRunners.length === 1 && frontRunners[0] === this;
  }

  // In Virtual Pacemaker mode, we care about the effects of position keep and the way
  // umas react during poskeep based on their wit
  //
  // In Approximate mode, we don't really care about poskeep - it's just a way to give out
  // PDM/PUM early-race to mimic what actually happens in game so we limit poskeep to 5 sections
  // and use synced rng to make skill comparison possible.
  speedUpOvertakeWitCheck(): boolean {
    return this.posKeepRng.random() < 0.2 * Math.log10(0.1 * this.horse.wisdom);
  }

  paceUpWitCheck(): boolean {
    return this.posKeepRng.random() < 0.15 * Math.log10(0.1 * this.horse.wisdom);
  }

  applyPositionKeepStates() {
    if (this.pos >= this.posKeepEnd || this.posKeepMode === PosKeepMode.None) {
      // State change triggered by poskeep end
      if (
        this.positionKeepState !== PositionKeepState.None &&
        this.positionKeepActivations.length > 0
      ) {
        this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
      }

      this.positionKeepState = PositionKeepState.None;
      return;
    }

    if (!this.pacer) {
      return;
    }

    const pacer = this.pacer;
    const behind = pacer.pos - this.pos;
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
            const distanceAhead = pacer.pos - secondPlaceUma.pos;
            const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

            if (this.posKeepNextTimer.t < 0) {
              return;
            }

            if (distanceAhead < threshold && this.speedUpOvertakeWitCheck()) {
              this.positionKeepActivations.push([this.pos, 0, PositionKeepState.SpeedUp]);
              this.positionKeepState = PositionKeepState.SpeedUp;
              this.posKeepExitPosition = this.pos + Math.floor(this.sectionLength);
            }
          }
          // Overtake
          else if (this.speedUpOvertakeWitCheck()) {
            this.positionKeepState = PositionKeepState.Overtake;
            this.positionKeepActivations.push([this.pos, 0, PositionKeepState.Overtake]);
          }
        } else {
          // Pace Up
          if (behind > this.posKeepMaxThreshold) {
            if (this.paceUpWitCheck()) {
              this.positionKeepState = PositionKeepState.PaceUp;
              this.positionKeepActivations.push([this.pos, 0, PositionKeepState.PaceUp]);
              this.posKeepExitDistance =
                this.syncRng.random() * (this.posKeepMaxThreshold - this.posKeepMinThreshold) +
                this.posKeepMinThreshold;
            }
          }
          // Pace Down
          else if (behind < this.posKeepMinThreshold) {
            if (
              this.activeTargetSpeedSkills.length == 0 &&
              this.activeCurrentSpeedSkills.length == 0
            ) {
              this.positionKeepState = PositionKeepState.PaceDown;
              this.positionKeepActivations.push([this.pos, 0, PositionKeepState.PaceDown]);
              this.posKeepExitDistance =
                this.syncRng.random() * (this.posKeepMaxThreshold - this.posKeepMinThreshold) +
                this.posKeepMinThreshold;
            }
          }
        }

        if (this.positionKeepState == PositionKeepState.None) {
          // console.log(this.pos, "Position keep state is None");
          this.posKeepNextTimer.t = -2;
        } else {
          // console.log(this.pos, "Position keep state is", getPositionKeepStateName(this.positionKeepState));
          this.posKeepExitPosition = this.pos + Math.floor(this.sectionLength);
        }

        break;
      case PositionKeepState.SpeedUp:
        if (this.pos >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
          this.posKeepNextTimer.t = -3;
        } else if (pacer == this) {
          const umas = this.getUmaByDistanceDescending();
          const secondPlaceUma = umas[1];
          const distanceAhead = pacer.pos - secondPlaceUma.pos;
          const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

          if (distanceAhead >= threshold) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.Overtake:
        if (this.pos >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
          this.posKeepNextTimer.t = -3;
        } else if (pacer == this) {
          const umas = this.getUmaByDistanceDescending();
          const secondPlaceUma = umas[1];
          const distanceAhead = this.pos - secondPlaceUma.pos;
          const threshold = myStrategy === Strategy.Runaway ? 27.5 : 10;

          if (distanceAhead >= threshold) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.PaceUp:
        if (this.pos >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
          this.posKeepNextTimer.t = -3;
        } else {
          if (behind < this.posKeepExitDistance) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      case PositionKeepState.PaceDown:
        if (this.pos >= this.posKeepExitPosition) {
          this.positionKeepState = PositionKeepState.None;
          this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
          this.posKeepNextTimer.t = -3;
        } else {
          if (
            behind > this.posKeepExitDistance ||
            this.activeTargetSpeedSkills.length > 0 ||
            this.activeCurrentSpeedSkills.length > 0
          ) {
            this.positionKeepState = PositionKeepState.None;
            this.positionKeepActivations[this.positionKeepActivations.length - 1][1] = this.pos;
            this.posKeepNextTimer.t = -3;
          }
        }

        break;
      default:
        break;
    }
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

  isOnFinalStraight() {
    const lastStraight = this.course.straights[this.course.straights.length - 1];
    return this.pos >= lastStraight.start && this.pos <= lastStraight.end;
  }

  isAfterFinalCorner() {
    const finalCornerStart =
      this.course.corners.length > 0
        ? this.course.corners[this.course.corners.length - 1].start
        : Infinity;
    return this.pos >= finalCornerStart;
  }

  isAfterFinalCornerOrInFinalStraight() {
    return this.isAfterFinalCorner() || this.isOnFinalStraight();
  }

  updateCompeteFight() {
    // Exit conditions: HP below 5% ends competition
    if (this.competeFight && this.hp.hpRatioRemaining() <= 0.05) {
      this.competeFight = false;
      this.competeFightEnd = this.pos;
      this.competeFightTargets.clear();
      return;
    }

    // Only on final straight
    if (!this.isOnFinalStraight()) {
      this.competeFightTimer.t = 0;
      this.competeFightTargets.clear();
      return;
    }

    // Cannot trigger below 15% HP
    if (this.hp.hpRatioRemaining() < 0.15) {
      return;
    }

    // Find competition targets per spec:
    // abs(DistanceGap) < 3.0m, abs(LaneGap) < 0.25 CourseWidth
    const newTargets = new Set<RaceSolver>();
    for (const other of this.umas) {
      if (other === this) continue;
      const distanceGap = Math.abs(other.pos - this.pos);
      const laneGap = Math.abs(other.currentLane - this.currentLane);
      if (distanceGap < 3.0 && laneGap < 0.25) {
        newTargets.add(other);
      }
    }

    // Reset timer if no targets
    if (newTargets.size === 0) {
      this.competeFightTimer.t = 0;
      this.competeFightTargets.clear();
      return;
    }

    this.competeFightTargets = newTargets;

    // Already in competition - continue
    if (this.competeFight) {
      return;
    }

    // Check trigger conditions:
    // - Target for 2+ seconds
    // - Top 50% placement
    // - Speed gap < 0.6 m/s with at least one target
    if (this.competeFightTimer.t >= 2) {
      const placement = this.umas.filter((u) => u.pos > this.pos).length + 1;
      const isTop50 = placement <= Math.ceil(this.umas.length / 2);

      const hasSpeedMatch = [...this.competeFightTargets].some(
        (target) => Math.abs(target.currentSpeed - this.currentSpeed) < 0.6,
      );

      if (isTop50 && hasSpeedMatch) {
        this.competeFight = true;
        this.competeFightStart = this.pos;
      }
    }
  }

  updateLeadCompetition() {
    if (this.leadCompetition && this.leadCompetitionEnd) {
      const leadCompeteDuration = Math.pow(700 * this.horse.guts, 0.5) * 0.012;

      if (
        this.leadCompetitionTimer.t >= leadCompeteDuration ||
        this.pos >= this.leadCompetitionEnd
      ) {
        this.leadCompetition = false;
        this.leadCompetitionEnd = this.pos;
      }
    }

    if (this.leadCompetitionStart !== null) {
      return;
    }

    if (
      this.pos >= 150 &&
      this.pos <= Math.floor(this.sectionLength * 5) &&
      StrategyHelpers.strategyMatches(this.posKeepStrategy, Strategy.FrontRunner)
    ) {
      const otherUmas = this.umas.filter((u) => u.posKeepStrategy === this.posKeepStrategy);
      const distanceGap = this.posKeepStrategy === Strategy.FrontRunner ? 3.75 : 5;
      // Lane gap per spec: Front Runner 0.165, Oonige 0.416 (in course width units)
      const laneGap = this.posKeepStrategy === Strategy.FrontRunner ? 0.165 : 0.416;

      const umasWithinGap = otherUmas.filter(
        (u) =>
          Math.abs(u.pos - this.pos) <= distanceGap &&
          Math.abs(u.currentLane - this.currentLane) < laneGap,
      );

      if (umasWithinGap.length >= 2) {
        for (const uma of umasWithinGap) {
          uma.leadCompetitionTimer.t = 0;
          uma.leadCompetition = true;
          uma.leadCompetitionStart = uma.pos;
          uma.leadCompetitionEnd = uma.pos + Math.floor(this.sectionLength * 8);
        }
      }
    }
  }

  updatefirstUmaInLateRace() {
    const existingFirstPlaceUma = this.umas.find((u) => u.firstUmaInLateRace);

    if (existingFirstPlaceUma) {
      return;
    }

    const firstPlaceUma = this.getUmaByDistanceDescending()[0];

    if (firstPlaceUma.pos < (this.course.distance * 2) / 3) {
      return;
    }

    firstPlaceUma.firstUmaInLateRace = true;
  }

  updateLastSpurtState() {
    if (this.isLastSpurt || this.phase < 2) return;
    if (this.lastSpurtTransition == -1) {
      const v = this.hp.getLastSpurtPair(this, this.lastSpurtSpeed, this.baseTargetSpeed[2]);

      this.lastSpurtTransition = v[0];
      this.lastSpurtSpeed = v[1];

      if (this.hp.isMaxSpurt()) {
        this.fullSpurt = true;
      }
    }
    if (this.pos >= this.lastSpurtTransition) {
      this.isLastSpurt = true;
    }
  }

  updateDownhillMode() {
    // Check if we should update downhill mode (once per second, at 15 FPS)
    const currentFrame = Math.floor(this.accumulatetime.t * 15);
    const changeSecond = currentFrame % 15 === 14; // Check on the last frame of each second

    if (!changeSecond || currentFrame === this.lastDownhillCheckFrame) {
      return; // Not time to check yet, or already checked this second
    }

    this.lastDownhillCheckFrame = currentFrame;

    // Check if we're on a downhill slope
    const currentSlope = this.course.slopes.find(
      (s) => this.pos >= s.start && this.pos <= s.start + s.length,
    );
    const isOnDownhill = currentSlope && currentSlope.slope < -1; // Only on downhills with >1.0% grade

    if (!this.disableDownhill && isOnDownhill) {
      // Keep rng synced for the virtual pacemaker so that it's the same pacer for both umas
      const rng =
        this.posKeepMode === PosKeepMode.Virtual && !this.pacer
          ? this.syncRng.random()
          : this.downhillRng.random();

      if (this.downhillModeStart === null) {
        // Check for entry: Wisdom * 0.0004 chance each second (matching Kotlin implementation)
        if (rng < this.horse.wisdom * 0.0004) {
          this.downhillModeStart = currentFrame;
          this.isDownhillMode = true;
        }
      } else {
        // Check for exit: 20% chance each second to exit downhill mode
        if (rng < 0.2) {
          this.downhillModeStart = null;
          this.isDownhillMode = false;
        }
      }
    } else {
      // Not on a downhill slope, exit downhill mode immediately
      if (this.isDownhillMode) {
        this.downhillModeStart = null;
        this.isDownhillMode = false;
      }
    }
  }

  updateTargetSpeed() {
    if (!this.hp.hasRemainingHp()) {
      this.targetSpeed = this.minSpeed;
    } else if (this.isLastSpurt) {
      this.targetSpeed = this.lastSpurtSpeed;
    } else {
      this.targetSpeed = this.baseTargetSpeed[this.phase] * this.posKeepSpeedCoef;
      this.targetSpeed += this.sectionModifier[Math.floor(this.pos / this.sectionLength)];
    }

    this.targetSpeed += this.modifiers.targetSpeed.acc + this.modifiers.targetSpeed.err;

    if (this.hillIdx != -1) {
      // Use pre-calculated slope penalty for performance
      this.targetSpeed -= this.cachedSlopePenalties[this.hillIdx];
      this.targetSpeed = Math.max(this.targetSpeed, this.minSpeed);
    }

    if (this.competeFight) {
      this.targetSpeed += Math.pow(200 * this.horse.guts, 0.708) * 0.0001;
    }

    if (this.leadCompetition) {
      this.targetSpeed += Math.pow(500 * this.horse.guts, 0.6) * 0.0001;
    }

    // moved logic on every step
    // We need to check the isDownhill every frame so we actually get the speed boost
    if (this.isDownhillMode) {
      const currentSlope = this.course.slopes.find(
        (s) => this.pos >= s.start && this.pos <= s.start + s.length,
      );
      if (currentSlope) {
        const downhillBonus = 0.3 + Math.abs(currentSlope.slope / 10000) / 10.0;
        this.targetSpeed += downhillBonus;
      }
    }

    if (this.laneChangeSpeed > 0.0 && this.activeLaneMovementSkills.length > 0) {
      const moveLaneModifier = Math.sqrt(0.0002 * this.horse.power);
      this.targetSpeed += moveLaneModifier;
    }
  }

  applyForces() {
    if (!this.hp.hasRemainingHp()) {
      this.accel = -1.2;
      return;
    }

    if (this.currentSpeed > this.targetSpeed) {
      this.accel =
        this.positionKeepState === PositionKeepState.PaceDown
          ? -0.5
          : PhaseDeceleration[this.phase];
      return;
    }

    this.accel = this.baseAccel[+(this.hillIdx != -1) * 3 + this.phase];
    this.accel += this.modifiers.accel.acc + this.modifiers.accel.err;

    if (this.competeFight) {
      this.accel += Math.pow(160 * this.horse.guts, 0.59) * 0.0001;
    }
  }

  updateHills() {
    if (
      this.hillIdx == -1 &&
      this.hillStart.length > 0 &&
      this.pos >= this.hillStart[this.hillStart.length - 1]
    ) {
      // Only set hillIdx for uphills with >1.0% grade (slope > 100, where SlopePer = slope/100)
      if (this.course.slopes[this.nHills - this.hillStart.length].slope > 100) {
        this.hillIdx = this.nHills - this.hillStart.length;
        return;
      }

      this.hillEnd.pop();
      this.hillStart.pop();
      return;
    }

    if (
      this.hillIdx != -1 &&
      this.hillEnd.length > 0 &&
      this.pos > this.hillEnd[this.hillEnd.length - 1]
    ) {
      this.hillIdx = -1;
      this.hillEnd.pop();
    }
  }

  updatePhase() {
    // NB. there is actually a phase 3 which starts at 5/6 distance, but for purposes of
    // strategy phase modifiers, activate_count_end_after, etc it is the same as phase 2
    // and it's easier to treat them together, so cap phase at 2.
    if (this.pos >= this.nextPhaseTransition && this.phase < 2) {
      ++this.phase;

      this.nextPhaseTransition = CourseHelpers.phaseStart(
        this.course.distance,
        (this.phase + 1) as IPhase,
      );
    }
  }

  processSkillActivations() {
    const currentPosition = this.pos;

    // Process Speed Up Skills - optimized with swap-and-pop pattern
    let writeIdx = 0;
    for (let i = 0; i < this.activeTargetSpeedSkills.length; i++) {
      const skill = this.activeTargetSpeedSkills[i];

      if (skill.durationTimer.t < 0) {
        this.activeTargetSpeedSkills[writeIdx++] = skill;
        continue;
      }

      this.modifiers.targetSpeed.add(-skill.modifier);

      this.onEffectExpired(
        this,
        currentPosition,
        skill.executionId,
        skill.skillId,
        skill.perspective,
        skill.effectType,
        skill.effectTarget,
      );
    }
    this.activeTargetSpeedSkills.length = writeIdx;

    // Process Current Speed Skills - optimized with swap-and-pop pattern
    writeIdx = 0;
    for (let i = 0; i < this.activeCurrentSpeedSkills.length; i++) {
      const skill = this.activeCurrentSpeedSkills[i];
      if (skill.durationTimer.t < 0) {
        this.activeCurrentSpeedSkills[writeIdx++] = skill;
        continue;
      }

      this.modifiers.currentSpeed.add(-skill.modifier);

      if (skill.naturalDeceleration) {
        this.modifiers.oneFrameAccel += skill.modifier;
      }

      this.onEffectExpired(
        this,
        currentPosition,
        skill.executionId,
        skill.skillId,
        skill.perspective,
        skill.effectType,
        skill.effectTarget,
      );
    }
    this.activeCurrentSpeedSkills.length = writeIdx;

    // Process Accel Skills - optimized with swap-and-pop pattern
    writeIdx = 0;
    for (let i = 0; i < this.activeAccelSkills.length; i++) {
      const skill = this.activeAccelSkills[i];
      if (skill.durationTimer.t < 0) {
        this.activeAccelSkills[writeIdx++] = skill;
        continue;
      }

      this.modifiers.accel.add(-skill.modifier);
      this.onEffectExpired(
        this,
        currentPosition,
        skill.executionId,
        skill.skillId,
        skill.perspective,
        skill.effectType,
        skill.effectTarget,
      );
    }
    this.activeAccelSkills.length = writeIdx;

    // Process Lane Movement Skills - optimized with swap-and-pop pattern
    writeIdx = 0;
    for (let i = 0; i < this.activeLaneMovementSkills.length; i++) {
      const skill = this.activeLaneMovementSkills[i];
      if (skill.durationTimer.t < 0) {
        this.activeLaneMovementSkills[writeIdx++] = skill;
        continue;
      }

      this.onEffectExpired(
        this,
        currentPosition,
        skill.executionId,
        skill.skillId,
        skill.perspective,
        skill.effectType,
        skill.effectTarget,
      );
    }
    this.activeLaneMovementSkills.length = writeIdx;

    // Process Change Lane Skills - optimized with swap-and-pop pattern
    writeIdx = 0;
    for (let i = 0; i < this.activeChangeLaneSkills.length; i++) {
      const skill = this.activeChangeLaneSkills[i];
      if (skill.durationTimer.t < 0) {
        this.activeChangeLaneSkills[writeIdx++] = skill;
        continue;
      }

      this.onEffectExpired(
        this,
        currentPosition,
        skill.executionId,
        skill.skillId,
        skill.perspective,
        skill.effectType,
        skill.effectTarget,
      );
    }
    this.activeChangeLaneSkills.length = writeIdx;

    // Process Pending Skills - optimized with swap-and-pop pattern
    writeIdx = 0;
    for (let i = 0; i < this.pendingSkills.length; i++) {
      const skill = this.pendingSkills[i];

      if (this.pos >= skill.trigger.end || this.pendingRemoval.has(skill.skillId)) {
        // NB. `Region`s are half-open [start,end) intervals. If pos == end we are out of the trigger.
        // skill failed to activate
        this.pendingRemoval.delete(skill.skillId);
        continue;
      }

      if (this.pos >= skill.trigger.start && skill.extraCondition(this)) {
        // Wit Check for skill activation if enabled
        if (
          this.skillCheckChance &&
          !this.shouldSkipWisdomCheck(skill) &&
          !this.doWitCheck(skill)
        ) {
          // Wisdom check failed - don't keep
          continue;
        }

        // Wisdom check passed - activate skill
        this.activateSkill(skill);
        continue;
      }

      // Skill still pending - keep it
      this.pendingSkills[writeIdx++] = skill;
    }

    this.pendingSkills.length = writeIdx;
  }

  /**
   * Does a Wit Check for a skill a Runner is trying to activate.
   *
   * NOTE: This method right now for some cases is trying to check the Wit stat for another runner, as in check when another runner has hit them with a debuff or buff.
   *       but if think that each runner should only check their own Wit.
   */
  doWitCheck(skill: PendingSkill): boolean {
    if (skill.perspective !== SkillPerspective.Self) {
      throw new Error('Wit check can only be done for self perspective skills');
    }

    const rngRoll = this.wisdomRollRng.random();

    const witStat = this.horse.wisdom;
    const witCheckThreshold = Math.max(100 - 9000 / witStat, 20) * 0.01;

    return rngRoll <= witCheckThreshold;
  }

  shouldSkipWisdomCheck(skill: PendingSkill): boolean {
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

  activateSkill(skill: PendingSkill) {
    // sort so that the ExtendEvolvedDuration effect always activates after other effects, since it shouldn't extend the duration of other
    // effects on the same skill

    const sortedEffects = skill.effects.toSorted((a, b) => +(a.type == 42) - +(b.type == 42));

    const executionId = `${skill.skillId}-${crypto.randomUUID()}`;
    const currentPosition = this.pos;

    this.onSkillActivated({
      raceSolver: this,
      currentPosition,
      skillId: skill.skillId,
    });

    for (const skillEffect of sortedEffects) {
      const skillDurationScaling =
        skill.rarity == SkillRarity.Evolution ? this.modifiers.specialSkillDurationScaling : 1; // TODO should probably be awakened skills

      const scaledDuration =
        skillEffect.baseDuration * (this.course.distance / 1000) * skillDurationScaling;

      // Apply First

      this.applyEffect({
        skillEffect,
        executionId,
        skillId: skill.skillId,
        perspective: skill.perspective,
        scaledDuration,
      });

      // Track later

      if (shouldTrackEffect(skillEffect)) {
        this.onEffectActivated(
          this,
          currentPosition,
          executionId,
          skill.skillId,
          skill.perspective,
          skillEffect.type,
          skillEffect.target,
        );
      }
    }

    ++this.activateCount[this.phase];
    this.usedSkills.add(skill.skillId);
  }

  applyEffect(options: {
    skillEffect: SkillEffect;
    executionId: string;
    skillId: string;
    perspective: ISkillPerspective;
    scaledDuration: number;
  }) {
    const { skillEffect, executionId, skillId, perspective, scaledDuration } = options;

    // and not just pinks
    switch (skillEffect.type) {
      // Green skills
      case SkillType.SpeedUp:
        this.horse.speed = Math.max(this.horse.speed + skillEffect.modifier, 1);
        break;
      case SkillType.StaminaUp:
        this.horse.stamina = Math.max(this.horse.stamina + skillEffect.modifier, 1);
        this.horse.rawStamina = Math.max(this.horse.rawStamina + skillEffect.modifier, 1);
        break;
      case SkillType.PowerUp:
        this.horse.power = Math.max(this.horse.power + skillEffect.modifier, 1);
        break;
      case SkillType.GutsUp:
        this.horse.guts = Math.max(this.horse.guts + skillEffect.modifier, 1);
        break;
      case SkillType.WisdomUp:
        this.horse.wisdom = Math.max(this.horse.wisdom + skillEffect.modifier, 1);
        break;

      // Instant/point effects and pre-race modifiers
      case SkillType.MultiplyStartDelay:
        this.startDelay *= skillEffect.modifier;
        break;
      case SkillType.SetStartDelay:
        this.startDelay = skillEffect.modifier;
        break;

      // Duration-based effects
      case SkillType.TargetSpeed:
        this.modifiers.targetSpeed.add(skillEffect.modifier);
        this.activeTargetSpeedSkills.push({
          executionId,
          skillId,
          perspective,
          durationTimer: this.getNewTimer(-scaledDuration),
          modifier: skillEffect.modifier,
          effectType: skillEffect.type,
          effectTarget: skillEffect.target,
        });
        break;
      case SkillType.Accel:
        this.modifiers.accel.add(skillEffect.modifier);
        this.activeAccelSkills.push({
          executionId,
          skillId,
          perspective,
          durationTimer: this.getNewTimer(-scaledDuration),
          modifier: skillEffect.modifier,
          effectType: skillEffect.type,
          effectTarget: skillEffect.target,
        });
        break;
      case SkillType.LaneMovementSpeed:
        this.activeLaneMovementSkills.push({
          executionId,
          skillId,
          perspective,
          durationTimer: this.getNewTimer(-scaledDuration),
          modifier: skillEffect.modifier,
          effectType: skillEffect.type,
          effectTarget: skillEffect.target,
        });
        break;
      case SkillType.CurrentSpeed:
      case SkillType.CurrentSpeedWithNaturalDeceleration:
        this.modifiers.currentSpeed.add(skillEffect.modifier);
        this.activeCurrentSpeedSkills.push({
          executionId,
          skillId,
          perspective,
          durationTimer: this.getNewTimer(-scaledDuration),
          modifier: skillEffect.modifier,
          naturalDeceleration: skillEffect.type == SkillType.CurrentSpeedWithNaturalDeceleration,
          effectType: skillEffect.type,
          effectTarget: skillEffect.target,
        });
        break;
      case SkillType.Recovery:
        ++this.activateCountHeal;
        // Pass state to recover for dynamic spurt recalculation in accuracy mode

        this.hp.recover(skillEffect.modifier, this);

        if (this.phase >= 2 && !this.isLastSpurt) {
          this.updateLastSpurtState();
        }
        break;
      case SkillType.ActivateRandomGold:
        this.doActivateRandomGold(skillEffect.modifier);
        break;
      case SkillType.ExtendEvolvedDuration:
        this.modifiers.specialSkillDurationScaling = skillEffect.modifier;
        break;
      case SkillType.ChangeLane:
        this.activeChangeLaneSkills.push({
          executionId,
          skillId,
          perspective,
          durationTimer: this.getNewTimer(-scaledDuration),
          modifier: skillEffect.modifier,
          effectType: skillEffect.type,
          effectTarget: skillEffect.target,
        });
        break;
    }
  }

  doActivateRandomGold(ngolds: number) {
    const goldIndices = this.pendingSkills.reduce((acc, skill, i) => {
      if (
        (skill.rarity == SkillRarity.Gold || skill.rarity == SkillRarity.Evolution) &&
        skill.effects.every((ef) => ef.type > SkillType.WisdomUp)
      )
        acc.push(i);
      return acc;
    }, [] as Array<number>);

    for (let i = goldIndices.length; --i >= 0; ) {
      const j = this.gorosiRng.uniform(i + 1);
      [goldIndices[i], goldIndices[j]] = [goldIndices[j], goldIndices[i]];
    }

    for (let i = 0; i < Math.min(ngolds, goldIndices.length); ++i) {
      const pendingSkill = this.pendingSkills[goldIndices[i]];

      this.activateSkill(pendingSkill);

      // important: we can't actually remove this from pendingSkills directly, since this function runs inside the loop in
      // processSkillActivations. modifying the pendingSkills array here would mess up that loop. this function used to modify
      // the trigger on the skill itself to ensure it was before this.pos and force it to be cleaned up, but mutating the skill
      // is error-prone and undesirable since it means the same PendingSkill instance can't be used with multiple RaceSolvers.
      // instead, flag the skill later to be removed in processSkillActivations (either later in the loop that called us, or
      // the next time processSkillActivations is called).
      this.pendingRemoval.add(pendingSkill.skillId);
    }
  }

  // deactivate any skills that haven't finished their durations yet (intended to be called at the end of a simulation, when a skill
  // might have activated towards the end of the race and the race finished before the skill's duration)
  cleanup() {
    const callDeactivateHook = (activeSkill: ActiveSkill) => {
      const currentPosition = this.pos;

      this.onEffectExpired(
        this,
        currentPosition,
        activeSkill.executionId,
        activeSkill.skillId,
        activeSkill.perspective,
        activeSkill.effectType,
        activeSkill.effectTarget,
      );
    };

    this.activeTargetSpeedSkills.forEach(callDeactivateHook);
    this.activeCurrentSpeedSkills.forEach(callDeactivateHook);
    this.activeAccelSkills.forEach(callDeactivateHook);
    this.activeLaneMovementSkills.forEach(callDeactivateHook);
    this.activeChangeLaneSkills.forEach(callDeactivateHook);
  }

  registerCondition(name: string, condition: ApproximateCondition): void {
    this.conditions.set(name, condition);

    if (!this.conditionValues.has(name)) {
      this.conditionValues.set(name, condition.valueOnStart);
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

  tickConditions(): void {
    const state = {
      simulation: this,
    };

    for (const [name, condition] of this.conditions.entries()) {
      const currentValue = this.conditionValues.get(name) ?? condition.valueOnStart;
      const newValue = condition.update(state, currentValue);
      this.conditionValues.set(name, newValue);
    }
  }
}

const durationBasedEffects = [
  SkillType.TargetSpeed, // 27
  SkillType.CurrentSpeed, // 21
  SkillType.CurrentSpeedWithNaturalDeceleration, // 22
  SkillType.Accel, // 31
  SkillType.LaneMovementSpeed, // 28
  SkillType.ChangeLane, // 35
] as Array<number>;

const instantEffects = [
  SkillType.Recovery, // 9 - HP recovery/drain
  SkillType.SpeedUp, // 1 - Green skills (gate activation)
  SkillType.StaminaUp, // 2
  SkillType.PowerUp, // 3
  SkillType.GutsUp, // 4
  SkillType.WisdomUp, // 5
  SkillType.MultiplyStartDelay, // 10 - Start modifiers
  SkillType.SetStartDelay, // 14

  // For future use
  SkillType.ActivateRandomGold, // 37
  SkillType.ExtendEvolvedDuration, // 42
] as Array<number>;

const shouldTrackEffect = (effect: SkillEffect) => {
  const type = effect.type;

  // Duration-based effects (track start/end)
  if (effect.baseDuration > 0) {
    return durationBasedEffects.includes(type);
  }

  // Instant/point effects and pre-race modifiers
  return instantEffects.includes(type);
};
