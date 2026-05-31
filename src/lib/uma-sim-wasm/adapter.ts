// Conversions between the app's sunday-tools domain shapes and the WASM
// boundary DTOs. The TS side stays the skill-data repository: it resolves skill
// ids to their raw alternatives/conditions here and ships them to WASM, which
// owns the condition parsing + simulation.

import { skillsService } from '@/modules/data/services/SkillService';
import type { CourseData } from 'sunday-tools/course/definitions';
import type { CreateRunner } from 'sunday-tools/common/runner';
import type {
  RaceSimParams,
  RaceSimResult,
  FinishEntry,
} from 'sunday-tools/race-sim/run-race-sim';
import type { RaceEvent, RaceEventKind } from 'sunday-tools/race-sim/race-event-log';
import type { IStrategy } from 'sunday-tools/runner/definitions';
import type {
  DuelingRates,
  RaceParameters as SundayRaceParameters,
  SimulationSettings,
} from 'sunday-tools/common/race';
import type { CollectedRunnerRoundData } from 'sunday-tools/common/race-observer';
import type {
  ISkillPerspective,
  ISkillTarget,
  ISkillType,
} from 'sunday-tools/skills/definitions';
import type { SkillEffectLog } from '@/modules/simulation/compare.types';
import { SkillPerspective } from 'sunday-tools/skills/definitions';
import { getFallbackEffectMeta } from '@/modules/simulation/simulators/shared';
import type {
  WasmCompareParams,
  WasmCompareRoundData,
  WasmCourseData,
  WasmCreateRunner,
  WasmDuelingRates,
  WasmFinishEntry,
  WasmRaceParameters,
  WasmRaceSimParams,
  WasmRaceSimResult,
  WasmSettings,
  WasmSkillEffectLog,
  WasmSkillInput,
} from './types';

/** Convert an app `CourseData` to the WASM DTO (field-compatible). */
export function courseDataToWasm(course: CourseData): WasmCourseData {
  return {
    courseId: course.courseId,
    raceTrackId: course.raceTrackId,
    distance: course.distance,
    distanceType: course.distanceType,
    surface: course.surface,
    turn: course.turn,
    courseSetStatus: [...course.courseSetStatus],
    corners: course.corners.map((c) => ({ start: c.start, length: c.length })),
    straights: course.straights.map((s) => ({
      start: s.start,
      end: s.end,
      frontType: (s as { frontType?: number }).frontType ?? 0,
    })),
    slopes: course.slopes.map((s) => ({
      start: s.start,
      length: s.length,
      slope: s.slope,
    })),
    laneMax: course.laneMax,
    courseWidth: course.courseWidth,
    horseLane: course.horseLane,
    laneChangeAcceleration: course.laneChangeAcceleration,
    laneChangeAccelerationPerFrame: course.laneChangeAccelerationPerFrame,
    maxLaneDistance: course.maxLaneDistance,
    moveLanePoint: course.moveLanePoint,
  };
}

/** Resolve a skill id (possibly with a `-suffix`) to its WASM input DTO. */
export function resolveSkillInput(skillId: string): WasmSkillInput | null {
  const baseId = skillId.split('-')[0] ?? skillId;
  const entry = skillsService.getById(baseId);
  if (!entry) {
    return null;
  }
  return {
    skillId,
    rarity: entry.rarity,
    alternatives: entry.alternatives.map((alt) => ({
      baseDuration: alt.baseDuration,
      cooldownTime: alt.cooldownTime,
      condition: alt.condition,
      precondition: alt.precondition,
      effects: alt.effects.map((e) => ({
        modifier: e.modifier,
        target: e.target,
        type: e.type,
        valueUsage: e.valueUsage,
        valueLevelUsage: e.valueLevelUsage,
      })),
    })),
  };
}

/** The minimal app-runner shape this adapter needs. */
export type AppRunnerInput = {
  outfitId: string;
  name: string;
  mood: number;
  strategy: number;
  aptitudes: { distance: number; strategy: number; surface: number };
  stats: { speed: number; stamina: number; power: number; guts: number; wit: number };
  skills: string[];
  forcedPositions?: Record<string, number>;
};

