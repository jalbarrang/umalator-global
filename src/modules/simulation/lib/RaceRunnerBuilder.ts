import { cloneDeep } from 'es-toolkit';
import { Strategy } from './runner/types';
import { Grade, GroundCondition, Season, TimeOfDay, Weather } from './core/types';
import { CourseHelpers } from './course/CourseData';
import { SkillPerspective, SkillRarity, SkillTarget, SkillType } from './skills/types';
import { Region, RegionList } from './utils/Region';
import { Rule30CARng } from './utils/Random';
import { PosKeepMode } from './core/constants';
import { NoopHpPolicy } from './physics/health/HealthPolicy';
import { EnhancedHpPolicy } from './physics/health/policies/EnhancedHealthPolicy';
import { GameHpPolicy } from './physics/health/policies/GameHealthPolicy';

import { createFixedPositionPolicy } from './skills/activation/helpers';
import { ImmediatePolicy } from './skills/activation/policies/ImmediatePolicy';
import { RaceRunner } from './RaceRunner';
import { Asitame, StaminaSyoubu, buildAdjustedStats, buildBaseStats } from './runner/utils';
import { acrParser, buildSkillData, defaultParser } from './skills/utils';
import {
  parseGrade,
  parseGroundCondition,
  parseSeason,
  parseTime,
  parseWeather,
} from './course/helpers';
import type { DefaultParser } from './skills/activation/ConditionParser';
import type { HorseDesc } from './runner/utils';
import type { SkillData, SkillTrigger } from './skills/utils';
import type { ActivationSamplePolicy } from './skills/activation/policies/ActivationSamplePolicy';
import type { IPosKeepMode } from './core/constants';
import type { SeededRng } from './utils/Random';
import type { ISkillPerspective, ISkillTarget, ISkillType } from './skills/types';
import type {
  CourseData,
  IGrade,
  IGroundCondition,
  IMood,
  ISeason,
  ITimeOfDay,
  IWeather,
  PartialRaceParameters,
  PendingSkill,
  RaceState,
} from './core/types';
import type { RunnerParameters } from './runner/types';

export class RaceRunnerBuilder {
  _course: CourseData | null;
  _raceParams: PartialRaceParameters;
  _horse: HorseDesc | null;
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
    (skilldata: Array<SkillData>, horse: RunnerParameters, course: CourseData) => void
  >;
  _onSkillActivate:
    | ((
        state: RaceRunner,
        currentPosition: number,
        executionId: string,
        skillId: string,
        perspective: ISkillPerspective,
        type: ISkillType,
        target: ISkillTarget,
      ) => void)
    | null;
  _onSkillDeactivate:
    | ((
        state: RaceRunner,
        currentPosition: number,
        executionId: string,
        skillId: string,
        perspective: ISkillPerspective,
        type: ISkillType,
        target: ISkillTarget,
      ) => void)
    | null;
  _disableRushed: boolean;
  _disableDownhill: boolean;
  _disableSectionModifier: boolean;
  _useEnhancedSpurt: boolean;
  _accuracyMode: boolean;
  _skillCheckChance: boolean;
  _posKeepMode: IPosKeepMode;
  _mode: string | undefined;

