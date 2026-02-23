import { Strategy } from '../runner/definitions';
import { StrategyHelpers } from '../runner/runner.types';
import { PositionKeep } from '../shared/definitions';
import { PositionKeepState } from '../skills/definitions';
import type { IPositionKeepState } from '../skills/definitions';
import type { IStrategy } from '../runner/definitions';
import type { PRNG } from '../shared/random';

export type PositionKeepActivation = [number, number, IPositionKeepState];

type TimerLike = { t: number };
const VIRTUAL_MODE = 2;

type RaceLike = {
  course: { distance: number };
  settings: {
    mode: 'compare' | 'normal';
    positionKeepMode: number;
  };
  pacer?: RunnerLike;
  runners: Map<number, RunnerLike>;
};

export type RunnerLike = {
  race: RaceLike;
  strategy: IStrategy;
  position: number;
  sectionLength: number;
  isRushed: boolean;
  positionKeepStrategy: IStrategy;
  adjustedStats: { wit: number };
  targetSpeedSkillsActive: Array<unknown>;
  currentSpeedSkillsActive: Array<unknown>;
  posKeepRng: PRNG;
  positionKeepState: IPositionKeepState;
  posKeepSpeedCoef: number;
  posKeepNextTimer: TimerLike;
  posKeepExitDistance: number;
  posKeepExitPosition: number;
  posKeepMinThreshold: number;
  posKeepMaxThreshold: number;
  posKeepEnd: number;
  positionKeepActivations: Array<PositionKeepActivation>;
};

export function speedUpOvertakeWitCheck(runner: RunnerLike): boolean {
  if (runner.isRushed) {
    return true;
  }

  return runner.posKeepRng.random() < 0.2 * Math.log10(0.1 * runner.adjustedStats.wit);
}

export function paceUpWitCheck(runner: RunnerLike): boolean {
  if (runner.isRushed) {
    return true;
  }

  return runner.posKeepRng.random() < 0.15 * Math.log10(0.1 * runner.adjustedStats.wit);
}

export function updatePositionKeepCoefficient(runner: RunnerLike): void {
  switch (runner.positionKeepState) {
    case PositionKeepState.SpeedUp:
      runner.posKeepSpeedCoef = 1.04;
      break;
    case PositionKeepState.Overtake:
      runner.posKeepSpeedCoef = 1.05;
      break;
    case PositionKeepState.PaceUp:
      runner.posKeepSpeedCoef = 1.04;
      break;
    case PositionKeepState.PaceDown:
      runner.posKeepSpeedCoef = 0.915; // 0.945x in mid-race post 1st-anniversary
      break;
    default:
      runner.posKeepSpeedCoef = 1.0;
      break;
  }
}

export function calculatePosKeepEnd(runner: Pick<RunnerLike, 'race' | 'sectionLength'>): number {
  const multiplier = runner.race.settings.mode === 'compare' ? 10.0 : 3.0;
  return runner.sectionLength * multiplier;
}

export function initializePositionKeep(runner: RunnerLike, createTimer: () => TimerLike): void {
  runner.positionKeepState = PositionKeepState.None;
  runner.posKeepNextTimer = createTimer();
  runner.posKeepSpeedCoef = 1.0;
  runner.posKeepExitDistance = 0.0;
  runner.posKeepExitPosition = 0.0;
  runner.posKeepMinThreshold = PositionKeep.minThreshold(runner.strategy, runner.race.course.distance);
  runner.posKeepMaxThreshold = PositionKeep.maxThreshold(runner.strategy, runner.race.course.distance);
  runner.positionKeepActivations = [];
  runner.posKeepEnd = calculatePosKeepEnd(runner);
}

export function exitPositionKeep(runner: RunnerLike, nextTimerValue?: number): void {
  if (runner.positionKeepState !== PositionKeepState.None && runner.positionKeepActivations.length > 0) {
    runner.positionKeepActivations[runner.positionKeepActivations.length - 1][1] = runner.position;
  }

  runner.positionKeepState = PositionKeepState.None;

  if (nextTimerValue !== undefined) {
    runner.posKeepNextTimer.t = nextTimerValue;
  }
}

export function getUmaByDistanceDescending(runner: RunnerLike): Array<RunnerLike> {
  return Array.from(runner.race.runners.values()).sort((a, b) => b.position - a.position);
}

