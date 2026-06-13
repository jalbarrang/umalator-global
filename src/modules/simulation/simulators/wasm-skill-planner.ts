// WASM-backed skill-planner evaluation (Skill Planner optimizer).
//
// Mirrors the diff math of `skill-planner-compare.ts` but sources telemetry
// from the Rust `runCompare` read-model (Fork A, Option 1 — batch call, lean
// boundary). The planner only needs the bashin-delta distribution per
// combination (mean/min/max/median), so the tracked-skill meta reduction the
// compare-family performs is intentionally omitted here.
//
// Throughput note: the baseline vacuum (obtained skills only) is identical
// across every candidate combination within an optimization run, so callers
// should compute it once per sample-count and reuse it (see
// `optimization-engine-wasm.ts`).

import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from 'sunday-tools/course/definitions';
import type { RaceParameters } from 'sunday-tools/common/race';
import type { SimulationOptions } from '@/modules/simulation/types';
import type { WasmCompareData } from '@/lib/uma-sim-wasm/types';
import { compareParamsToWasm } from '@/lib/uma-sim-wasm/adapter';
import { runCompare } from '@/lib/uma-sim-wasm/loader';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { createPlannerCompareSettings } from './skill-planner-compare';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createSkillSorterByGroup,
  toCreateRunner,
  toSundayRaceParameters
} from './shared';

export type PlannerVacuumArgs = {
  /** Runner stats/outfit; the skill list is supplied separately via `skills`. */
  runner: IRunnerState;
  /** Explicit, already-resolved skill list for this vacuum run. */
  skills: Array<string>;
  course: CourseData;
  racedef: RaceParameters;
  nsamples: number;
  ignoreStaminaConsumption: boolean;
  options: SimulationOptions;
};

export type PlannerComparisonStats = {
  results: Array<number>;
  min: number;
  max: number;
  mean: number;
  median: number;
};

function resolveRunnerName(outfitId: string): string {
  const info = outfitId ? getUmaDisplayInfo(outfitId) : null;
  return info?.name ?? 'Runner';
}

/**
 * Run a single vacuum runner over `nsamples` rounds via the Rust `runCompare`
 * batch call.
 *
 * Skills are sorted with a group sorter built from this runner's own skills so
 * the result is self-contained and cacheable (the compare-family builds the
 * sorter from the union of both runners; here the baseline must be stable
 * across candidates, so each runner sorts independently).
 */
export async function runPlannerVacuumWasm(args: PlannerVacuumArgs): Promise<WasmCompareData> {
  const { runner, skills, course, racedef, nsamples, ignoreStaminaConsumption, options } = args;

  const masterSeed = options.seed ?? 0;
  const sorter = createSkillSorterByGroup(skills);
  const sortedSkills = skills.toSorted(sorter);
  const raceParameters = toSundayRaceParameters(racedef);
  const settings = createPlannerCompareSettings(
    ignoreStaminaConsumption,
    options.staminaDrainOverrides
  );
  const create = toCreateRunner({ ...runner, skills }, sortedSkills);

  return runCompare(
    compareParamsToWasm({
      course,
      parameters: raceParameters,
      settings,
      duelingRates: DEFAULT_DUELING_RATES,
      runner: create,
      name: resolveRunnerName(create.outfitId),
      nsamples,
      masterSeed
    })
  );
}

/**
 * Compute the bashin-delta distribution between a baseline vacuum and a
 * candidate vacuum (baseline runner + candidate skills), round-aligned by
 * index. Mirrors the diff loop in `runPlannerComparison`.
 */
export function computePlannerStats(
  baseline: WasmCompareData,
  candidate: WasmCompareData,
  nsamples: number
): PlannerComparisonStats {
  const diff: Array<number> = [];

  for (let i = 0; i < nsamples; ++i) {
    const baselinePrimary = baseline.rounds[i]?.runners[0];
    const candidatePrimary = candidate.rounds[i]?.runners[0];
    if (!baselinePrimary || !candidatePrimary) {
      throw new Error('Missing collected runner data for planner comparison');
    }

    const baselinePosition = baselinePrimary.position;
    const candidatePosition = candidatePrimary.position;
    if (baselinePosition.length === 0 || candidatePosition.length === 0) {
      throw new Error('Missing collected runner data for planner comparison');
    }

    const positionDiff = computePositionDiff(baselinePosition, candidatePosition);
    diff.push(positionDiff / 2.5);
  }

  diff.sort((a, b) => a - b);
  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.length > 0 ? diff.reduce((sum, value) => sum + value, 0) / diff.length : 0;

  return {
    results: diff,
    min: diff[0] ?? 0,
    max: diff[diff.length - 1] ?? 0,
    mean,
    median
  };
}
