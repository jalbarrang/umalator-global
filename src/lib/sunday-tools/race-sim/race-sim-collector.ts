import type { RaceEventBus } from '../common/race-events';
import type { Race } from '../common/race';
import type { Runner } from '../common/runner';
import { VacuumCompareDataCollector, type CollectedRunnerRoundData } from '../common/race-observer';
import type { FinishEntry } from './run-race-sim';

type PositionOnlyRoundData = {
  positions: number[];
  lanes: number[];
};

export type RaceSimCollectedRound = {
  seed: number;
  finishOrder: FinishEntry[];
  focusRunnerData: Record<number, CollectedRunnerRoundData>;
  allRunnerPositions: Record<number, number[]>;
  allRunnerLanes: Record<number, number[]>;
};

export type RaceSimCollectedResult = {
  rounds: RaceSimCollectedRound[];
};

function cloneSkillActivationMap(
  map: Record<string, CollectedRunnerRoundData['skillActivations'][string]>,
): Record<string, CollectedRunnerRoundData['skillActivations'][string]> {
  const cloned: Record<string, CollectedRunnerRoundData['skillActivations'][string]> = {};
  for (const [skillId, logs] of Object.entries(map)) {
    cloned[skillId] = logs.map((log) => ({ ...log }));
  }
  return cloned;
}

function cloneRegionArray(regions: Array<[number, number]>): Array<[number, number]> {
  return regions.map(([start, end]) => [start, end]);
}

function cloneCollectedRunnerRoundData(data: CollectedRunnerRoundData): CollectedRunnerRoundData {
  return {
    runnerId: data.runnerId,
    time: [...data.time],
    position: [...data.position],
    velocity: [...data.velocity],
    hp: [...data.hp],
    currentLane: [...data.currentLane],
    pacerGap: [...data.pacerGap],
    skillActivations: cloneSkillActivationMap(data.skillActivations),
    startDelay: data.startDelay,
    rushed: cloneRegionArray(data.rushed),
    duelingRegion:
      Array.isArray(data.duelingRegion) && data.duelingRegion.length === 2
        ? ([...data.duelingRegion] as [number, number])
        : [],
    spotStruggleRegion:
      Array.isArray(data.spotStruggleRegion) && data.spotStruggleRegion.length === 2
        ? ([...data.spotStruggleRegion] as [number, number])
        : [],
    hasAchievedFullSpurt: data.hasAchievedFullSpurt,
    outOfHp: data.outOfHp,
    outOfHpPosition: data.outOfHpPosition,
    nonFullSpurtVelocityDiff: data.nonFullSpurtVelocityDiff,
    nonFullSpurtDelayDistance: data.nonFullSpurtDelayDistance,
    firstPositionInLateRace: data.firstPositionInLateRace,
    usedSkills: [...data.usedSkills],
    finished: data.finished,
    finishPosition: data.finishPosition,
  };
}

function cloneFocusRunnerDataRecord(
  record: Record<number, CollectedRunnerRoundData>,
): Record<number, CollectedRunnerRoundData> {
  const cloned: Record<number, CollectedRunnerRoundData> = {};
  for (const [runnerId, data] of Object.entries(record)) {
    cloned[Number(runnerId)] = cloneCollectedRunnerRoundData(data);
  }
  return cloned;
}

function cloneAllRunnerPositionsRecord(record: Record<number, number[]>): Record<number, number[]> {
  const cloned: Record<number, number[]> = {};
  for (const [runnerId, positions] of Object.entries(record)) {
    cloned[Number(runnerId)] = [...positions];
  }
  return cloned;
}

function cloneAllRunnerLanesRecord(record: Record<number, number[]>): Record<number, number[]> {
  const cloned: Record<number, number[]> = {};
  for (const [runnerId, lanes] of Object.entries(record)) {
    cloned[Number(runnerId)] = [...lanes];
  }
  return cloned;
}

export class RaceSimDataCollector {
  private readonly focusRunnerIds: Set<number>;
  private readonly focusCollectors = new Map<number, VacuumCompareDataCollector>();

  // Per-round state (reset on round-start)
  private currentRoundSeed = 0;
  private readonly currentRoundFullData = new Map<number, CollectedRunnerRoundData>();
  private readonly currentRoundPositionData = new Map<number, PositionOnlyRoundData>();
  private currentRoundFinishOrder: FinishEntry[] = [];

  // Accumulated across rounds
  private rounds: RaceSimCollectedRound[] = [];