/** Convert an app runner (with skill ids) to the WASM DTO (skills resolved). */
export function createRunnerToWasm(runner: AppRunnerInput): WasmCreateRunner {
  const skills: WasmSkillInput[] = [];
  for (const skillId of runner.skills) {
    const resolved = resolveSkillInput(skillId);
    if (resolved) {
      skills.push(resolved);
    }
  }
  return {
    outfitId: runner.outfitId,
    name: runner.name,
    mood: runner.mood,
    strategy: runner.strategy,
    aptitudes: runner.aptitudes,
    stats: runner.stats,
    skills,
    forcedPositions: runner.forcedPositions ?? {},
  };
}

/** App-facing finish entry (passthrough of the WASM DTO). */
export type AppFinishEntry = WasmFinishEntry;

/** Map a sunday-tools `RaceParameters` to the WASM DTO (numeric 1:1). */
function raceParametersToWasm(parameters: RaceSimParams['parameters']): WasmRaceParameters {
  return {
    ground: parameters.ground,
    weather: parameters.weather,
    season: parameters.season,
    timeOfDay: parameters.timeOfDay,
    grade: parameters.grade,
  };
}

/** Convert a sunday-tools `CreateRunner` (skill ids) to the WASM DTO. */
export function sundayRunnerToWasm(runner: CreateRunner, name: string): WasmCreateRunner {
  const skills: WasmSkillInput[] = [];
  for (const skillId of runner.skills) {
    const resolved = resolveSkillInput(skillId);
    if (resolved) {
      skills.push(resolved);
    }
  }
  const injectedDebuffs = (runner.injectedDebuffs ?? [])
    .map((d) => {
      const skill = resolveSkillInput(d.skillId);
      return skill ? { skill, position: d.position } : null;
    })
    .filter((d): d is { skill: WasmSkillInput; position: number } => d !== null);

  return {
    outfitId: runner.outfitId,
    name,
    mood: runner.mood,
    strategy: runner.strategy,
    aptitudes: runner.aptitudes,
    stats: runner.stats,
    skills,
    forcedPositions: runner.forcedPositions ?? {},
    injectedDebuffs,
    forcedRushedRegions: runner.forcedRushedRegions ?? [],
    forcedDuelingRegions: runner.forcedDuelingRegions ?? [],
    forcedSpotStruggleRegions: runner.forcedSpotStruggleRegions ?? [],
    forcedRank: runner.forcedRank ?? [],
  };
}

/** Map a sunday-tools `SimulationSettings` to the compare WASM settings DTO. */
export function compareSettingsToWasm(settings: SimulationSettings): WasmSettings {
  return {
    mode: settings.mode,
    healthSystem: settings.healthSystem,
    sectionModifier: settings.sectionModifier,
    rushed: settings.rushed,
    downhill: settings.downhill,
    spotStruggle: settings.spotStruggle,
    dueling: settings.dueling,
    witChecks: settings.witChecks,
    positionKeepMode: settings.positionKeepMode,
    staminaDrainOverrides: settings.staminaDrainOverrides ?? {},
  };
}

/** Map sunday-tools `DuelingRates` to the WASM DTO (field-compatible). */
export function duelingRatesToWasm(rates: DuelingRates): WasmDuelingRates {
  return {
    runaway: rates.runaway,
    frontRunner: rates.frontRunner,
    paceChaser: rates.paceChaser,
    lateSurger: rates.lateSurger,
    endCloser: rates.endCloser,
  };
}

/** Inputs to {@link compareParamsToWasm} — one vacuum runner over N rounds. */
export type CompareParamsToWasmArgs = {
  course: CourseData;
  parameters: SundayRaceParameters;
  settings: SimulationSettings;
  duelingRates: DuelingRates;
  runner: CreateRunner;
  name: string;
  nsamples: number;
  masterSeed: number;
};

/** Build the WASM compare params for a single vacuum runner. */
export function compareParamsToWasm(args: CompareParamsToWasmArgs): WasmCompareParams {
  return {
    course: courseDataToWasm(args.course),
    parameters: raceParametersToWasm(args.parameters),
    settings: compareSettingsToWasm(args.settings),
    duelingRates: duelingRatesToWasm(args.duelingRates),
    runners: [sundayRunnerToWasm(args.runner, args.name)],
    nsamples: args.nsamples,
    masterSeed: args.masterSeed,
  };
}

