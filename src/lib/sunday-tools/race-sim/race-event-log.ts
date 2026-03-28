import type { Race } from '../common/race';
import type { RaceEventBus } from '../common/race-events';
import type { Runner } from '../common/runner';

const TICKS_PER_SECOND = 15;

export type RaceEventKind =
  | 'skill-activated'
  | 'rushed'
  | 'dueling-start'
  | 'dueling-end'
  | 'spot-struggle-start'
  | 'spot-struggle-end'
  | 'last-spurt'
  | 'hp-out'
  | 'finished';

export type RaceEventDetail = {
  skillId?: string;
  otherRunnerIds?: number[];
  finishPlace?: number;
  finishTime?: number;
};

export type RaceEvent = {
  kind: RaceEventKind;
  runnerId: number;
  position: number;
  tick: number;
  detail?: RaceEventDetail;
};

type RunnerPreviousState = {
  isRushed: boolean;
  isDueling: boolean;
  inSpotStruggle: boolean;
  isLastSpurt: boolean;
  outOfHp: boolean;
  skillsActivatedCount: number;
  seenUsedSkills: Set<string>;
};

function cloneEventDetail(detail?: RaceEventDetail): RaceEventDetail | undefined {
  if (!detail) {
    return undefined;
  }

  return {
    skillId: detail.skillId,
    otherRunnerIds: detail.otherRunnerIds ? [...detail.otherRunnerIds] : undefined,
    finishPlace: detail.finishPlace,
    finishTime: detail.finishTime,
  };
}

function cloneEvent(event: RaceEvent): RaceEvent {
  return {
    kind: event.kind,
    runnerId: event.runnerId,
    position: event.position,
    tick: event.tick,
    detail: cloneEventDetail(event.detail),
  };
}

export class RaceEventLogCollector {
  private rounds: RaceEvent[][] = [];
  private currentRoundEvents: RaceEvent[] = [];
  private runnerStates = new Map<number, RunnerPreviousState>();

  public subscribe(bus: RaceEventBus): () => void {
    const unsubRoundStart = bus.on('round-start', (race, seed) => this.onRoundStart(race, seed));
    const unsubAfterRunnerTick = bus.on('after-runner-tick', (race, runner, dt) =>
      this.onAfterRunnerTick(race, runner, dt),
    );
    const unsubRunnerFinished = bus.on('runner-finished', (race, runner) =>
      this.onRunnerFinished(race, runner),
    );
    const unsubRoundEnd = bus.on('round-end', (race) => this.onRoundEnd(race));

    return () => {
      unsubRoundStart();
      unsubAfterRunnerTick();
      unsubRunnerFinished();
      unsubRoundEnd();
    };
  }

  public clear(): void {
    this.rounds = [];
    this.currentRoundEvents = [];
    this.runnerStates.clear();
  }

  public getResult(): RaceEvent[][] {
    return this.rounds.map((round) => round.map((event) => cloneEvent(event)));
  }

  private onRoundStart(_race: Race, _seed: number): void {
    this.currentRoundEvents = [];
    this.runnerStates.clear();
  }

