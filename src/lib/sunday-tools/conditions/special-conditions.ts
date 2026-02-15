import { Strategy } from '../../lib/runner/definitions';
import { ApproximateMultiCondition, ApproximateStartContinue } from './ApproximateStartContinue';
import type { ConditionEntry, ConditionState } from './ApproximateStartContinue';

export function createBlockedSideCondition(): ApproximateMultiCondition {
  const conditions: Array<ConditionEntry> = [
    {
      condition: new ApproximateStartContinue('Outer lane', 0.0, 0.0),
      predicate: (state: ConditionState) => {
        const sim = state.runner;
        const section = Math.floor(sim.position / sim.sectionLength);
        const course = state.runner.race.course;
        return section >= 1 && section <= 3 && sim.currentLane > 3.0 * course.horseLane;
      },
    },
    {
      condition: new ApproximateStartContinue('Early race', 0.1, 0.85),
      predicate: (state: ConditionState) => state.runner.phase === 0,
    },
    {
      condition: new ApproximateStartContinue('Mid race', 0.08, 0.75),
      predicate: (state: ConditionState) => state.runner.phase === 1,
    },
    {
      condition: new ApproximateStartContinue('Other', 0.07, 0.5),
      predicate: null,
    },
  ];

  return new ApproximateMultiCondition('blocked_side', conditions, 1);
}

export function createOvertakeCondition(): ApproximateMultiCondition {
  const conditions: Array<ConditionEntry> = [
    {
      condition: new ApproximateStartContinue('逃げ', 0.05, 0.5),
      predicate: (state: ConditionState) => {
        return state.runner.strategy === Strategy.FrontRunner;
      },
    },
    {
      condition: new ApproximateStartContinue('先行', 0.15, 0.55),
      predicate: (state: ConditionState) => {
        return state.runner.strategy === Strategy.PaceChaser;
      },
    },
    {
      condition: new ApproximateStartContinue('その他', 0.2, 0.6),
      predicate: null,
    },
  ];

  return new ApproximateMultiCondition('overtake', conditions);
}