  constructor(readonly nsamples: number) {
    this._course = null;
    this._raceParams = {
      mood: 2,
      groundCondition: GroundCondition.Good,
      weather: Weather.Sunny,
      season: Season.Spring,
      timeOfDay: TimeOfDay.Midday,
      grade: Grade.G1,
      popularity: 1,
    };
    this._horse = null;
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
    this._onSkillActivate = null;
    this._onSkillDeactivate = null;
    this._disableRushed = false;
    this._disableDownhill = false;
    this._disableSectionModifier = false;
    this._useEnhancedSpurt = false;
    this._accuracyMode = false;
    this._skillCheckChance = true;
    this._posKeepMode = PosKeepMode.None;
    this._mode = undefined;
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
    this._raceParams.timeOfDay = parseTime(time);
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
    this._horse = horse;
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
    if (!this._horse) {
      throw new Error('Horse not set');
    }

    if (typeof this._horse.strategy == 'string') {
      return (
        this._horse.strategy.toUpperCase() == 'NIGE' ||
        this._horse.strategy.toUpperCase() == 'OONIGE'
      );
    } else {
      return (
        this._horse.strategy == Strategy.FrontRunner || this._horse.strategy == Strategy.Runaway
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

  buildPacer(pacerHorse: RunnerParameters, i: number, pacerRng: SeededRng): RaceRunner | null {
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
      ? new RaceRunner({
          runner: pacerHorse,
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
        })
      : null;
  }

  pacer(horse: HorseDesc) {
    return this.setupPacer(horse);
  }

  useDefaultPacer(openingLegAccel: boolean = false) {
    const pacer = Object.assign({}, this._horse, { strategy: 'Nige' });

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
    if (!this._horse) {
      throw new Error('Horse not set');
    }

    // for some reason, asitame (probably??) uses *displayed* power adjusted for motivation + greens
    const baseDisplayedPower = this._horse.power * (1 + 0.02 * this._raceParams.mood);
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
          extraCondition: (s: RaceState) => s.currentSpeed >= s.lastSpurtSpeed,
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

  skillCheckChance(enabled: boolean = true) {
    this._skillCheckChance = enabled;
    return this;
  }

  useEnhancedSpurt(enabled: boolean = true) {
    this._useEnhancedSpurt = enabled;
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

  mode(mode: string) {
    this._mode = mode;
    return this;
  }

  onSkillActivate(
    cb: (
      state: RaceRunner,
      currentPosition: number,
      executionId: string,
      skillId: string,
      perspective: ISkillPerspective,
      type: ISkillType,
      target: ISkillTarget,
    ) => void,
  ) {
    this._onSkillActivate = cb;
    return this;
  }

  onSkillDeactivate(
    cb: (
      state: RaceRunner,
      currentPosition: number,
      executionId: string,
      skillId: string,
      perspective: ISkillPerspective,
      type: ISkillType,
      target: ISkillTarget,
    ) => void,
  ) {
    this._onSkillDeactivate = cb;
    return this;
  }

  desync() {
    this.seed(this._rng.int32());
  }

  fork() {
    const clone = new RaceRunnerBuilder(this.nsamples);
    clone._course = this._course;
    clone._raceParams = cloneDeep(this._raceParams);
    clone._horse = this._horse;
    clone._pacerSkills = this._pacerSkills.slice(); // sharing the skill objects is fine but see the note below
    clone._pacerSkillIds = this._pacerSkillIds.slice();
    clone._pacerSpeedUpRate = this._pacerSpeedUpRate;
    clone._pacerSkillData = this._pacerSkillData.slice();
    clone._pacerTriggers = this._pacerTriggers.slice();
    clone.seed(this._seed);
    clone._parser = this._parser;
    clone._skills = this._skills.slice();
    clone._onSkillActivate = this._onSkillActivate;
    clone._onSkillDeactivate = this._onSkillDeactivate;
    clone._disableRushed = this._disableRushed;
    clone._disableDownhill = this._disableDownhill;
    clone._disableSectionModifier = this._disableSectionModifier;
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
    if (!this._horse) {
      throw new Error('Horse not set');
    }

    if (!this._course) {
      throw new Error('Course not set');
    }

    const course = this._course;
    let horse = buildBaseStats(this._horse);
    const skillRng = new Rule30CARng(this._rng.int32());

    const wholeCourse = new RegionList();
    wholeCourse.push(new Region(0, course.distance));

    const makeSkill: (skillId: string, perspective: ISkillPerspective) => Array<SkillTrigger> =
      buildSkillData.bind(null, horse, this._raceParams, course, wholeCourse, this._parser);

    const skillDataList = this._skills.flatMap(({ skillId, perspective }) =>
      makeSkill(skillId, perspective),
    );

    this._extraSkillHooks.forEach((skillHook) => skillHook(skillDataList, horse, course));

    const triggers = skillDataList.map((skillData) => {
      const samplePolicy =
        this._samplePolicyOverride.get(skillData.skillId) ?? skillData.samplePolicy;

      return samplePolicy.sample(skillData.regions, this.nsamples, skillRng);
    });

    // must come after skill activations are decided because conditions like base_power depend on base stats
    horse = buildAdjustedStats(horse, this._course, this._raceParams.groundCondition);

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

      const runnerHPManager = this._useEnhancedSpurt
        ? new EnhancedHpPolicy(
            this._course,
            this._raceParams.groundCondition,
            runnerHPRNG,
            this._accuracyMode,
          )
        : new GameHpPolicy(this._course, this._raceParams.groundCondition, runnerHPRNG);

      const redoRun: boolean = yield new RaceRunner({
        runner: horse,
        course: this._course,
        skills,
        hp: runnerHPManager,
        rng: raceSolverRNG,
        onSkillActivate: this._onSkillActivate,
        onSkillDeactivate: this._onSkillDeactivate,
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