  constructor(focusRunnerIds: number[] = []) {
    this.focusRunnerIds = new Set(focusRunnerIds);
  }

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
    this.resetRoundState();
  }

  public getResult(): RaceSimCollectedResult {
    return {
      rounds: this.rounds.map((round) => ({
        seed: round.seed,
        finishOrder: round.finishOrder.map((entry) => ({ ...entry })),
        focusRunnerData: cloneFocusRunnerDataRecord(round.focusRunnerData),
        allRunnerPositions: cloneAllRunnerPositionsRecord(round.allRunnerPositions),
        allRunnerLanes: cloneAllRunnerLanesRecord(round.allRunnerLanes),
      })),
    };
  }

  private onRoundStart(race: Race, seed: number): void {
    this.resetRoundState();
    this.currentRoundSeed = seed;

    this.focusCollectors.clear();
    for (const runnerId of this.focusRunnerIds) {
      const collector = new VacuumCompareDataCollector();
      collector.onRoundStart(race, seed);
      this.focusCollectors.set(runnerId, collector);
    }
  }

  private onAfterRunnerTick(race: Race, runner: Runner, dt: number): void {
    const focusCollector = this.focusCollectors.get(runner.id);
    if (focusCollector) {
      focusCollector.onAfterRunnerTick(race, runner, dt);
      return;
    }

    const positionOnlyData = this.ensurePositionOnlyState(runner.id);
    positionOnlyData.positions.push(runner.position);
    positionOnlyData.lanes.push(runner.currentLane);
  }

  private onRunnerFinished(race: Race, runner: Runner): void {
    this.currentRoundFinishOrder.push({
      runnerId: runner.id,
      name: runner.name,
      strategy: runner.strategy,
      finishPosition: Math.min(runner.position, race.course.distance),
      finishTime: runner.finishTime,
    });

    const focusCollector = this.focusCollectors.get(runner.id);
    if (focusCollector) {
      focusCollector.onRunnerFinished(race, runner);
      return;
    }

    const positionOnlyData = this.ensurePositionOnlyState(runner.id);
    const finishPosition = Math.min(runner.position, race.course.distance);
    if (positionOnlyData.positions.at(-1) !== finishPosition) {
      positionOnlyData.positions.push(finishPosition);
      positionOnlyData.lanes.push(runner.currentLane);
    }
  }

  private onRoundEnd(race: Race): void {
    this.currentRoundFullData.clear();

    for (const [runnerId, collector] of this.focusCollectors.entries()) {
      collector.onRoundEnd(race);
      const runnerData = collector.getRunnerRoundData(runnerId);
      if (runnerData) {
        this.currentRoundFullData.set(runnerId, runnerData);
      }
    }

    // Ensure every non-focus runner with position samples has a finish entry fallback.
    for (const [runnerId, positionData] of this.currentRoundPositionData.entries()) {
      if (positionData.positions.length === 0) {
        continue;
      }
      if (this.currentRoundFinishOrder.some((entry) => entry.runnerId === runnerId)) {
        continue;
      }

      const runner = race.runners.get(runnerId);
      if (!runner) {
        continue;
      }

      this.currentRoundFinishOrder.push({
        runnerId,
        name: runner.name,
        strategy: runner.strategy,
        finishPosition: Math.min(runner.position, race.course.distance),
        finishTime: runner.finishTime,
      });
    }

    const focusRunnerData: Record<number, CollectedRunnerRoundData> = {};
    const allRunnerPositions: Record<number, number[]> = {};
    const allRunnerLanes: Record<number, number[]> = {};

    for (const [runnerId, data] of this.currentRoundFullData.entries()) {
      focusRunnerData[runnerId] = cloneCollectedRunnerRoundData(data);
      allRunnerPositions[runnerId] = [...data.position];
      allRunnerLanes[runnerId] = [...data.currentLane];
    }

    for (const [runnerId, positionData] of this.currentRoundPositionData.entries()) {
      if (positionData.positions.length === 0) {
        continue;
      }
      if (allRunnerPositions[runnerId]) {
        continue;
      }
      allRunnerPositions[runnerId] = [...positionData.positions];
      allRunnerLanes[runnerId] = [...positionData.lanes];
    }

    this.rounds.push({
      seed: this.currentRoundSeed,
      finishOrder: this.currentRoundFinishOrder.map((entry) => ({ ...entry })),
      focusRunnerData,
      allRunnerPositions,
      allRunnerLanes,
    });
  }

  private ensurePositionOnlyState(runnerId: number): PositionOnlyRoundData {
    const existing = this.currentRoundPositionData.get(runnerId);
    if (existing) {
      return existing;
    }

    const created: PositionOnlyRoundData = { positions: [], lanes: [] };
    this.currentRoundPositionData.set(runnerId, created);
    return created;
  }

  private resetRoundState(): void {
    this.currentRoundSeed = 0;
    this.currentRoundFullData.clear();
    this.currentRoundPositionData.clear();
    this.currentRoundFinishOrder = [];
  }
}
