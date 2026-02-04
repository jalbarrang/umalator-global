import { cloneDeep } from 'es-toolkit';

import { immediate, noopRandom, random } from '../skills/parser/conditions/utils';
import { defaultConditions } from '../skills/parser/conditions/conditions';
import { createParser } from '../skills/parser/ConditionParser';
import { GameHpPolicy } from '../runner/health/game.policy';
import { RaceSolver } from './RaceSolver';
import type { DefaultParser } from '../skills/parser/definitions';
import type { SeededRng } from '@/modules/simulation/lib/utils/Random';
import type { ActivationSamplePolicy } from '@/modules/simulation/lib/skills/policies/ActivationSamplePolicy';
import type {
  DynamicCondition,
  IRaceState,
  OnSkillCallback,
  OnSkillEffectCallback,
  PendingSkill,
  RaceSolverMode,
  SkillEffect,
} from './RaceSolver';
import type {
  CourseData,
  IDistanceType,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '@/modules/simulation/lib/course/definitions';
import type { IAptitude, IMood, IPosKeepMode, IStrategy } from '../runner/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type {
  ISkillPerspective,
  ISkillRarity,
  ISkillTarget,
  ISkillType,
} from '@/modules/simulation/lib/skills/definitions';

import type { Skill } from '@/modules/skills/utils';
import type { HorseParameters } from '@/modules/simulation/lib/runner/HorseTypes';
import type { HpPolicy } from '@/modules/simulation/lib/runner/health/health-policy';
import {
  ImmediatePolicy,
  createFixedPositionPolicy,
} from '@/modules/simulation/lib/skills/policies/ActivationSamplePolicy';
import { Region, RegionList } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import {
  SkillPerspective,
  SkillRarity,
  SkillTarget,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';
import {
  Grade,
  GroundCondition,
  Season,
  TimeOfDay,
  Weather,
} from '@/modules/simulation/lib/course/definitions';
import { Aptitude, Mood, PosKeepMode, Strategy } from '@/modules/simulation/lib/runner/definitions';
import { EnhancedHpPolicy } from '@/modules/simulation/lib/runner/health/enhanced.policy';
import { NoopHpPolicy } from '@/modules/simulation/lib/runner/health/health-policy';
import { Rule30CARng } from '@/modules/simulation/lib/utils/Random';
import { skillsById } from '@/modules/skills/utils';

export type RawSkillEffect = {
  modifier: number;
  target: ISkillTarget;
  type: number;
};

export type SkillAlternative = {
  baseDuration: number;
  condition: string;
  precondition?: string;
  effects: Array<RawSkillEffect>;
};

type PartialRaceParameters = Omit<
  { -readonly [K in keyof RaceParameters]: RaceParameters[K] },
  'skillId'
>;

export type HorseDesc = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: string | IStrategy;
  distanceAptitude: string | IAptitude;
  surfaceAptitude: string | IAptitude;
  strategyAptitude: string | IAptitude;
  mood: IMood;
};

export const GroundSpeedModifier = [
  null, // ground types started at 1
  [0, 0, 0, 0, -50],
  [0, 0, 0, 0, -50],
] as const;

export const GroundPowerModifier = [
  null,
  [0, 0, -50, -50, -50],
  [0, -100, -50, -100, -100],
] as const;

export const StrategyProficiencyModifier = [1.1, 1.0, 0.85, 0.75, 0.6, 0.4, 0.2, 0.1] as const;

// ? Whats Asitame?
// Re: Its a skill that increases the speed of the uma when the power is high enough.
const Asitame = {
  StrategyDistanceCoefficient: [
    // [Front Runner, Pace Chaser, Late Surger, End Closer, Runaway]
    [], // distances are 1-indexed (as are strategies, hence the 0 in the first column for every row)
    [0, 1.0, 0.7, 0.75, 0.7, 1.0], // short
    [0, 1.0, 0.8, 0.7, 0.75, 1.0], // mile
    [0, 1.0, 0.9, 0.875, 0.86, 1.0], // medium
    [0, 1.0, 0.9, 1.0, 0.9, 1.0], // long
  ] as const,

  BaseModifier: 0.00875 as const,

  calcApproximateModifier(power: number, strategy: IStrategy, distance: IDistanceType) {
    return (
      this.BaseModifier *
      Math.sqrt(power - 1200) *
      this.StrategyDistanceCoefficient[distance][strategy]
    );
  },
};

// ? Whats Syoubu?:
// Re: Its a skill that increases the speed of the uma when the stamina is high enough.
const StaminaSyoubu = {
  distanceFactor(distance: number) {
    if (distance < 2101) return 0.0;
    else if (distance < 2201) return 0.5;
    else if (distance < 2401) return 1.0;
    else if (distance < 2601) return 1.2;
    else return 1.5;
  },

  calcApproximateModifier(stamina: number, distance: number) {
    const randomFactor = 1.0; // TODO implement random factor scaling based on power (unclear how this works currently)

    return Math.sqrt(stamina - 1200) * 0.0085 * this.distanceFactor(distance) * randomFactor;
  },
};

