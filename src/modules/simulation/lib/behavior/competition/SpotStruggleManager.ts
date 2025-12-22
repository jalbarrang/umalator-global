import {
  calculateSpotStruggleDuration,
  calculateSpotStruggleSpeedBoost,
} from '../../core/formulas';
import { Strategy, StrategyHelpers } from '../../runner/types';
import { InGameTimer } from '../../utils/Timer';
import type { IStrategy } from '../../runner/types';

export interface SpotStruggleState {
  isActive: boolean;
  startPosition: number | null;
  endPosition: number | null;
  timer: InGameTimer;
}

export class SpotStruggleManager {
  private state: SpotStruggleState;
  private runnerGuts: number;
  private strategy: IStrategy;
  private sectionLength: number;

  constructor(runnerGuts: number, strategy: IStrategy, sectionLength: number) {
    this.runnerGuts = runnerGuts;
    this.strategy = strategy;
    this.sectionLength = sectionLength;
    this.state = {
      isActive: false,
      startPosition: null,
      endPosition: null,
      timer: new InGameTimer(0),
    };
  }

  /**
   * Check if spot struggle should end (called each frame)
   */
  updateDuration(position: number, dt: number): void {
    if (!this.state.isActive || !this.state.endPosition) {
      return;
    }

    this.state.timer.t += dt;
    const duration = calculateSpotStruggleDuration(this.runnerGuts);

    if (this.state.timer.t >= duration || position >= this.state.endPosition) {
      this.state.isActive = false;
      this.state.endPosition = position;
    }
  }

  /**
   * Activate spot struggle (called by orchestrator when group conditions met)
   */
  activate(position: number): void {
    this.state.isActive = true;
    this.state.startPosition = position;
    this.state.endPosition = position + Math.floor(this.sectionLength * 8);
    this.state.timer.t = 0;
  }

  /**
   * Check if this uma should participate in spot struggle detection
   */
  canTrigger(position: number): boolean {
    // Already triggered
    if (this.state.startPosition !== null) {
      return false;
    }

    // Only sections 1-6, starting at 150m
    if (position < 150 || position > Math.floor(this.sectionLength * 5)) {
      return false;
    }

    // Only for Front Runner or Runaway
    return StrategyHelpers.strategyMatches(this.strategy, Strategy.FrontRunner);
  }

  /**
   * Get distance threshold for spot struggle detection
   */
  getDistanceThreshold(): number {
    return this.strategy === Strategy.Runaway ? 5.0 : 3.75;
  }

  /**
   * Get lane threshold for spot struggle detection (in course width units)
   */
  getLaneThreshold(): number {
    return this.strategy === Strategy.Runaway ? 0.416 : 0.165;
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getSpeedBoost(): number {
    return this.state.isActive ? calculateSpotStruggleSpeedBoost(this.runnerGuts) : 0;
  }

  /**
   * Get HP consumption multiplier
   * Front Runner: 1.4x (3.6x if rushed)
   * Runaway: 3.5x (7.7x if rushed)
   */
  getHpConsumptionMultiplier(isRushed: boolean): number {
    if (!this.state.isActive) return 1.0;

    const baseMultiplier = this.strategy === Strategy.Runaway ? 3.5 : 1.4;
    return isRushed ? baseMultiplier * 2.2 : baseMultiplier;
  }

  getStartPosition(): number | null {
    return this.state.startPosition;
  }

  getEndPosition(): number | null {
    return this.state.endPosition;
  }
}