/** Map a WASM skill-activation map to the TS `SkillEffectLog` map. */
function skillActivationMapFromWasm(
  map: Record<string, WasmSkillEffectLog[]>,
): Record<string, SkillEffectLog[]> {
  const out: Record<string, SkillEffectLog[]> = {};
  for (const [skillId, logs] of Object.entries(map)) {
    out[skillId] = logs.map((log) => ({
      executionId: log.executionId,
      skillId: log.skillId,
      start: log.start,
      end: log.end,
      perspective: log.perspective as ISkillPerspective,
      effectType: log.effectType as ISkillType,
      effectTarget: log.effectTarget as ISkillTarget,
    }));
  }
  return out;
}

/**
 * Reshape one WASM `CompareRoundData` into the sunday-tools
 * `CollectedRunnerRoundData` the compare orchestration consumes. Optional WASM
 * regions/values map to the `[]`/`null` sentinels the TS shape expects.
 */
export function wasmCompareRoundDataToCollected(
  data: WasmCompareRoundData,
): CollectedRunnerRoundData {
  return {
    runnerId: data.runnerId,
    time: data.time,
    position: data.position,
    velocity: data.velocity,
    hp: data.hp,
    currentLane: data.currentLane,
    pacerGap: data.pacerGap,
    skillActivations: skillActivationMapFromWasm(data.skillActivations),
    targetedSkillActivations: skillActivationMapFromWasm(data.targetedSkillActivations),
    startDelay: data.startDelay,
    rushed: data.rushed.map(([start, end]) => [start, end] as [number, number]),
    duelingRegion: data.duelingRegion ? [data.duelingRegion[0], data.duelingRegion[1]] : [],
    spotStruggleRegion: data.spotStruggleRegion
      ? [data.spotStruggleRegion[0], data.spotStruggleRegion[1]]
      : [],
    hasAchievedFullSpurt: data.hasAchievedFullSpurt,
    outOfHp: data.outOfHp,
    outOfHpPosition: data.outOfHpPosition ?? null,
    nonFullSpurtVelocityDiff: data.nonFullSpurtVelocityDiff ?? null,
    nonFullSpurtDelayDistance: data.nonFullSpurtDelayDistance ?? null,
    firstPositionInLateRace: data.firstPositionInLateRace,
    usedSkills: data.usedSkills,
    finished: data.finished,
    finishPosition: data.finishPosition,
  };
}

/**
 * Build the WASM batch params from sunday-tools `RaceSimParams`.
 *
 * `focusRunnerIds` is forced to the full field (every insertion index) so the
 * result-adapter can reconstruct `allRunnerPositions` / `allRunnerLanes` from
 * the per-tick focus traces. `resolveName` provides each runner's display name
 * (the WASM boundary requires a name; the sunday-tools input omits it).
 */
export function raceSimParamsToWasm(
  params: RaceSimParams,
  resolveName: (runner: CreateRunner, index: number) => string,
): WasmRaceSimParams {
  return {
    course: courseDataToWasm(params.course),
    parameters: raceParametersToWasm(params.parameters),
    runners: params.runners.map((runner, index) =>
      sundayRunnerToWasm(runner, resolveName(runner, index)),
    ),
    nsamples: params.nsamples,
    masterSeed: params.masterSeed,
    focusRunnerIds: params.runners.map((_, index) => index),
  };
}

/**
 * Reshape the lean WASM result into the rich sunday-tools `RaceSimResult` the UI
 * consumes.
 *
 * - `finishOrders` maps numeric strategy 1:1 to `IStrategy`.
 * - `collectedData.rounds[i]` is reconstructed from the all-runner focus traces:
 *   `allRunnerPositions` / `allRunnerLanes` come from each runner's per-tick
 *   samples, `finishOrder` from `finishOrders[i]`, `seed` from the round.
 * - `eventLogs` is projected by the Rust `RaceEventLogCollector` and mapped 1:1
 *   here (the WASM `kind` is a kebab-case string matching `RaceEventKind`).
 * - per-focus-runner `skillActivations` are derived from the round's
 *   `skill-activated` events (point activations: `start === end === position`),
 *   which is what the Focus Runner Detail skill-activation overlay consumes.
 */