export function parseStrategy(s: string | IStrategy) {
  if (typeof s != 'string') {
    return s;
  }
  switch (s.toUpperCase()) {
    case 'FRONT RUNNER':
      return Strategy.FrontRunner;
    case 'PACE CHASER':
      return Strategy.PaceChaser;
    case 'LATE SURGER':
      return Strategy.LateSurger;
    case 'END CLOSER':
      return Strategy.EndCloser;
    case 'RUNAWAY':
      return Strategy.Runaway;
    default:
      throw new Error('Invalid running strategy.');
  }
}

export function parseAptitude(a: string | IAptitude, type: string) {
  if (typeof a != 'string') {
    return a;
  }
  switch (a.toUpperCase()) {
    case 'S':
      return Aptitude.S;
    case 'A':
      return Aptitude.A;
    case 'B':
      return Aptitude.B;
    case 'C':
      return Aptitude.C;
    case 'D':
      return Aptitude.D;
    case 'E':
      return Aptitude.E;
    case 'F':
      return Aptitude.F;
    case 'G':
      return Aptitude.G;
    default:
      throw new Error('Invalid ' + type + ' aptitude.');
  }
}

export function parseGroundCondition(g: string | IGroundCondition) {
  if (typeof g != 'string') {
    return g;
  }
  switch (g.toUpperCase()) {
    case 'GOOD':
      return GroundCondition.Firm;
    case 'YIELDING':
      return GroundCondition.Good;
    case 'SOFT':
      return GroundCondition.Soft;
    case 'HEAVY':
      return GroundCondition.Heavy;
    default:
      throw new Error('Invalid ground condition.');
  }
}

export function parseWeather(w: string | IWeather) {
  if (typeof w != 'string') {
    return w;
  }
  switch (w.toUpperCase()) {
    case 'SUNNY':
      return Weather.Sunny;
    case 'CLOUDY':
      return Weather.Cloudy;
    case 'RAINY':
      return Weather.Rainy;
    case 'SNOWY':
      return Weather.Snowy;
    default:
      throw new Error('Invalid weather.');
  }
}

export function parseSeason(s: string | ISeason) {
  if (typeof s != 'string') {
    return s;
  }
  switch (s.toUpperCase()) {
    case 'SPRING':
      return Season.Spring;
    case 'SUMMER':
      return Season.Summer;
    case 'AUTUMN':
      return Season.Autumn;
    case 'WINTER':
      return Season.Winter;
    case 'SAKURA':
      return Season.Sakura;
    default:
      throw new Error('Invalid season.');
  }
}

export function parseTime(t: string | ITimeOfDay) {
  if (typeof t != 'string') {
    return t;
  }

  switch (t.toUpperCase()) {
    case 'NONE':
    case 'NOTIME':
      return TimeOfDay.NoTime;
    case 'MORNING':
      return TimeOfDay.Morning;
    case 'MIDDAY':
      return TimeOfDay.Midday;
    case 'EVENING':
      return TimeOfDay.Evening;
    case 'NIGHT':
      return TimeOfDay.Night;
    default:
      throw new Error('Invalid race time.');
  }
}

export function parseGrade(g: string | IGrade) {
  if (typeof g != 'string') {
    return g;
  }
  switch (g.toUpperCase()) {
    case 'G1':
      return Grade.G1;
    case 'G2':
      return Grade.G2;
    case 'G3':
      return Grade.G3;
    case 'OP':
      return Grade.OP;
    case 'PRE-OP':
    case 'PREOP':
      return Grade.PreOP;
    case 'MAIDEN':
      return Grade.Maiden;
    case 'DEBUT':
      return Grade.Debut;
    case 'DAILY':
      return Grade.Daily;
    default:
      throw new Error('Invalid race grade.');
  }
}

export const adjustOvercap = (stat: number) => {
  return stat > 1200 ? 1200 + Math.floor((stat - 1200) / 2) : stat;
};

export const calculateMoodCoefficient = (mood: IMood) => {
  return 1 + 0.02 * mood;
};

export type BaseStats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategy;
  distanceAptitude: IAptitude;
  surfaceAptitude: IAptitude;
  strategyAptitude: IAptitude;
  rawStamina: number;
};

export const buildBaseStats = (horseDesc: HorseDesc): BaseStats => {
  const moodCoefficient = calculateMoodCoefficient(horseDesc.mood);

  return {
    speed: adjustOvercap(horseDesc.speed) * moodCoefficient,
    stamina: adjustOvercap(horseDesc.stamina) * moodCoefficient,
    power: adjustOvercap(horseDesc.power) * moodCoefficient,
    guts: adjustOvercap(horseDesc.guts) * moodCoefficient,
    wisdom: adjustOvercap(horseDesc.wisdom) * moodCoefficient,
    strategy: parseStrategy(horseDesc.strategy),
    distanceAptitude: parseAptitude(horseDesc.distanceAptitude, 'distance'),
    surfaceAptitude: parseAptitude(horseDesc.surfaceAptitude, 'surface'),
    strategyAptitude: parseAptitude(horseDesc.strategyAptitude, 'strategy'),
    rawStamina: horseDesc.stamina * moodCoefficient,
  };
};

