import { PhaseDeceleration, Runner } from '../../common/runner';
import { CourseHelpers } from '../../course/CourseData';
import {
  createBlockedSideCondition,
  createOvertakeCondition,
} from '../../conditions/special-conditions';
import { PosKeepMode, Strategy } from '../../runner/definitions';
import { PositionKeepState, SkillRarity, SkillTarget, SkillType } from '../../skills/definitions';
import { StrategyHelpers } from '../../runner/runner.types';
import type { RaceStateSlice } from '../../health/health-policy';
import type { PendingSkill } from '../../skills/skill.types';
import type { IPhase } from '../../course/definitions';
import type { Timer } from '../../simulator.types';
import type { PRNG } from '../../shared/random';
import type {
  ApproximateCondition,
  ConditionState,
} from '../../conditions/ApproximateStartContinue';
import type { Race } from '../../common/race';
import type { RunnerProps } from '../../common/runner';
import type { CompareRace } from './race';

export class CompareRunner extends Runner {
  declare public posKeepRng: PRNG;
  declare public laneMovementRng: PRNG;
  declare public witRng: PRNG;
  declare public syncRng: PRNG;
  declare public downhillRng: PRNG;
  declare public skillRng: PRNG;
  /**
   * RNG for force activating gold skills
   *
   * This is used to randomly select gold skills to activate.
   *
   * Skill Effects that use this:
   * - ActivateRandomGold
   */
  declare public forceSkillActivatorRng: PRNG;
  declare public duelingRng: PRNG;
  declare public spotStruggleTargets: Set<number>;

  // Conditions (Compare mode only)
  declare private conditionTimer: Timer;
  declare private conditionValues: Map<string, number>;
  declare private conditions: Map<string, ApproximateCondition>;

  constructor(race: Race, props: RunnerProps) {
    super(race, props);
  }

  private get compareRace(): CompareRace {
    return this.race as CompareRace;
  }

  private get isOnFinalStraightForCompare(): boolean {
    const course = this.race.course;
    const lastStraight = course.straights[course.straights.length - 1];
    return this.position >= lastStraight.start && this.position <= lastStraight.end;
  }

  private get isAfterFinalCornerOrInFinalStraightForCompare(): boolean {
    const course = this.race.course;
    const finalCornerStart =
      course.corners.length > 0 ? course.corners[course.corners.length - 1].start : Infinity;
    return this.position >= finalCornerStart || this.isOnFinalStraightForCompare;
  }

  // === Runtime ===