  private onAfterRunnerTick(race: Race, runner: Runner, _dt: number): void {
    const previousState = this.ensureRunnerState(runner);
    const tick = this.getCurrentTick(race);
    const position = this.clampPosition(race, runner.position);

    if (!previousState.isRushed && runner.isRushed) {
      this.pushEvent({ kind: 'rushed', runnerId: runner.id, position, tick });
    }

    if (!previousState.isDueling && runner.isDueling) {
      this.pushEvent({
        kind: 'dueling-start',
        runnerId: runner.id,
        position,
        tick,
        detail: this.buildOtherRunnerDetail(
          this.collectOtherRunnerIdsInState(race, runner, (candidate) => candidate.isDueling),
        ),
      });
    }

    if (previousState.isDueling && !runner.isDueling) {
      this.pushEvent({
        kind: 'dueling-end',
        runnerId: runner.id,
        position,
        tick,
        detail: this.buildOtherRunnerDetail(
          this.collectOtherRunnerIdsInState(race, runner, (candidate) => candidate.isDueling),
        ),
      });
    }

    if (!previousState.inSpotStruggle && runner.inSpotStruggle) {
      this.pushEvent({
        kind: 'spot-struggle-start',
        runnerId: runner.id,
        position,
        tick,
        detail: this.buildOtherRunnerDetail(
          this.collectOtherRunnerIdsInState(race, runner, (candidate) => candidate.inSpotStruggle),
        ),
      });
    }

    if (previousState.inSpotStruggle && !runner.inSpotStruggle) {
      this.pushEvent({
        kind: 'spot-struggle-end',
        runnerId: runner.id,
        position,
        tick,
        detail: this.buildOtherRunnerDetail(
          this.collectOtherRunnerIdsInState(race, runner, (candidate) => candidate.inSpotStruggle),
        ),
      });
    }

    if (!previousState.isLastSpurt && runner.isLastSpurt) {
      this.pushEvent({ kind: 'last-spurt', runnerId: runner.id, position, tick });
    }

    if (!previousState.outOfHp && runner.outOfHp) {
      this.pushEvent({ kind: 'hp-out', runnerId: runner.id, position, tick });
    }

    if (runner.skillsActivatedCount > previousState.skillsActivatedCount) {
      const newSkillIds = this.collectNewSkillIds(runner, previousState);
      const activationDelta = runner.skillsActivatedCount - previousState.skillsActivatedCount;

      if (newSkillIds.length > 0) {
        for (const skillId of newSkillIds) {
          this.pushEvent({
            kind: 'skill-activated',
            runnerId: runner.id,
            position,
            tick,
            detail: { skillId },
          });
        }
      }

      const remainingActivations = Math.max(0, activationDelta - newSkillIds.length);
      for (let i = 0; i < remainingActivations; i += 1) {
        this.pushEvent({
          kind: 'skill-activated',
          runnerId: runner.id,
          position,
          tick,
        });
      }
    }

    previousState.isRushed = runner.isRushed;
    previousState.isDueling = runner.isDueling;
    previousState.inSpotStruggle = runner.inSpotStruggle;
    previousState.isLastSpurt = runner.isLastSpurt;
    previousState.outOfHp = runner.outOfHp;
    previousState.skillsActivatedCount = runner.skillsActivatedCount;

    for (const usedSkillId of runner.usedSkills) {
      previousState.seenUsedSkills.add(usedSkillId);
    }
  }

  private onRunnerFinished(race: Race, runner: Runner): void {
    const tick = this.getCurrentTick(race);
    const position = this.clampPosition(race, runner.position);
    const finishPlaceIndex = race.finishedRunners.indexOf(runner.id);
    const finishPlace = finishPlaceIndex >= 0 ? finishPlaceIndex + 1 : undefined;

    this.pushEvent({
      kind: 'finished',
      runnerId: runner.id,
      position,
      tick,
      detail: {
        finishPlace,
        finishTime: runner.finishTime,
      },
    });
  }

  private onRoundEnd(_race: Race): void {
    this.rounds.push(this.currentRoundEvents.map((event) => cloneEvent(event)));
  }

  private ensureRunnerState(runner: Runner): RunnerPreviousState {
    const existing = this.runnerStates.get(runner.id);
    if (existing) {
      return existing;
    }

    const created: RunnerPreviousState = {
      isRushed: false,
      isDueling: false,
      inSpotStruggle: false,
      isLastSpurt: false,
      outOfHp: false,
      skillsActivatedCount: 0,
      seenUsedSkills: new Set<string>(),
    };

    this.runnerStates.set(runner.id, created);
    return created;
  }

  private collectNewSkillIds(runner: Runner, previousState: RunnerPreviousState): string[] {
    const newSkillIds: string[] = [];
    for (const skillId of runner.usedSkills) {
      if (!previousState.seenUsedSkills.has(skillId)) {
        newSkillIds.push(skillId);
      }
    }
    return newSkillIds;
  }

  private getCurrentTick(race: Race): number {
    const tickOneBased = Math.round(race.accumulatedTime * TICKS_PER_SECOND);
    return Math.max(0, tickOneBased - 1);
  }

  private clampPosition(race: Race, position: number): number {
    return Math.min(position, race.course.distance);
  }

  private collectOtherRunnerIdsInState(
    race: Race,
    runner: Runner,
    isMatch: (candidate: Runner) => boolean,
  ): number[] {
    const ids: number[] = [];
    for (const candidate of race.runners.values()) {
      if (candidate.id === runner.id) {
        continue;
      }
      if (isMatch(candidate)) {
        ids.push(candidate.id);
      }
    }
    return ids;
  }

  private buildOtherRunnerDetail(otherRunnerIds: number[]): RaceEventDetail | undefined {
    if (otherRunnerIds.length === 0) {
      return undefined;
    }
    return { otherRunnerIds };
  }

  private pushEvent(event: RaceEvent): void {
    this.currentRoundEvents.push(cloneEvent(event));
  }
}