type AdjustedStats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategy;
  distanceAptitude: IAptitude;
  surfaceAptitude: IAptitude;
  strategyAptitude: IAptitude;
  rawStamina: number;
};

export const buildAdjustedStats = (
  baseStats: HorseParameters,
  course: CourseData,
  ground: IGroundCondition,
): AdjustedStats => {
  const raceCourseModifier = CourseHelpers.courseSpeedModifier(course, baseStats);

  return {
    speed: Math.max(
      baseStats.speed * raceCourseModifier + GroundSpeedModifier[course.surface][ground],
      1,
    ),
    stamina: baseStats.stamina,
    power: Math.max(baseStats.power + GroundPowerModifier[course.surface][ground], 1),
    guts: baseStats.guts,
    wisdom: baseStats.wisdom * StrategyProficiencyModifier[baseStats.strategyAptitude],
    strategy: baseStats.strategy,
    distanceAptitude: baseStats.distanceAptitude,
    surfaceAptitude: baseStats.surfaceAptitude,
    strategyAptitude: baseStats.strategyAptitude,
    rawStamina: baseStats.rawStamina,
  };
};

export interface SkillData {
  skillId: string;
  perspective: ISkillPerspective;
  rarity: ISkillRarity;
  samplePolicy: ActivationSamplePolicy;
  regions: RegionList;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
}

function isTarget(self: ISkillPerspective, targetType: ISkillTarget) {
  if (targetType == SkillTarget.All) {
    return true;
  }

  if (self == SkillPerspective.Any) {
    return true;
  }

  const isSelfPerspectiveSelf = self == SkillPerspective.Self;
  const isTargetSelf = targetType == SkillPerspective.Self;

  return isSelfPerspectiveSelf == isTargetSelf;
}

function buildSkillEffects(skill: SkillAlternative, perspective: ISkillPerspective) {
  const effects: Array<SkillEffect> = [];

  for (const effect of skill.effects) {
    if (isTarget(perspective, effect.target)) {
      effects.push({
        type: effect.type as ISkillType,
        baseDuration: skill.baseDuration / 10000,
        modifier: effect.modifier / 10000,
        target: effect.target,
      });
    }
  }

  return effects;
}

export type SkillTrigger = {
  skillId: string;
  perspective: ISkillPerspective;
  // for some reason 1*/2* uniques, 1*/2* upgraded to 3*, and naturally 3* uniques all have different rarity (3, 4, 5 respectively)
  rarity: ISkillRarity;
  samplePolicy: ActivationSamplePolicy;
  regions: RegionList;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
};