  public override onPrepare(masterSeed: number): void {
    super.onPrepare(masterSeed);

    this.conditionTimer = this.createTimer(-1.0);
    this.conditionValues = new Map();
    this.conditions = new Map();
    this.firstPositionInLateRace = false;

    this.registerConditions();
    this.spotStruggleTargets = new Set();
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

  protected calculatePosKeepEnd(): number {
    return this.sectionLength * 10.0;
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
      this.preRushedPosKeepStrategy = this.positionKeepStrategy;
      // Mark that this runner has been rushed
      this.hasBeenRushed = true;

      this.rushedTimer.t = 0;

      // Start tracking, end position will be filled later
      this.rushedActivations.push([this.position, -1]);

      // While rushed, position-keep behavior is forced based on strategy bucket.
      const strategyRoll = this.rushedRng.random();
      switch (this.strategy) {
        case Strategy.Runaway:
        case Strategy.FrontRunner:
        case Strategy.PaceChaser:
          this.positionKeepStrategy = Strategy.FrontRunner;
          break;
        case Strategy.LateSurger:
          this.positionKeepStrategy =
            strategyRoll < 0.75 ? Strategy.FrontRunner : Strategy.PaceChaser;
          break;
        case Strategy.EndCloser:
          if (strategyRoll < 0.7) {
            this.positionKeepStrategy = Strategy.FrontRunner;
          } else if (strategyRoll < 0.9) {
            this.positionKeepStrategy = Strategy.PaceChaser;
          } else {
            this.positionKeepStrategy = Strategy.LateSurger;
          }
          break;
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
    this.positionKeepStrategy = this.preRushedPosKeepStrategy;

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
    if (!this.race.settings.downhill) {
      if (this.isDownhillMode) {
        this.downhillModeStart = null;
        this.isDownhillMode = false;
      }
      return;
    }

    // Only active while inside a downhill segment.
    if (this.currentHillIndex === -1 || this.slopePer >= 0) {
      if (this.isDownhillMode) {
        this.downhillModeStart = null;
        this.isDownhillMode = false;
      }
      return;
    }

    // Check if we should update downhill mode (once per second, at 15 FPS)
    const currentFrame = Math.floor(this.accumulateTime.t * 15);
    const changeSecond = currentFrame % 15 === 14; // Check on the last frame of each second

    if (!changeSecond || currentFrame === this.lastDownhillCheckFrame) {
      return; // Not time to check yet, or already checked this second
    }

    this.lastDownhillCheckFrame = currentFrame;

    const downHillCheckRng = this.downhillRng.random();

    if (this.downhillModeStart === null) {
      // Check for entry: Wisdom * 0.0004 chance each second (matching Kotlin implementation)
      if (downHillCheckRng < this.adjustedStats.wit * 0.0004) {
        this.downhillModeStart = currentFrame;
        this.isDownhillMode = true;
      }

      return;
    }

    // Check for exit: 20% chance each second to exit downhill mode
    if (downHillCheckRng > 0.8) {
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

  public override onUpdate(dt: number): void {
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

    this.updateFirstPositionInLateRace();

    if (this.position >= this.race.course.distance) {
      this.finished = true;
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
    // Global behavior: skill activation check uses base Wit.
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
    const myStrategy = this.positionKeepStrategy;

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

            if (distanceAhead < threshold && this.speedUpOvertakeWitCheck()) {
              this.positionKeepActivations.push([this.position, 0, PositionKeepState.SpeedUp]);
              this.positionKeepState = PositionKeepState.SpeedUp;
              this.posKeepExitPosition =
                this.position +
                Math.floor(this.sectionLength) *
                  (this.positionKeepStrategy === Strategy.Runaway ? 3 : 1);
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
          this.posKeepExitPosition =
            this.position +
            Math.floor(this.sectionLength) * (this.positionKeepStrategy === Strategy.Runaway ? 3 : 1);
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

  /**
   * Port of RaceSolver.updatefirstUmaInLateRace adapted to shared runner model.
   * Runs once per frame from a single coordinator runner to avoid double RNG use.
   */
  private updateFirstPositionInLateRace() {
    const runners = Array.from(this.race.runners.values());
    if (runners.length === 0) {
      return;
    }

    const coordinatorId = Math.max(...runners.map((runner) => runner.id));
    if (this.id !== coordinatorId) {
      return;
    }

    const existingFirst = runners.find((runner) => runner.firstPositionInLateRace);
    if (existingFirst) {
      return;
    }

    const sortedRunners = [...runners].sort((a, b) => b.position - a.position);
    const firstRunner = sortedRunners[0];

    if (firstRunner.position < (this.race.course.distance * 2) / 3) {
      return;
    }

    const firstPositionRounded = Math.round(firstRunner.position * 100) / 100;
    const tiedRunners: Array<Runner> = [];

    for (const runner of sortedRunners) {
      const runnerPosRounded = Math.round(runner.position * 100) / 100;

      if (runnerPosRounded === firstPositionRounded) {
        tiedRunners.push(runner);
      } else {
        break;
      }
    }

    const tieBreakerRng = this.syncRng ?? this.rng;
    const selectedRunner = tiedRunners[tieBreakerRng.uniform(tiedRunners.length)];
    selectedRunner.firstPositionInLateRace = true;
  }

  speedUpOvertakeWitCheck() {
    if (this.isRushed) {
      return true;
    }

    return this.posKeepRng.random() < 0.2 * Math.log10(0.1 * this.adjustedStats.wit);
  }

  paceUpWitCheck() {
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

    if (StrategyHelpers.strategyMatches(this.positionKeepStrategy, Strategy.FrontRunner)) {
      return;
    }

    if (this.healthPolicy.healthRatioRemaining() < 0.15 || !this.isOnFinalStraightForCompare) {
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

    this.artificialDueling();
  }

  private artificialDueling() {
    const duelingRates = this.compareRace.duelingRates;
    if (this.canDuel === null) {
      if (duelingRates) {
        let rate = 0;
        if (this.positionKeepStrategy === Strategy.Runaway) {
          rate = duelingRates.runaway;
        } else if (this.positionKeepStrategy === Strategy.FrontRunner) {
          rate = duelingRates.frontRunner;
        } else if (this.positionKeepStrategy === Strategy.PaceChaser) {
          rate = duelingRates.paceChaser;
        } else if (this.positionKeepStrategy === Strategy.LateSurger) {
          rate = duelingRates.lateSurger;
        } else if (this.positionKeepStrategy === Strategy.EndCloser) {
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

    // Global reference: requires a 2s proximity-style check cadence.
    if (this.duelingTimer.t >= 2) {
      if (this.duelingRng.random() <= 0.4) {
        this.isDueling = true;
        this.duelingStartPosition = this.position;
      } else {
        this.duelingTimer.t = 0;
      }
    }
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
      StrategyHelpers.strategyMatches(this.positionKeepStrategy, Strategy.FrontRunner)
    ) {
      const otherUmas = this.race.runnersPerStrategy.get(this.positionKeepStrategy) ?? [];
      const distanceGap = this.positionKeepStrategy === Strategy.FrontRunner ? 3.75 : 5;
      const laneGap = this.positionKeepStrategy === Strategy.FrontRunner ? 0.165 : 0.416;

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
          this.spotStruggleTargets.add(uma.id);
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
        posKeepStrategy: this.positionKeepStrategy,
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
      // Global quick reference does not include PaceDown -0.5 override.
      this.acceleration = PhaseDeceleration[this.phase];
      return;
    }
    this.acceleration = this.baseAccelerations[+(this.slopePer > 0) * 3 + this.phase];
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

    if (this.extraMoveLane < 0.0 && this.isAfterFinalCornerOrInFinalStraightForCompare) {
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

  // /**
  //  * Helper method to create a new Runner instance.
  //  *
  //  * This will apply the mood coefficient and adjust the stats based on the course, ground, and strategy.
  //  */
  // public static create(race: RaceSimulator, id: number, props: CreateRunner): Runner {
  //   const umaId = props.outfitId.slice(0, 4);

  //   const displayInfo = getUmaDisplayInfo(props.outfitId);
  //   const name = displayInfo?.name ?? `Mob ${id}`;

  //   const runner = new Runner(race, {
  //     id: id,
  //     outfitId: props.outfitId,
  //     umaId,
  //     name,
  //     mood: props.mood,
  //     strategy: props.strategy,
  //     aptitudes: props.aptitudes,
  //     stats: props.stats,
  //     skillIds: props.skills,
  //   });

  //   return runner;
  // }
}
