import { calculateDuelingAccelBoost, calculateDuelingSpeedBoost } from '../../core/formulas';
import type { GameTimerManager, InGameTimer } from '../../utils/Timer';

export interface DuelingTarget {
  position: number;
  lane: number;
  speed: number;
}

export interface DuelingState {
  isActive: boolean;
  startPosition: number | null;
  endPosition: number | null;
  timer: InGameTimer;
  targets: Set<DuelingTarget>;
}

type DuelingManagerParameters = {
  runnerGuts: number;
  gameTimerManager: GameTimerManager;
};

export class DuelingManager {
  private state: DuelingState;
  private gameTimerManager: GameTimerManager;
  private runnerGuts: number;

  constructor(params: DuelingManagerParameters) {
    this.gameTimerManager = params.gameTimerManager;
    this.runnerGuts = params.runnerGuts;

    this.state = {
      isActive: false,
      startPosition: null,
      endPosition: null,
      timer: this.gameTimerManager.createTimer(0),
      targets: new Set(),
    };
  }

  /**
   * Update dueling state each frame
   * Only active on final straight
   */
  update(
    position: number,
    lane: number,
    speed: number,
    hpRatio: number,
    placement: number,
    totalUmas: number,
    isOnFinalStraight: boolean,
    nearbyUmas: Array<DuelingTarget>,
    dt: number,
  ): void {
    // Exit if HP below 5%
    if (this.state.isActive && hpRatio <= 0.05) {
      this.state.isActive = false;
      this.state.endPosition = position;
      this.state.targets.clear();
      return;
    }

    // Only on final straight
    if (!isOnFinalStraight) {
      this.state.timer.t = 0;
      this.state.targets.clear();
      return;
    }

    // Cannot trigger below 15% HP
    if (hpRatio < 0.15) {
      return;
    }

    // Find competition targets: abs(DistanceGap) < 3.0m, abs(LaneGap) < 0.25 CourseWidth
    const newTargets = nearbyUmas.filter(
      (uma) => Math.abs(uma.position - position) < 3.0 && Math.abs(uma.lane - lane) < 0.25,
    );

    // Reset if no targets
    if (newTargets.length === 0) {
      this.state.timer.t = 0;
      this.state.targets.clear();
      return;
    }

    this.state.targets = new Set(newTargets);
    this.state.timer.t += dt;

    // Already active - continue
    if (this.state.isActive) {
      return;
    }

    // Check trigger conditions:
    // - Target for 2+ seconds
    // - Top 50% placement
    // - Speed gap < 0.6 m/s with at least one target
    if (this.state.timer.t >= 2) {
      const isTop50 = placement <= Math.ceil(totalUmas / 2);
      const hasSpeedMatch = newTargets.some((target) => Math.abs(target.speed - speed) < 0.6);

      if (isTop50 && hasSpeedMatch) {
        this.state.isActive = true;
        this.state.startPosition = position;
      }
    }
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getSpeedBoost(): number {
    return this.state.isActive ? calculateDuelingSpeedBoost(this.runnerGuts) : 0;
  }

  getAccelBoost(): number {
    return this.state.isActive ? calculateDuelingAccelBoost(this.runnerGuts) : 0;
  }

  getStartPosition(): number | null {
    return this.state.startPosition;
  }

  getEndPosition(): number | null {
    return this.state.endPosition;
  }
}