export function buildSkillData(
  horse: HorseParameters,
  raceParams: PartialRaceParameters,
  course: CourseData,
  wholeCourse: RegionList,
  parser: DefaultParser,
  skillId: string,
  perspective: ISkillPerspective,
  ignoreNullEffects: boolean = false,
): Array<SkillTrigger> {
  const skill: Skill | undefined = skillsById.get(skillId);

  if (!skill) {
    throw new Error('bad skill ID ' + skillId);
  }

  const extra = Object.assign({ skillId }, raceParams);

  const alternatives = skill.data.alternatives;
  const triggers = [];

  for (let i = 0; i < alternatives.length; ++i) {
    const skillAlternative = alternatives[i];

    let full = new RegionList();
    wholeCourse.forEach((r) => full.push(r));

    if (skillAlternative.precondition) {
      const parsedPrecondition = parser.parse(skillAlternative.precondition);

      const preRegions = parsedPrecondition.apply(wholeCourse, course, horse, extra)[0];

      if (preRegions.length == 0) {
        continue;
      }

      const bounds = new Region(preRegions[0].start, wholeCourse[wholeCourse.length - 1].end);

      full = full.rmap((r) => r.intersect(bounds));
    }

    const parsedOperator = parser.parse(skillAlternative.condition);

    const [regions, extraCondition] = parsedOperator.apply(full, course, horse, extra);

    if (regions.length === 0) {
      continue;
    }

    if (
      triggers.length > 0 &&
      !/is_activate_other_skill_detail|is_used_skill_id/.test(skillAlternative.condition)
    ) {
      // i don't like this at all. the problem is some skills with two triggers (for example all the is_activate_other_skill_detail ones)
      // need to place two triggers so the second effect can activate, however, some other skills with two triggers only ever activate one
      // even if they have non-mutually-exclusive conditions (for example Jungle Pocket unique). i am not currently sure what distinguishes
      // them in the game implementation. it's pretty inconsistent about whether double-trigger skills force the conditions to be mutually
      // exclusive or not even if it only wants one of them to activate; for example Daitaku Helios unique ensures the distance conditions
      // are mutually exclusive for both triggers but Jungle Pocket doesn't. for the time being we're only going to place the first trigger
      // unless the second one is explicitly is_activate_other_skill_detail or is_used_skill_id (need this for NY Ace).
      // !!! FIXME this is actually bugged for NY Ace unique since she'll get both effects if she uses oonige.
      continue;
    }

    const effects = buildSkillEffects(skillAlternative, perspective);

    if (effects.length > 0 || ignoreNullEffects) {
      const rarity = skill.data.rarity;

      triggers.push({
        skillId: skillId,
        perspective: perspective,
        // for some reason 1*/2* uniques, 1*/2* upgraded to 3*, and naturally 3* uniques all have different rarity (3, 4, 5 respectively)
        rarity: rarity >= 3 && rarity <= 5 ? 3 : rarity,
        samplePolicy: parsedOperator.samplePolicy,
        regions: regions,
        extraCondition: extraCondition,
        effects: effects,
      });
    }
  }

  if (triggers.length > 0) {
    return triggers;
  }

  // if we get here, it means that no alternatives have their conditions satisfied for this course/horse.
  // however, for purposes of summer goldship unique (Adventure of 564), we still have to add something, since
  // that could still cause them to activate. so just add the first alternative at a location after the course
  // is over with a constantly false dynamic condition so that it never activates normally.
  const effects = buildSkillEffects(alternatives[0], perspective);

  if (effects.length == 0 && !ignoreNullEffects) {
    return [];
  }

  const rarity = skill.data.rarity;
  const afterEnd = new RegionList();
  afterEnd.push(new Region(9999, 9999));

  return [
    {
      skillId: skillId,
      perspective: perspective,
      rarity: rarity >= 3 && rarity <= 5 ? 3 : rarity,
      samplePolicy: ImmediatePolicy,
      regions: afterEnd,
      extraCondition: (_) => false,
      effects: effects,
    },
  ];
}