export function applyVirtualPositionKeep(runner: RunnerLike): void {
  if (runner.race.settings.positionKeepMode !== VIRTUAL_MODE) {
    exitPositionKeep(runner);
    return;
  }

  if (runner.position >= runner.posKeepEnd) {
    exitPositionKeep(runner);
    return;
  }

  if (!runner.race.pacer || runner.race.runners.size < 2) {
    return;
  }

  const pacer = runner.race.pacer;
  const behind = pacer.position - runner.position;
  const myStrategy = runner.positionKeepStrategy;

  switch (runner.positionKeepState) {
    case PositionKeepState.None:
      if (runner.posKeepNextTimer.t < 0) {
        return;
      }

      if (StrategyHelpers.strategyMatches(myStrategy, Strategy.FrontRunner)) {
        if (pacer === runner) {
          const umas = getUmaByDistanceDescending(runner);
          const secondPlaceUma = umas[1];
          if (!secondPlaceUma) {
            return;
          }
          const distanceAhead = pacer.position - secondPlaceUma.position;
          const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

          if (runner.posKeepNextTimer.t < 0) {
            return;
          }

          if (distanceAhead < threshold && speedUpOvertakeWitCheck(runner)) {
            runner.positionKeepActivations.push([runner.position, 0, PositionKeepState.SpeedUp]);
            runner.positionKeepState = PositionKeepState.SpeedUp;
            runner.posKeepExitPosition =
              runner.position +
              Math.floor(runner.sectionLength) * (runner.positionKeepStrategy === Strategy.Runaway ? 3 : 1);
          }
        } else if (speedUpOvertakeWitCheck(runner)) {
          runner.positionKeepState = PositionKeepState.Overtake;
          runner.positionKeepActivations.push([runner.position, 0, PositionKeepState.Overtake]);
        }
      } else {
        if (behind > runner.posKeepMaxThreshold) {
          if (paceUpWitCheck(runner)) {
            runner.positionKeepState = PositionKeepState.PaceUp;
            runner.positionKeepActivations.push([runner.position, 0, PositionKeepState.PaceUp]);
            runner.posKeepExitDistance =
              runner.posKeepRng.random() * (runner.posKeepMaxThreshold - runner.posKeepMinThreshold) +
              runner.posKeepMinThreshold;
          }
        } else if (behind < runner.posKeepMinThreshold) {
          if (
            runner.targetSpeedSkillsActive.length === 0 &&
            runner.currentSpeedSkillsActive.length === 0
          ) {
            runner.positionKeepState = PositionKeepState.PaceDown;
            runner.positionKeepActivations.push([runner.position, 0, PositionKeepState.PaceDown]);
            runner.posKeepExitDistance =
              runner.posKeepRng.random() * (runner.posKeepMaxThreshold - runner.posKeepMinThreshold) +
              runner.posKeepMinThreshold;
          }
        }
      }

      if (runner.positionKeepState === PositionKeepState.None) {
        runner.posKeepNextTimer.t = -2;
      } else {
        runner.posKeepExitPosition =
          runner.position +
          Math.floor(runner.sectionLength) * (runner.positionKeepStrategy === Strategy.Runaway ? 3 : 1);
      }

      break;
    case PositionKeepState.SpeedUp:
      if (runner.position >= runner.posKeepExitPosition) {
        exitPositionKeep(runner, -3);
      } else if (pacer === runner) {
        const umas = getUmaByDistanceDescending(runner);
        const secondPlaceUma = umas[1];
        if (!secondPlaceUma) {
          return;
        }
        const distanceAhead = pacer.position - secondPlaceUma.position;
        const threshold = myStrategy === Strategy.Runaway ? 17.5 : 4.5;

        if (distanceAhead >= threshold) {
          exitPositionKeep(runner, -3);
        }
      }

      break;
    case PositionKeepState.Overtake:
      if (runner.position >= runner.posKeepExitPosition) {
        exitPositionKeep(runner, -3);
      } else if (pacer === runner) {
        const umas = getUmaByDistanceDescending(runner);
        const secondPlaceUma = umas[1];
        if (!secondPlaceUma) {
          return;
        }
        const distanceAhead = runner.position - secondPlaceUma.position;
        const threshold = myStrategy === Strategy.Runaway ? 27.5 : 10;

        if (distanceAhead >= threshold) {
          exitPositionKeep(runner, -3);
        }
      }

      break;
    case PositionKeepState.PaceUp:
      if (runner.position >= runner.posKeepExitPosition) {
        exitPositionKeep(runner, -3);
      } else if (behind < runner.posKeepExitDistance) {
        exitPositionKeep(runner, -3);
      }

      break;
    case PositionKeepState.PaceDown:
      if (runner.position >= runner.posKeepExitPosition) {
        exitPositionKeep(runner, -3);
      } else if (
        behind > runner.posKeepExitDistance ||
        runner.targetSpeedSkillsActive.length > 0 ||
        runner.currentSpeedSkillsActive.length > 0
      ) {
        exitPositionKeep(runner, -3);
      }

      break;
    default:
      break;
  }
}