/**
 * Group a round's `skill-activated` events into the per-runner
 * `skillActivations` map the focus-runner overlay reads. Each activation is a
 * point (`start === end === position`); effect type/target come from the static
 * skill metadata (the event log only carries the skill id).
 */
function deriveSkillActivations(
  events: WasmRaceSimResult['eventLogs'][number],
  runnerId: number,
): Record<string, SkillEffectLog[]> {
  const activations: Record<string, SkillEffectLog[]> = {};
  for (const event of events) {
    if (event.kind !== 'skill-activated' || event.runnerId !== runnerId) {
      continue;
    }
    const skillId = event.detail?.skillId;
    if (!skillId) {
      continue;
    }
    const meta = getFallbackEffectMeta(skillId);
    (activations[skillId] ??= []).push({
      executionId: `${runnerId}-${skillId}-${event.tick}`,
      skillId,
      start: event.position,
      end: event.position,
      perspective: SkillPerspective.Self,
      effectType: meta.effectType,
      effectTarget: meta.effectTarget,
    });
  }
  return activations;
}

export function wasmResultToRaceSimResult(result: WasmRaceSimResult): RaceSimResult {
  const finishOrders: FinishEntry[][] = result.finishOrders.map((round) =>
    round.map((entry) => ({
      runnerId: entry.runnerId,
      name: entry.name,
      strategy: entry.strategy as IStrategy,
      finishPosition: entry.finishPosition,
      finishTime: entry.finishTime,
    })),
  );

  const rounds = result.collected.map((round, roundIndex) => {
    const allRunnerPositions: Record<number, number[]> = {};
    const allRunnerLanes: Record<number, number[]> = {};
    const focusRunnerData: RaceSimResult['collectedData']['rounds'][number]['focusRunnerData'] = {};
    const roundEvents = result.eventLogs[roundIndex] ?? [];
    for (const trace of round.focus) {
      const positions = trace.samples.map((s) => s.position);
      const lanes = trace.samples.map((s) => s.lane);
      allRunnerPositions[trace.runnerId] = positions;
      allRunnerLanes[trace.runnerId] = lanes;
      // Reconstruct the per-runner detail series the UI charts. `skillActivations`
      // are derived from the round's `skill-activated` events (t-007). Fields the
      // WASM telemetry does not capture and the Race Sim UI does not consume
      // (pacer gap, targeted activations, mechanic regions) keep neutral defaults;
      // the mechanic timelines are rendered from the event log instead.
      focusRunnerData[trace.runnerId] = {
        runnerId: trace.runnerId,
        time: trace.samples.map((s) => s.time),
        position: positions,
        velocity: trace.samples.map((s) => s.speed),
        hp: trace.samples.map((s) => s.health),
        currentLane: lanes,
        pacerGap: trace.samples.map(() => 0),
        skillActivations: deriveSkillActivations(roundEvents, trace.runnerId),
        targetedSkillActivations: {},
        startDelay: 0,
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
        finished: true,
        finishPosition: positions.length > 0 ? positions[positions.length - 1] : 0,
      };
    }
    return {
      seed: round.seed,
      finishOrder: finishOrders[roundIndex] ?? [],
      focusRunnerData,
      allRunnerPositions,
      allRunnerLanes,
    };
  });

  const eventLogs: RaceEvent[][] = result.eventLogs.map((round) =>
    round.map((event) => ({
      kind: event.kind as RaceEventKind,
      runnerId: event.runnerId,
      position: event.position,
      tick: event.tick,
      detail: event.detail
        ? {
            skillId: event.detail.skillId,
            otherRunnerIds: event.detail.otherRunnerIds,
            finishPlace: event.detail.finishPlace,
            finishTime: event.detail.finishTime,
          }
        : undefined,
    })),
  );

  return {
    finishOrders,
    collectedData: { rounds },
    eventLogs,
  };
}
