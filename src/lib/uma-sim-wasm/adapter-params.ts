// Param-side conversions: sunday-tools domain shapes -> WASM boundary input
// DTOs. This is the ONLY half of the adapter that reads skill data, so it must
// stay main-thread-only (imported from hooks / pool-manager, never from a
// `src/workers/**` module). Keeping it out of worker graphs is what prevents the
// datasets from being inlined into the worker bundles. Result-side conversions
// (data-free, worker-safe) live in `adapter-results.ts`.

import { skillsService } from '@/modules/data/services/SkillService';
import type { CourseData } from 'sunday-tools/course/definitions';
import type { CreateRunner } from 'sunday-tools/common/runner';
import type { RaceSimParams } from 'sunday-tools/race-sim/run-race-sim';
import type {
  DuelingRates,
  RaceParameters as SundayRaceParameters,
  SimulationSettings
} from 'sunday-tools/common/race';
import type {
  WasmCompareParams,
  WasmCourseData,
  WasmCreateRunner,
  WasmDuelingRates,
  WasmRaceParameters,
  WasmRaceSimParams,
  WasmSettings,
  WasmSkillInput
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
      frontType: (s as { frontType?: number }).frontType ?? 0
    })),
    slopes: course.slopes.map((s) => ({
      start: s.start,
      length: s.length,
      slope: s.slope
    })),
    laneMax: course.laneMax,
    courseWidth: course.courseWidth,
    horseLane: course.horseLane,
    laneChangeAcceleration: course.laneChangeAcceleration,
    laneChangeAccelerationPerFrame: course.laneChangeAccelerationPerFrame,
    maxLaneDistance: course.maxLaneDistance,
    moveLanePoint: course.moveLanePoint,
    isAbroad: course.isAbroad ?? false
  };
}

/** Resolve a skill id (possibly with a `-suffix`) to its WASM input DTO. */
export function resolveSkillInput(skillId: string): WasmSkillInput | null {
  const baseId = skillId.split('-', 1)[0] ?? skillId;
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
        valueLevelUsage: e.valueLevelUsage
      }))
    }))
  };
}

/** Map a sunday-tools `RaceParameters` to the WASM DTO (numeric 1:1). */
export function raceParametersToWasm(parameters: RaceSimParams['parameters']): WasmRaceParameters {
  return {
    ground: parameters.ground,
    weather: parameters.weather,
    season: parameters.season,
    timeOfDay: parameters.timeOfDay,
    grade: parameters.grade
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
    popularity: runner.popularity ?? 0,
    aptitudes: runner.aptitudes,
    stats: runner.stats,
    skills,
    forcedPositions: runner.forcedPositions ?? {},
    injectedDebuffs,
    forcedRushedRegions: runner.forcedRushedRegions ?? [],
    forcedDuelingRegions: runner.forcedDuelingRegions ?? [],
    forcedSpotStruggleRegions: runner.forcedSpotStruggleRegions ?? [],
    forcedRank: runner.forcedRank ?? []
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
    conservePower: settings.conservePower,
    spotStruggle: settings.spotStruggle,
    dueling: settings.dueling,
    witChecks: settings.witChecks,
    positionKeepMode: settings.positionKeepMode,
    staminaDrainOverrides: settings.staminaDrainOverrides ?? {}
  };
}

/** Map sunday-tools `DuelingRates` to the WASM DTO (field-compatible). */
export function duelingRatesToWasm(rates: DuelingRates): WasmDuelingRates {
  return {
    runaway: rates.runaway,
    frontRunner: rates.frontRunner,
    paceChaser: rates.paceChaser,
    lateSurger: rates.lateSurger,
    endCloser: rates.endCloser
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
    masterSeed: args.masterSeed
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
  resolveName: (runner: CreateRunner, index: number) => string
): WasmRaceSimParams {
  return {
    course: courseDataToWasm(params.course),
    parameters: raceParametersToWasm(params.parameters),
    runners: params.runners.map((runner, index) =>
      sundayRunnerToWasm(runner, resolveName(runner, index))
    ),
    nsamples: params.nsamples,
    masterSeed: params.masterSeed,
    focusRunnerIds: params.runners.map((_, index) => index)
  };
}
