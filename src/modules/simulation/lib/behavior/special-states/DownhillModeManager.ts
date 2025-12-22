import { calculateDownhillSpeedBoost } from '../../core/formulas';
import type { CourseData } from '../../core/types';
import type { PRNG } from '../../utils/Random';

export interface DownhillState {
  isDownhillMode: boolean;
  downhillModeStart: number | null; // Frame when started
  lastCheckFrame: number; // Last frame checked
}

type DownhillModeManagerParameters = {
  rng: PRNG;
  syncRng: PRNG;
  disabled: boolean;
  runnerWit: number;
  useVirtualPacer: boolean;
};

export class DownhillModeManager {
  private state: DownhillState;
  private rng: PRNG;
  private syncRng: PRNG; // For virtual pacemaker synchronization
  private disabled: boolean;
  private runnerWit: number;
  private useVirtualPacer: boolean;

  constructor(params: DownhillModeManagerParameters) {
    this.rng = params.rng;
    this.syncRng = params.syncRng;
    this.runnerWit = params.runnerWit;
    this.disabled = params.disabled;
    this.useVirtualPacer = params.useVirtualPacer;
    this.state = {
      isDownhillMode: false,
      downhillModeStart: null,
      lastCheckFrame: 0,
    };
  }

  /**
   * Update downhill mode (checked once per second)
   */
  update(position: number, accumulatedTime: number, course: CourseData): void {
    // Check once per second (at frame 14 of each second, 15 FPS)
    const currentFrame = Math.floor(accumulatedTime * 15);
    const changeSecond = currentFrame % 15 === 14;

    if (!changeSecond || currentFrame === this.state.lastCheckFrame) {
      return; // Not time to check yet
    }

    this.state.lastCheckFrame = currentFrame;

    // Check if on downhill slope (>1.0% grade, slope < -100)
    const currentSlope = course.slopes.find(
      (s) => position >= s.start && position <= s.start + s.length,
    );
    const isOnDownhill = currentSlope && currentSlope.slope < -100;

    if (!this.disabled && isOnDownhill) {
      // Use sync RNG for virtual pacemaker to keep it synchronized
      const rng = this.useVirtualPacer ? this.syncRng.random() : this.rng.random();

      if (this.state.downhillModeStart === null) {
        // Entry check: Wisdom * 0.04% chance per second
        if (rng < this.runnerWit * 0.0004) {
          this.state.downhillModeStart = currentFrame;
          this.state.isDownhillMode = true;
        }
      } else {
        // Exit check: 20% chance per second
        if (rng < 0.2) {
          this.state.downhillModeStart = null;
          this.state.isDownhillMode = false;
        }
      }
    } else {
      // Not on downhill, exit immediately
      if (this.state.isDownhillMode) {
        this.state.downhillModeStart = null;
        this.state.isDownhillMode = false;
      }
    }
  }

  /**
   * Get speed boost if in downhill mode
   * Must be called with current slope info
   */
  getSpeedBoost(currentSlope: { slope: number } | undefined): number {
    if (!this.state.isDownhillMode || !currentSlope) {
      return 0;
    }

    return calculateDownhillSpeedBoost(currentSlope.slope / 100);
  }

  /**
   * Get HP consumption multiplier (0.4x when active)
   */
  getHpConsumptionMultiplier(): number {
    return this.state.isDownhillMode ? 0.4 : 1.0;
  }

  isActive(): boolean {
    return this.state.isDownhillMode;
  }
}