export const conditionsWithActivateCountsAsRandom = Object.assign({}, defaultConditions, {
  activate_count_all: random({
    filterGte(
      regions: RegionList,
      n: number,
      course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      // hard-code TM Opera O (NY) unique and Neo Universe unique to pretend they're immediate while allowing randomness for other skills
      // (conveniently the only two with n == 7)
      // ideally find a better solution
      if (n == 7) {
        const rl = new RegionList();
        // note that RandomPolicy won't sample within 10m from the end so this has to be +11
        regions.forEach((r) => rl.push(new Region(r.start, r.start + 11)));
        return rl;
      }
      /*if (extra.skillId == '110151' || extra.skillId == '910151') {
      const rl = new RegionList();
      rl.push(new Region(course.distance - 401, course.distance - 399));
      return rl;
    }*/
      // somewhat arbitrarily decide you activate about 23 skills per race and then use a region n / 23 ± 20%
      const bounds = new Region(
        Math.min(n / 23.0 - 0.2, 0.6) * course.distance,
        Math.min(n / 23.0 + 0.2, 1.0) * course.distance,
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte(
      _regions: RegionList,
      _n: number,
      _course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      return new RegionList(); // tentatively, we're not really interested in the <= branch of these conditions
    },
  }),
  activate_count_end_after: random({
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, 2),
        CourseHelpers.phaseEnd(course.distance, 3),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_heal: noopRandom,
  activate_count_later_half: random({
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(course.distance / 2, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_middle: random({
    filterGte(
      regions: RegionList,
      n: number,
      course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      const start = CourseHelpers.phaseStart(course.distance, 1),
        end = CourseHelpers.phaseEnd(course.distance, 1);
      const bounds = new Region(start, start + (n / 10) * (end - start));
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  activate_count_start: immediate({
    // for 地固め - Start of the race
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: HorseParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, 0),
        CourseHelpers.phaseEnd(course.distance, 0),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
});

const defaultParser = createParser();
const acrParser = createParser({
  conditions: conditionsWithActivateCountsAsRandom,
});

export class RaceSolverBuilder {
  _course: CourseData | null;
  _raceParams: PartialRaceParameters;
  _runner: HorseDesc | null;
  _pacerSkills: Array<PendingSkill>;
  _pacerSkillIds: Array<string>;
  _pacerSpeedUpRate: number;
  _pacerSkillData: Array<SkillData>;
  _pacerTriggers: Array<Array<Region>>;
  _rng: SeededRng;
  _seed: number;
  _parser: DefaultParser;
  _skills: Array<{
    skillId: string;
    perspective: ISkillPerspective;
    originWisdom?: number;
  }>;
  _samplePolicyOverride: Map<string, ActivationSamplePolicy>;
  _extraSkillHooks: Array<
    (skilldata: Array<SkillData>, horse: HorseParameters, course: CourseData) => void
  >;
  _onSkillActivated: OnSkillCallback | undefined;
  _onEffectActivated: OnSkillEffectCallback | undefined;
  _onEffectExpired: OnSkillEffectCallback | undefined;
  _disableRushed: boolean;
  _disableDownhill: boolean;
  _disableSectionModifier: boolean;

  /**
   * Marks if the RaceSolver should use an HP Policy for Stamina calculation
   */
  private _useHpPolicy: boolean;
  /**
   * Use EnhancedHpPolicy instead of GameHpPolicy
   * Default false to use GameHpPolicy
   */
  declare private _useEnhancedSpurt: boolean;
  declare private _accuracyMode: boolean;
  /**
   * Declares if the Wit checks for the runner are enabled or disabled
   */
  declare private _skillCheckChance: boolean;
  declare private _posKeepMode: IPosKeepMode;
  /**
   * @see RaceSolver.mode
   */
  declare private _mode: RaceSolverMode;

  constructor(readonly nsamples: number) {
    this._course = null;
    this._raceParams = {
      mood: Mood.Great,
      groundCondition: GroundCondition.Firm,
      weather: Weather.Sunny,
      season: Season.Spring,
      time: TimeOfDay.Midday,
      grade: Grade.G1,
      popularity: 1,
    };
    this._runner = null;
    this._pacerSkillData = [];
    this._pacerTriggers = [];
    this._pacerSkills = [];
    this._pacerSkillIds = [];
    this._pacerSpeedUpRate = 100;
    this._seed = Math.floor(Math.random() * (-1 >>> 0)) >>> 0;
    this._rng = new Rule30CARng(this._seed);
    this._parser = defaultParser;
    this._skills = [];
    this._samplePolicyOverride = new Map();
    this._extraSkillHooks = [];

    this._onSkillActivated = undefined;
    this._onEffectActivated = undefined;
    this._onEffectExpired = undefined;

    this._disableRushed = false;
    this._disableDownhill = false;
    this._disableSectionModifier = false;

    // ===== Stamina
    // Default true to enable using the HP Policy
    this._useHpPolicy = true;
    // Use GamePolicy by default, set to true to use EnhancedHpPolicy
    this._useEnhancedSpurt = false;
    // ===== End: Stamina

    this._accuracyMode = false;
    this._skillCheckChance = true;
    this._posKeepMode = PosKeepMode.None;
  }

  seed(seed: number) {
    this._seed = seed;
    this._rng = new Rule30CARng(seed);
    return this;
  }

  course(course: number | CourseData) {
    if (typeof course == 'number') {
      this._course = CourseHelpers.getCourse(course);
    } else {
      this._course = course;
    }
    return this;
  }

  mood(mood: IMood) {
    this._raceParams.mood = mood;
    return this;
  }

  ground(ground: string | IGroundCondition) {
    this._raceParams.groundCondition = parseGroundCondition(ground);
    return this;
  }

  weather(weather: string | IWeather) {
    this._raceParams.weather = parseWeather(weather);
    return this;
  }

  season(season: string | ISeason) {
    this._raceParams.season = parseSeason(season);
    return this;
  }

  time(time: string | ITimeOfDay) {
    this._raceParams.time = parseTime(time);
    return this;
  }

  grade(grade: string | IGrade) {
    this._raceParams.grade = parseGrade(grade);
    return this;
  }

  popularity(popularity: number) {
    this._raceParams.popularity = popularity;
    return this;
  }

  order(start: number, end: number) {
    this._raceParams.orderRange = [start, end];
    return this;
  }

  numUmas(n: number) {
    this._raceParams.numUmas = n;
    return this;
  }

  horse(horse: HorseDesc) {
    this._runner = horse;
    return this;
  }

  pacerSpeedUpRate(rate: number) {
    this._pacerSpeedUpRate = rate;
    return this;
  }

  /**
   * Add skills to the pacer/virtual pacemaker.
   * Must be called after pacer() or useDefaultPacer().
   * @param skillId The skill ID to add to the pacer
   * @returns this builder for chaining
   */
  addPacerSkill(skillId: string) {
    this._pacerSkillIds.push(skillId);
    return this;
  }

  _isNige() {
    if (!this._runner) {
      throw new Error('Horse not set');
    }

    if (typeof this._runner.strategy == 'string') {
      return (
        this._runner.strategy.toUpperCase() == 'NIGE' ||
        this._runner.strategy.toUpperCase() == 'OONIGE'
      );
    } else {
      return (
        this._runner.strategy == Strategy.FrontRunner || this._runner.strategy == Strategy.Runaway
      );
    }
  }

  setupPacer(horse: HorseDesc) {
    if (!this._course) {
      throw new Error('Course not set');
    }

    const pacer = horse;
    const pacerBaseHorse = pacer ? buildBaseStats(pacer) : null;

    const pacerHorse = pacerBaseHorse
      ? buildAdjustedStats(pacerBaseHorse, this._course, this._raceParams.groundCondition)
      : null;

    const wholeCourse = new RegionList();
    wholeCourse.push(new Region(0, this._course.distance));

    let pacerSkillData: Array<SkillData> = [];

    if (pacerBaseHorse) {
      const makePacerSkill = buildSkillData.bind(
        null,
        pacerBaseHorse,
        this._raceParams,
        this._course,
        wholeCourse,
        this._parser,
      );
      pacerSkillData = this._pacerSkillIds.flatMap((id) =>
        makePacerSkill(id, SkillPerspective.Self),
      );
      this._pacerSkillData = pacerSkillData;
    }

    return pacerHorse;
  }

  setupPacerSkillTriggers(pacerRng: SeededRng) {
    if (!this._course) {
      throw new Error('Course not set');
    }

    const wholeCourse = new RegionList();
    wholeCourse.push(new Region(0, this._course.distance));

    let pacerTriggers: Array<Array<Region>> = [];

    if (this._pacerSkillIds.length > 0) {
      pacerTriggers = this._pacerSkillData.map((sd) => {
        const sp = this._samplePolicyOverride.get(sd.skillId) || sd.samplePolicy;
        return sp.sample(sd.regions, this.nsamples, pacerRng);
      });
    }

    this._pacerTriggers = pacerTriggers;
  }

  buildPacer(pacerHorse: HorseParameters, i: number, pacerRng: SeededRng): RaceSolver | null {
    if (!this._course) {
      throw new Error('Course not set');
    }

    this.setupPacerSkillTriggers(pacerRng);

    let pacerSkills: Array<PendingSkill> = this._pacerSkills;

    if (this._pacerSkillData.length > 0) {
      pacerSkills = this._pacerSkillData.map((skillData, skillDataIndex) => ({
        skillId: skillData.skillId,
        perspective: skillData.perspective,
        rarity: skillData.rarity,
        trigger:
          this._pacerTriggers[skillDataIndex][i % this._pacerTriggers[skillDataIndex].length],
        extraCondition: skillData.extraCondition,
        effects: skillData.effects,
      }));
    }

    return pacerHorse
      ? new RaceSolver({
          horse: pacerHorse,
          course: this._course,
          hp: NoopHpPolicy,
          skills: pacerSkills,
          rng: pacerRng,
          speedUpProbability: this._pacerSpeedUpRate,
          disableRushed: this._disableRushed,
          disableDownhill: this._disableDownhill,
          disableSectionModifier: this._disableSectionModifier,
          skillCheckChance: this._skillCheckChance,
          posKeepMode: this._posKeepMode,
          mode: this._mode,
          isPacer: true,

          // Never track skill activations or effects for the pacer
          onSkillActivated: undefined,
          onEffectActivated: undefined,
          onEffectExpired: undefined,
        })
      : null;
  }

  pacer(horse: HorseDesc) {
    return this.setupPacer(horse);
  }

  useDefaultPacer(openingLegAccel: boolean = false) {
    const pacer = Object.assign({}, this._runner, { strategy: 'Front Runner' });

    if (openingLegAccel) {
      // top is jiga and bottom is white sente
      // arguably it's more realistic to include these, but also a lot of the time they prevent the exact pace down effects
      // that we're trying to investigate
      this._pacerSkills = [
        {
          skillId: '201601',
          perspective: SkillPerspective.Self,
          rarity: SkillRarity.White,
          trigger: new Region(0, 100),
          extraCondition: (_) => true,
          effects: [
            {
              type: SkillType.Accel,
              baseDuration: 3.0,
              modifier: 0.2,
              target: SkillTarget.Self,
            },
          ],
        },
        {
          skillId: '200532',
          perspective: SkillPerspective.Self,
          rarity: SkillRarity.White,
          trigger: new Region(0, 100),
          extraCondition: (_) => true,
          effects: [
            {
              type: SkillType.Accel,
              baseDuration: 1.2,
              modifier: 0.2,
              target: SkillTarget.Self,
            },
          ],
        },
      ];
    }

    return this.setupPacer(pacer);
  }

  withActivateCountsAsRandom() {
    this._parser = acrParser;
    return this;
  }

  // NB. must be called after horse and mood are set
  withAsiwotameru() {
    if (!this._runner) {
      throw new Error('Horse not set');
    }

    // for some reason, asitame (probably??) uses *displayed* power adjusted for motivation + greens
    const baseDisplayedPower = this._runner.power * (1 + 0.02 * this._raceParams.mood);
    this._extraSkillHooks.push((skilldata, horse, course) => {
      const power = skilldata.reduce((acc, sd) => {
        const powerUp = sd.effects.find((ef) => ef.type == SkillType.PowerUp);
        if (powerUp && sd.regions.length > 0 && sd.regions[0].start < 9999) {
          return acc + powerUp.modifier;
        }

        return acc;
      }, baseDisplayedPower);

      if (power > 1200) {
        const spurtStart = new RegionList();
        spurtStart.push(new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance));
        skilldata.push({
          skillId: 'asitame',
          perspective: SkillPerspective.Self,
          rarity: SkillRarity.White,
          regions: spurtStart,
          samplePolicy: ImmediatePolicy,
          extraCondition: (_) => true,
          effects: [
            {
              type: SkillType.Accel,
              baseDuration: 3.0 / (course.distance / 1000.0),
              modifier: Asitame.calcApproximateModifier(power, horse.strategy, course.distanceType),
              target: SkillTarget.Self,
            },
          ],
        });
      }
    });
    return this;
  }

  withStaminaSyoubu() {
    this._extraSkillHooks.push((skilldata, horse, course) => {
      // unfortunately the simulator doesnt (yet) support dynamic modifiers, so we have to account for greens here
      // even though they are later added normally during execution
      const stamina = skilldata.reduce((acc, sd) => {
        const staminaUp = sd.effects.find((ef) => ef.type == SkillType.StaminaUp);
        if (staminaUp && sd.regions.length > 0 && sd.regions[0].start < 9999) {
          return acc + staminaUp.modifier;
        } else {
          return acc;
        }
      }, horse.rawStamina);

      if (stamina > 1200) {
        const spurtStart = new RegionList();
        spurtStart.push(new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance));

        skilldata.push({
          skillId: 'staminasyoubu',
          perspective: SkillPerspective.Self,
          rarity: SkillRarity.White,
          regions: spurtStart,
          samplePolicy: ImmediatePolicy,

          // TODO do current speed skills count toward reaching max speed or not?
          extraCondition: (s: IRaceState) => s.currentSpeed >= s.lastSpurtSpeed,
          effects: [
            {
              type: SkillType.TargetSpeed,
              baseDuration: 9999.0,
              modifier: StaminaSyoubu.calcApproximateModifier(stamina, course.distance),
              target: SkillTarget.Self,
            },
          ],
        });
      }
    });
    return this;
  }

  addSkill(
    skillId: string,
    perspective: ISkillPerspective = SkillPerspective.Self,
    samplePolicy?: ActivationSamplePolicy,
    originWisdom?: number,
  ) {
    this._skills.push({
      skillId: skillId,
      perspective: perspective,
      originWisdom,
    });

    if (samplePolicy) {
      this._samplePolicyOverride.set(skillId, samplePolicy);
    }

    return this;
  }

  /**
   * Adds a skill that will be forced to activate at a specific distance on the track.
   * This overrides the skill's normal activation conditions and sample policy.
   * @param skillId The skill ID to add
   * @param position The distance (in meters) where the skill should activate
   * @param perspective Whether this skill is for Self or Other (default: Self)
   * @returns this builder for chaining
   */
  addSkillAtPosition(
    skillId: string,
    position: number,
    perspective: ISkillPerspective = SkillPerspective.Self,
    originWisdom?: number,
  ) {
    return this.addSkill(skillId, perspective, createFixedPositionPolicy(position), originWisdom);
  }

  /**
   * Disables the rushed status mechanic for this horse.
   * When disabled, the horse will never enter the rushed state regardless of wisdom.
   * @returns this builder for chaining
   */
  disableRushed() {
    this._disableRushed = true;
    return this;
  }

  /**
   * Disables the downhill acceleration mode mechanic for this horse.
   * When disabled, the horse will never enter downhill mode regardless of wisdom.
   * @returns this builder for chaining
   */
  disableDownhill() {
    this._disableDownhill = true;
    return this;
  }

  disableSectionModifier() {
    this._disableSectionModifier = true;
    return this;
  }

  useEnhancedSpurt(enabled: boolean = false) {
    this._useEnhancedSpurt = enabled;
    return this;
  }

  useHpPolicy(enabled: boolean = true) {
    this._useHpPolicy = enabled;
    return this;
  }

  skillCheckChance(enabled: boolean = true) {
    this._skillCheckChance = enabled;
    return this;
  }

  accuracyMode(enabled: boolean = true) {
    this._accuracyMode = enabled;
    return this;
  }

  posKeepMode(mode: IPosKeepMode) {
    this._posKeepMode = mode;
    return this;
  }

  mode(mode: RaceSolverMode) {
    this._mode = mode;
    return this;
  }

  onSkillActivated(cb: OnSkillCallback) {
    this._onSkillActivated = cb;
    return this;
  }

  onEffectActivated(cb: OnSkillEffectCallback) {
    this._onEffectActivated = cb;
    return this;
  }

  onEffectExpired(cb: OnSkillEffectCallback) {
    this._onEffectExpired = cb;
    return this;
  }

  /**
   * Resets the RNG seed to a new random value.
   * This is useful for when you want to run the same simulation with different RNG seeds.
   */
  desync() {
    this.seed(this._rng.int32());
  }

  fork() {
    const clone = new RaceSolverBuilder(this.nsamples);

    clone._course = this._course;
    clone._raceParams = cloneDeep(this._raceParams);
    clone._runner = this._runner;
    clone._pacerSkills = this._pacerSkills.slice(); // sharing the skill objects is fine but see the note below
    clone._pacerSkillIds = this._pacerSkillIds.slice();
    clone._pacerSpeedUpRate = this._pacerSpeedUpRate;
    clone._pacerSkillData = this._pacerSkillData.slice();
    clone._pacerTriggers = this._pacerTriggers.slice();

    clone.seed(this._seed);

    clone._parser = this._parser;
    clone._skills = this._skills.slice();

    clone._onSkillActivated = this._onSkillActivated;
    clone._onEffectActivated = this._onEffectActivated;
    clone._onEffectExpired = this._onEffectExpired;

    clone._disableRushed = this._disableRushed;
    clone._disableDownhill = this._disableDownhill;
    clone._disableSectionModifier = this._disableSectionModifier;
    clone._useHpPolicy = this._useHpPolicy;
    clone._useEnhancedSpurt = this._useEnhancedSpurt;
    clone._accuracyMode = this._accuracyMode;
    clone._skillCheckChance = this._skillCheckChance;
    clone._posKeepMode = this._posKeepMode;
    clone._mode = this._mode;

    // NB. GOTCHA: if asitame is enabled, it closes over *our* horse and mood data, and not the clone's
    // this is assumed to be fine, since fork() is intended to be used after everything is added except skills,
    // but it does mean that if you want to compare different power stats or moods, you must call withAsiwotameru()
    // after fork() on each instance separately, which is a potential gotcha
    clone._extraSkillHooks = this._extraSkillHooks.slice();

    return clone;
  }

  *build() {
    if (!this._runner) {
      throw new Error('Horse not set');
    }

    if (!this._course) {
      throw new Error('Course not set');
    }

    const course = this._course;
    const runnerWithBaseStats = buildBaseStats(this._runner);
    const skillRng = new Rule30CARng(this._rng.int32());

    const wholeCourse = new RegionList();
    wholeCourse.push(new Region(0, course.distance));

    const makeSkill: (skillId: string, perspective: ISkillPerspective) => Array<SkillTrigger> =
      buildSkillData.bind(
        null,
        runnerWithBaseStats,
        this._raceParams,
        course,
        wholeCourse,
        this._parser,
      );

    const skillDataList = this._skills.flatMap(({ skillId, perspective }) =>
      makeSkill(skillId, perspective),
    );

    this._extraSkillHooks.forEach((skillHook) =>
      skillHook(skillDataList, runnerWithBaseStats, course),
    );

    const triggers = skillDataList.map((skillData) => {
      const samplePolicy =
        this._samplePolicyOverride.get(skillData.skillId) ?? skillData.samplePolicy;

      return samplePolicy.sample(skillData.regions, this.nsamples, skillRng);
    });

    // must come after skill activations are decided because conditions like base_power depend on base stats
    const runnerWithAdjustedStats = buildAdjustedStats(
      runnerWithBaseStats,
      this._course,
      this._raceParams.groundCondition,
    );

    for (let i = 0; i < this.nsamples; ++i) {
      const raceSolverRNG = new Rule30CARng(this._rng.int32());

      const skills: Array<PendingSkill> = skillDataList.map((skillData, skillDataIndex) => ({
        skillId: skillData.skillId,
        perspective: skillData.perspective,
        rarity: skillData.rarity,
        trigger: triggers[skillDataIndex][i % triggers[skillDataIndex].length],
        extraCondition: skillData.extraCondition,
        effects: skillData.effects,
        originWisdom: this._skills[skillDataIndex].originWisdom,
      }));

      const runnerHPRNG = new Rule30CARng(this._rng.int32());

      let runnerHPManager: HpPolicy;

      if (this._useHpPolicy) {
        runnerHPManager = this._useEnhancedSpurt
          ? new EnhancedHpPolicy(
              this._course,
              this._raceParams.groundCondition,
              runnerHPRNG,
              this._accuracyMode,
            )
          : new GameHpPolicy(this._course, this._raceParams.groundCondition, runnerHPRNG);
      } else {
        runnerHPManager = NoopHpPolicy;
      }

      const redoRun: boolean = yield new RaceSolver({
        horse: runnerWithAdjustedStats,
        course: this._course,
        skills,
        hp: runnerHPManager,
        rng: raceSolverRNG,
        onSkillActivated: this._onSkillActivated,
        onEffectActivated: this._onEffectActivated,
        onEffectExpired: this._onEffectExpired,
        disableRushed: this._disableRushed,
        disableDownhill: this._disableDownhill,
        disableSectionModifier: this._disableSectionModifier,
        skillCheckChance: this._skillCheckChance,
        posKeepMode: this._posKeepMode,
        mode: this._mode,
      });

      if (redoRun) {
        --i;
      }
    }
  }
}
