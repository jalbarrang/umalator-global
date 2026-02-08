import { PositionKeepState } from '../../lib/skills/definitions';
import { Strategy } from '../../lib/runner/definitions';
import { CourseHelpers } from '../../lib/course/CourseData';
import type { Runner } from '../runner';
import type { IStrategy } from '../../lib/runner/definitions';
import type { IPositionKeepState } from '../../lib/skills/definitions';
import type { CourseData, IGroundCondition, IPhase } from '../../lib/course/definitions';
import type { PRNG } from '../../lib/utils/Random';
import type { HpPolicy, RaceStateSlice } from './health-policy';

/**
 * The coefficient for the stamina modifier based on the strategy
 */
export const HpStrategyCoefficient: ReadonlyArray<number> = [
  0, // None
  0.95, // Front Runner
  0.89, // Pace Chaser
  1.0, // Late Surger
  0.995, // End Closer
  0.86, // Runaway
];
export const HpConsumptionGroundModifier: ReadonlyArray<ReadonlyArray<number>> = [
  [], // None
  [0, 1.0, 1.0, 1.02, 1.02],
  [0, 1.0, 1.0, 1.01, 1.02],
];

export class GameHpPolicy implements HpPolicy {
  distance: number;
  baseSpeed: number;
  maxHp: number;
  currentHealth: number;
  groundModifier: number;
  rng: PRNG;

  declare gutsModifier: number;
  declare subparAcceptChance: number;

  private achievedMaxSpurt = false;

  constructor(course: CourseData, ground: IGroundCondition, rng: PRNG) {
    this.distance = course.distance;
    this.baseSpeed = 20.0 - (course.distance - 2000) / 1000.0;
    this.groundModifier = HpConsumptionGroundModifier[course.surface][ground];
    this.rng = rng;
    this.maxHp = 1.0; // the first round of skill activations happens before init() is called (so we can get the correct stamina after greens)
    this.currentHealth = 1.0; // but there are some conditions that access HpPolicy methods which can run in the first round (e.g. is_hp_empty_onetime)
    // so we have to be "initialized enough" for them
    this.achievedMaxSpurt = false;
  }

  init(runner: Runner) {
    this.maxHp = 0.8 * HpStrategyCoefficient[runner.strategy] * runner.stamina + this.distance;
    this.currentHealth = this.maxHp;
    this.gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * runner.guts);
    this.subparAcceptChance = Math.round((15.0 + 0.05 * runner.wit) * 1000);
    this.achievedMaxSpurt = false;
  }

  getStatusModifier(state: {
    positionKeepState: IPositionKeepState;
    isRushed?: boolean;
    isDownhillMode?: boolean;
    leadCompetition?: boolean;
    posKeepStrategy?: IStrategy;
  }) {
    let modifier = 1.0;

    if (state.isDownhillMode) {
      modifier *= 0.4;
    }

    if (state.leadCompetition) {
      const isOonige = state.posKeepStrategy === Strategy.Runaway;
      if (state.isRushed) {
        modifier *= isOonige ? 7.7 : 3.6;
      } else {
        modifier *= isOonige ? 3.5 : 1.4;
      }
    } else if (state.isRushed) {
      modifier *= 1.6;
    }

    if (state.positionKeepState === PositionKeepState.PaceDown) {
      modifier *= 0.6;
    }

    return modifier;
  }

  private extractRunnerState(runner: Runner): RaceStateSlice {
    return {
      phase: runner.phase,
      positionKeepState: runner.positionKeepState,
      isRushed: runner.isRushed,
      isDownhillMode: runner.isDownhillMode,
      inSpotStruggle: runner.inSpotStruggle,
      posKeepStrategy: runner.strategy,
      pos: runner.position,
      currentSpeed: runner.currentSpeed,
    };
  }

  hpPerSecond(state: RaceStateSlice, velocity: number) {
    const gutsModifier = state.phase >= 2 ? this.gutsModifier : 1.0;
    return (
      ((20.0 * Math.pow(velocity - this.baseSpeed + 12.0, 2)) / 144.0) *
      this.getStatusModifier(state) *
      this.groundModifier *
      gutsModifier
    );
  }

  tick(runner: Runner, dt: number) {
    const state = this.extractRunnerState(runner);
    this.currentHealth -= this.hpPerSecond(state, runner.currentSpeed) * dt;
  }

  hasRemainingHealth() {
    return this.currentHealth > 0.0;
  }

  healthRatioRemaining() {
    return Math.max(0.0, this.currentHealth / this.maxHp);
  }

  recover(modifier: number) {
    this.currentHealth = Math.min(this.maxHp, this.currentHealth + this.maxHp * modifier);
  }

  getLastSpurtPair(state: RaceStateSlice, maxSpeed: number, baseTargetSpeed2: number) {
    const maxDist = this.distance - CourseHelpers.phaseStart(this.distance, 2);
    const s = (maxDist - 60) / maxSpeed;

    const lastleg: RaceStateSlice = {
      ...state,

      phase: 2 as IPhase,
      positionKeepState: PositionKeepState.None,
      inSpotStruggle: false,
      posKeepStrategy: state.posKeepStrategy,
    };

    const hpNeeded = this.hpPerSecond(lastleg, maxSpeed) * s;

    if (this.currentHealth >= hpNeeded) {
      // Only set on first call (when not already set)
      // This matches Kotlin behavior: track initial decision, not later changes
      if (!this.achievedMaxSpurt) {
        this.achievedMaxSpurt = true;
      }
      return [-1, maxSpeed] as [number, number];
    }
    const candidates: Array<[number, number]> = [];
    const remainDistance = this.distance - 60 - state.pos;
    const statusModifier = this.getStatusModifier(lastleg);

    for (let speed = maxSpeed - 0.1; speed >= baseTargetSpeed2; speed -= 0.1) {
      // solve:
      //   s1 * speed + s2 * baseTargetSpeed2 = remainDistance
      //   s2 = (remainDistance - s1 * speed) / baseTargetSpeed2
      // for s1
      const spurtDuration = Math.min(
        remainDistance / speed,
        Math.max(
          0,
          (baseTargetSpeed2 * this.currentHealth -
            this.hpPerSecond(lastleg, baseTargetSpeed2) * remainDistance) /
            (baseTargetSpeed2 * this.hpPerSecond(lastleg, speed) -
              this.hpPerSecond(lastleg, baseTargetSpeed2) * speed),
        ),
      );
      const spurtDistance = spurtDuration * speed;
      candidates.push([this.distance - spurtDistance - 60, speed]);
    }
    candidates.sort(
      (a, b) =>
        (a[0] - state.pos) / baseTargetSpeed2 +
        (this.distance - a[0]) / a[1] -
        ((b[0] - state.pos) / baseTargetSpeed2 + (this.distance - b[0]) / b[1]),
    );

    for (let i = 0; i < candidates.length; ++i) {
      if (this.rng.uniform(100000) <= this.subparAcceptChance) {
        return candidates[i];
      }
    }
    return candidates[candidates.length - 1];
  }

  /**
   * Check if max spurt was achieved
   */
  isMaxSpurt(): boolean {
    return this.achievedMaxSpurt;
  }
}
