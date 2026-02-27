import type {
  SkillEffectLog,
  SkillSimulationRun,
  SkillTrackedMeta,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import {
  isSameSkill,
  getSkillEffectMetadata,
} from '@/modules/simulation/simulators/shared';
import {
  SkillTarget,
  SkillType,
  type ISkillPerspective,
  type ISkillTarget,
  type ISkillType,
} from '../skills/definitions';
import type { ActiveSkill } from '../skills/skill.types';
import type { Race, RaceLifecycleObserver } from './race';
import type { Runner } from './runner';

type ActiveEffectLike = Pick<ActiveSkill, 'skillId' | 'effectType' | 'effectTarget' | 'modifier'>;

const PERSPECTIVE_SELF: ISkillPerspective = 1;
const ACTIVE_EFFECT_TYPES = new Set<ISkillType>([
  SkillType.TargetSpeed,
  SkillType.Accel,
  SkillType.LaneMovementSpeed,
  SkillType.CurrentSpeed,
  SkillType.CurrentSpeedWithNaturalDeceleration,
  SkillType.ChangeLane,
]);

function cloneSkillActivationMap(
  map: Record<string, Array<SkillEffectLog>>,
): Record<string, Array<SkillEffectLog>> {
  const cloned: Record<string, Array<SkillEffectLog>> = {};
  for (const [skillId, logs] of Object.entries(map)) {
    cloned[skillId] = logs.map((log) => ({ ...log }));
  }
  return cloned;
}

function cloneRegionArray(regions: Array<[number, number]>): Array<[number, number]> {
  return regions.map(([start, end]) => [start, end]);
}

export type CollectedRunnerRoundData = {
  runnerId: number;
  time: Array<number>;
  position: Array<number>;
  velocity: Array<number>;
  hp: Array<number>;
  currentLane: Array<number>;
  pacerGap: Array<number>;
  skillActivations: Record<string, Array<SkillEffectLog>>;
  startDelay: number;
  rushed: Array<[number, number]>;
  duelingRegion: [number, number] | [];
  spotStruggleRegion: [number, number] | [];
  hasAchievedFullSpurt: boolean;
  outOfHp: boolean;
  outOfHpPosition: number | null;
  nonFullSpurtVelocityDiff: number | null;
  nonFullSpurtDelayDistance: number | null;
  firstPositionInLateRace: boolean;
  usedSkills: Array<string>;
  finished: boolean;
  finishPosition: number;
};

type RunnerCollectorState = {
  data: CollectedRunnerRoundData;
  openEffectsByKey: Map<string, Array<SkillEffectLog>>;
  effectSequence: number;
  seenUsedSkills: Set<string>;
};

export type VacuumCompareDataCollectorProps = {};

export class VacuumCompareDataCollector implements RaceLifecycleObserver {
  protected currentSeed = 0;
  protected primaryRunnerId: number | null = null;
  protected runnerStates = new Map<number, RunnerCollectorState>();

  constructor(_props: VacuumCompareDataCollectorProps = {}) {}

  public onRoundStart(_race: Race, seed: number): void {
    this.currentSeed = seed;
    this.primaryRunnerId = null;
    this.runnerStates.clear();
  }

  public onBeforeTick(_race: Race, _dt: number): void {}

  public onAfterRunnerTick(race: Race, runner: Runner, _dt: number): void {
    const state = this.ensureRunnerState(runner);
    this.captureFrame(race, runner, state.data);
    this.reconcileActiveEffects(race, runner, state);
    this.captureUsedSkillActivations(runner, state, race.course.distance);
  }

  public onRunnerFinished(race: Race, runner: Runner): void {
    const state = this.ensureRunnerState(runner);
    this.closeOpenEffects(state, Math.min(runner.position, race.course.distance));
    this.captureFinishSnapshot(runner, state.data, race.course.distance);
  }

  public onRoundEnd(race: Race): void {
    for (const state of this.runnerStates.values()) {
      if (!state.data.finished) {
        this.closeOpenEffects(state, race.course.distance);
      }
    }
  }

  public getPrimaryRunnerRoundData(): CollectedRunnerRoundData | null {
    if (this.primaryRunnerId == null) {
      return null;
    }
    const state = this.runnerStates.get(this.primaryRunnerId);
    if (!state) {
      return null;
    }
    return this.cloneRunnerData(state.data);
  }

  public getRunnerRoundData(runnerId: number): CollectedRunnerRoundData | null {
    const state = this.runnerStates.get(runnerId);
    if (!state) {
      return null;
    }
    return this.cloneRunnerData(state.data);
  }

  public getRunnerIds(): Array<number> {
    return Array.from(this.runnerStates.keys());
  }

  private ensureRunnerState(runner: Runner): RunnerCollectorState {
    const existing = this.runnerStates.get(runner.id);
    if (existing) {
      return existing;
    }

    if (this.primaryRunnerId == null) {
      this.primaryRunnerId = runner.id;
    }

    const state: RunnerCollectorState = {
      data: {
        runnerId: runner.id,
        time: [],
        position: [],
        velocity: [],
        hp: [],
        currentLane: [],
        pacerGap: [],
        skillActivations: {},
        startDelay: runner.startDelay,
        rushed: [],
        duelingRegion: [],
        spotStruggleRegion: [],
        hasAchievedFullSpurt: false,
        outOfHp: false,
        outOfHpPosition: null,
        nonFullSpurtVelocityDiff: null,
        nonFullSpurtDelayDistance: null,
        firstPositionInLateRace: false,
        usedSkills: [],
        finished: false,
        finishPosition: 0,
      },
      openEffectsByKey: new Map(),
      effectSequence: 0,
      seenUsedSkills: new Set(),
    };

    this.runnerStates.set(runner.id, state);
    return state;
  }

  private captureFrame(race: Race, runner: Runner, data: CollectedRunnerRoundData): void {
    data.time.push(runner.accumulateTime.t);
    data.position.push(runner.position);
    data.velocity.push(runner.currentSpeed + runner.modifiers.currentSpeed.acc + runner.modifiers.currentSpeed.err);
    data.hp.push(runner.healthPolicy.currentHealth);
    data.currentLane.push(runner.currentLane);

    if (race.pacer) {
      data.pacerGap.push(race.pacer.position - runner.position);
    } else {
      data.pacerGap.push(0);
    }
  }

  private collectActiveEffects(runner: Runner): Array<ActiveEffectLike> {
    const all: Array<ActiveEffectLike> = [];
    const buckets: Array<Array<ActiveEffectLike>> = [
      runner.targetSpeedSkillsActive,
      runner.currentSpeedSkillsActive,
      runner.accelerationSkillsActive,
      runner.laneMovementSkillsActive,
      runner.changeLaneSkillsActive,
    ];

    for (const bucket of buckets) {
      for (const effect of bucket) {
        all.push(effect);
      }
    }

    return all;
  }

  private reconcileActiveEffects(race: Race, runner: Runner, state: RunnerCollectorState): void {
    const currentPosition = Math.min(runner.position, race.course.distance);
    const effects = this.collectActiveEffects(runner);
    const counts = new Map<
      string,
      { count: number; skillId: string; effectType: ISkillType; effectTarget: ISkillTarget }
    >();

    for (const effect of effects) {
      const key = `${effect.skillId}:${effect.effectType}:${effect.effectTarget}:${effect.modifier.toFixed(6)}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          count: 1,
          skillId: effect.skillId,
          effectType: effect.effectType,
          effectTarget: effect.effectTarget,
        });
      }
    }

    for (const [key, current] of counts.entries()) {
      const openLogs = state.openEffectsByKey.get(key) ?? [];
      while (openLogs.length < current.count) {
        const skillId = current.skillId;
        const logs = state.data.skillActivations[skillId] ?? [];
        const log: SkillEffectLog = {
          executionId: `${this.currentSeed}-${runner.id}-${state.effectSequence++}`,
          skillId,
          start: currentPosition,
          end: currentPosition,
          perspective: PERSPECTIVE_SELF,
          effectType: current.effectType,
          effectTarget: current.effectTarget,
        };
        logs.push(log);
        state.data.skillActivations[skillId] = logs;
        openLogs.push(log);
      }
      state.openEffectsByKey.set(key, openLogs);
    }

    for (const [key, openLogs] of state.openEffectsByKey.entries()) {
      const expectedCount = counts.get(key)?.count ?? 0;
      while (openLogs.length > expectedCount) {
        const log = openLogs.pop();
        if (log) {
          log.end = currentPosition;
        }
      }
      if (openLogs.length === 0) {
        state.openEffectsByKey.delete(key);
      }
    }
  }

  private captureUsedSkillActivations(
    runner: Runner,
    state: RunnerCollectorState,
    courseDistance: number,
  ): void {
    const activationPosition = Math.min(runner.position, courseDistance);
    for (const usedSkillId of runner.usedSkills) {
      if (state.seenUsedSkills.has(usedSkillId)) {
        continue;
      }

      state.seenUsedSkills.add(usedSkillId);
      state.data.usedSkills.push(usedSkillId);

      const effects = getSkillEffectMetadata(usedSkillId);
      const staticEffects = effects.filter((effect) => !ACTIVE_EFFECT_TYPES.has(effect.effectType));

      if (staticEffects.length === 0) {
        continue;
      }

      const logs = state.data.skillActivations[usedSkillId] ?? [];
      for (const effect of staticEffects) {
        logs.push({
          executionId: `${this.currentSeed}-${runner.id}-${state.effectSequence++}`,
          skillId: usedSkillId,
          start: activationPosition,
          end: activationPosition,
          perspective: PERSPECTIVE_SELF,
          effectType: effect.effectType,
          effectTarget: effect.effectTarget,
        });
      }
      state.data.skillActivations[usedSkillId] = logs;
    }
  }

  private closeOpenEffects(state: RunnerCollectorState, position: number): void {
    for (const logs of state.openEffectsByKey.values()) {
      while (logs.length > 0) {
        const log = logs.pop();
        if (log) {
          log.end = position;
        }
      }
    }
    state.openEffectsByKey.clear();
  }

  private captureFinishSnapshot(
    runner: Runner,
    data: CollectedRunnerRoundData,
    courseDistance: number,
  ): void {
    data.startDelay = runner.startDelay;
    data.rushed = cloneRegionArray(runner.rushedActivations);
    data.duelingRegion =
      runner.duelingStartPosition >= 0
        ? [runner.duelingStartPosition, runner.duelingEndPosition >= 0 ? runner.duelingEndPosition : courseDistance]
        : [];
    data.spotStruggleRegion =
      runner.spotStruggleStartPosition != null
        ? [runner.spotStruggleStartPosition, runner.spotStruggleEndPosition >= 0 ? runner.spotStruggleEndPosition : courseDistance]
        : [];
    data.hasAchievedFullSpurt = runner.hasAchievedFullSpurt;
    data.outOfHp = runner.outOfHp;
    data.outOfHpPosition = runner.outOfHpPosition;
    data.nonFullSpurtVelocityDiff = runner.nonFullSpurtVelocityDiff;
    data.nonFullSpurtDelayDistance = runner.nonFullSpurtDelayDistance;
    data.firstPositionInLateRace = runner.firstPositionInLateRace;
    data.finished = true;
    data.finishPosition = Math.min(runner.position, courseDistance);
  }

  private cloneRunnerData(data: CollectedRunnerRoundData): CollectedRunnerRoundData {
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
      duelingRegion: Array.isArray(data.duelingRegion) && data.duelingRegion.length === 2 ? [...data.duelingRegion] as [number, number] : [],
      spotStruggleRegion:
        Array.isArray(data.spotStruggleRegion) && data.spotStruggleRegion.length === 2
          ? [...data.spotStruggleRegion] as [number, number]
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
}

export type SkillCompareDataCollectorProps = {
  trackedSkillId: string;
  fallbackEffectType?: ISkillType;
  fallbackEffectTarget?: ISkillTarget;
};

export class SkillCompareDataCollector extends VacuumCompareDataCollector {
  private readonly trackedSkillId: string;
  private readonly fallbackEffectType: ISkillType;
  private readonly fallbackEffectTarget: ISkillTarget;
  private readonly trackedMetaCollection: Array<SkillTrackedMeta> = [];
  private currentRoundTrackedLogs: Array<SkillEffectLog> = [];

  constructor(props: SkillCompareDataCollectorProps) {
    super();
    this.trackedSkillId = props.trackedSkillId;
    this.fallbackEffectType = props.fallbackEffectType ?? SkillType.Noop;
    this.fallbackEffectTarget = props.fallbackEffectTarget ?? SkillTarget.Self;
  }

  public override onRoundStart(race: Race, seed: number): void {
    super.onRoundStart(race, seed);
    this.currentRoundTrackedLogs = [];
  }

  public resetTrackedCollection(): void {
    this.trackedMetaCollection.length = 0;
  }

  public getTrackedMetaCollection(): SkillTrackedMetaCollection {
    return this.trackedMetaCollection.map((meta) => ({
      horseLength: meta.horseLength,
      positions: [...meta.positions],
    }));
  }

  public buildCurrentSkillRun(): SkillSimulationRun {
    const logs = this.currentRoundTrackedLogs;
    if (logs.length === 0) {
      return { sk: [{}, {}] };
    }
    return {
      sk: [{}, { [this.trackedSkillId]: logs }],
    };
  }

  public finalizeCurrentTrackedMeta(horseLength: number): void {
    const runnerData = this.getPrimaryRunnerRoundData();
    if (!runnerData) {
      return;
    }

    const trackedLogs = this.getCurrentTrackedLogs();
    const trackedUsed = runnerData.usedSkills.some((usedSkillId) =>
      isSameSkill(usedSkillId, this.trackedSkillId),
    );

    const logs = trackedLogs.length > 0 ? trackedLogs : this.buildFallbackLogsIfNeeded(runnerData, trackedUsed);
    this.currentRoundTrackedLogs = logs.map((log) => ({ ...log }));
    const positions = this.extractUniquePositions(logs);

    if (!trackedUsed && positions.length === 0) {
      return;
    }

    this.trackedMetaCollection.push({
      horseLength,
      positions,
    });
  }

  private getCurrentTrackedLogs(): Array<SkillEffectLog> {
    const runnerData = this.getPrimaryRunnerRoundData();
    if (!runnerData) {
      return [];
    }

    const matchingLogs: Array<SkillEffectLog> = [];
    for (const [skillId, logs] of Object.entries(runnerData.skillActivations)) {
      if (!isSameSkill(skillId, this.trackedSkillId)) {
        continue;
      }
      for (const log of logs) {
        matchingLogs.push({ ...log, skillId: this.trackedSkillId });
      }
    }

    return matchingLogs;
  }

  private buildFallbackLogsIfNeeded(
    runnerData: CollectedRunnerRoundData,
    trackedUsed: boolean,
  ): Array<SkillEffectLog> {
    if (!trackedUsed) {
      return [];
    }

    const activationPosition =
      runnerData.position.length > 0
        ? Math.min(runnerData.position[runnerData.position.length - 1], runnerData.finishPosition)
        : runnerData.finishPosition;

    return [
      {
        executionId: `${this.currentSeed}-${runnerData.runnerId}-fallback`,
        skillId: this.trackedSkillId,
        start: activationPosition,
        end: activationPosition,
        perspective: PERSPECTIVE_SELF,
        effectType: this.fallbackEffectType,
        effectTarget: this.fallbackEffectTarget,
      },
    ];
  }

  private extractUniquePositions(logs: Array<SkillEffectLog>): Array<number> {
    const positions: Array<number> = [];
    for (const log of logs) {
      const pos = log.start;
      const previous = positions[positions.length - 1];
      if (previous == null || Math.abs(previous - pos) > 1e-9) {
        positions.push(pos);
      }
    }
    return positions;
  }
}

export class UniqueSkillCompareDataCollector extends SkillCompareDataCollector {}

/**
 * Lightweight collector that only tracks position per tick and finish position.
 * Provides data compatible with `computePositionDiff` without the overhead
 * of full skill-activation / velocity / HP tracking.
 */
export class BassinCollector implements RaceLifecycleObserver {
  private position: Array<number> = [];
  private finishPosition = 0;
  private runnerId: number | null = null;

  public onRoundStart(_race: Race, _seed: number): void {
    this.position = [];
    this.finishPosition = 0;
    this.runnerId = null;
  }

  public onBeforeTick(_race: Race, _dt: number): void {}

  public onAfterRunnerTick(_race: Race, runner: Runner, _dt: number): void {
    if (this.runnerId == null) {
      this.runnerId = runner.id;
    }
    if (runner.id === this.runnerId) {
      this.position.push(runner.position);
    }
  }

  public onRunnerFinished(race: Race, runner: Runner): void {
    if (this.runnerId == null || runner.id === this.runnerId) {
      this.finishPosition = Math.min(runner.position, race.course.distance);
    }
  }

  public onRoundEnd(_race: Race): void {}

  public getPosition(): Array<number> {
    return this.position;
  }

  public getFinishPosition(): number {
    return this.finishPosition;
  }
}
