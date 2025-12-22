import { calculateRushedChance } from '../../core/formulas';
import type { RunnerParameters } from '../../runner/types';
import type { PRNG } from '../../utils/Random';
import type { GameTimerManager, InGameTimer } from '../../utils/Timer';

export type RushedState = {
  isRushed: boolean;
  hasBeenRushed: boolean; // Track if horse has already been rushed this race (can only happen once)
  rushedSection: number; // Which section (2-9) the rushed state activates in
  rushedEnterPosition: number; // Position where rushed state should activate
  rushedTimer: InGameTimer; // Tracks time in rushed state
  rushedMaxDuration: number; // Maximum duration (12s + extensions)
  rushedActivations: Array<[number, number]>; // Track [start, end] positions for UI
};

type RushedStateManagerParameters = {
  sectionLength: number;
  rng: PRNG;
  timerManager: GameTimerManager;
  disabled: boolean;
};

export type InitializeRushedStateOptions = {
  hasRestraintSkill?: boolean;
};

export class RushedStateManager {
  private timerManager: GameTimerManager;
  private state: RushedState;
  private rng: PRNG; // TODO: use seeded RNG instead of generating a new random number each time
  private sectionLength: number;
  private disabled: boolean;

  constructor(params: RushedStateManagerParameters) {
    this.timerManager = params.timerManager;
    this.disabled = params.disabled;
    this.rng = params.rng;
    this.sectionLength = params.sectionLength;

    this.state = {
      isRushed: false,
      hasBeenRushed: false,
      rushedSection: -1,
      rushedEnterPosition: -1,
      rushedTimer: this.timerManager.createTimer(),
      rushedMaxDuration: 12.0,
      rushedActivations: [],
    };
  }

  /**
   * Initializes the rushed state for a given runner.
   *
   * TODO: Consider a logic that can manage multiple runners' rushed states instead of one.
   *       that way, we can have a single instance of this manager for the entire race.
   */
  initialize(runner: RunnerParameters, options: InitializeRushedStateOptions = {}) {
    const { hasRestraintSkill = false } = options;

    // Skip rushed calculation if disabled
    if (this.disabled) {
      return;
    }

    // Calculate rushed chance based on wisdom
    // Formula: RushedChance = (6.5 / log10(0.1 * WitStat + 1))²%
    const rushedChance = calculateRushedChance(runner.wisdom);

    // Check if horse has The Restraint skill - ID 202161
    // This reduces rushed chance by flat 3%
    // const hasSelfControl = this.pendingSkills.some((s) => s.skillId === '202161');
    const finalRushedChance = Math.max(0, rushedChance - (hasRestraintSkill ? 0.03 : 0));

    // Roll for rushed state
    if (this.rng.random() < finalRushedChance) {
      // Determine which section (2-9) the rushed state activates in
      this.state.rushedSection = 2 + this.rng.uniform(8); // Random int from 2 to 9
      this.state.rushedEnterPosition = this.sectionLength * this.state.rushedSection;
    }
  }

  update(position: number, _delta: number) {
    // Check if we should enter rushed state (can only happen once per race)
    if (
      this.state.rushedSection >= 0 &&
      !this.state.isRushed &&
      !this.state.hasBeenRushed &&
      position >= this.state.rushedEnterPosition
    ) {
      this.state.isRushed = true;
      this.state.hasBeenRushed = true; // Mark that this horse has been rushed
      this.state.rushedTimer.t = 0;
      this.state.rushedActivations.push([position, -1]); // Start tracking, end will be filled later
    }

    // Update rushed state if active
    if (this.state.isRushed) {
      // Check for recovery every 3 seconds
      if (
        this.state.rushedTimer.t > 0 &&
        Math.floor(this.state.rushedTimer.t / 3) >
          Math.floor((this.state.rushedTimer.t - 0.017) / 3)
      ) {
        // 55% chance to snap out of it
        if (this.rng.random() < 0.55) {
          this.endRushed(position);
          return;
        }
      }

      // Force end after max duration
      if (this.state.rushedTimer.t >= this.state.rushedMaxDuration) {
        this.endRushed(position);
      }
    }
  }

  endRushed(position: number) {
    this.state.isRushed = false;
    // Mark the end position for UI display
    if (this.state.rushedActivations.length > 0) {
      const lastIdx = this.state.rushedActivations.length - 1;
      if (this.state.rushedActivations[lastIdx][1] === -1) {
        this.state.rushedActivations[lastIdx][1] = position;
      }
    }
  }

  /**
   * Extends the Rushed State duration
   *
   * Called by debuff skills like:
   * - Trick (Front)
   * - Trick (Back)
   * - Tantalizing Trick
   */
  extendDuration(extension: number) {
    this.state.rushedMaxDuration += extension;
  }

  isRushed(): boolean {
    return this.state.isRushed;
  }

  getActivations(): ReadonlyArray<[number, number]> {
    return this.state.rushedActivations;
  }

  getHpConsumptionMultiplier(): number {
    // FIXME: Needs to consider if the runner is a Runaway, because that changes the multiplier.
    return this.state.isRushed ? 1.6 : 1.0;
  }
}
