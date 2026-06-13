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

import type {
  WasmCompareData,
  WasmCompareParams,
  WasmCourseData,
  WasmCreateRunner,
  WasmDuelingRates,
  WasmRaceParameters,
  WasmSettings,
  WasmSkillInput
} from '@/lib/uma-sim-wasm/types';
import { runCompare } from '@/lib/uma-sim-wasm/loader';
import { computePositionDiff, createSkillSorterByGroupWith } from './shared-pure';

/**
 * Fully-resolved, data-free planner context: every constant across candidate
 * combinations (course/params/settings/runner stats) pre-converted to WASM DTOs
 * on the main thread (via `buildPlannerWasmContext`), plus a `skillInputs` map
 * and `groupIds` covering all obtained + candidate skills. The worker assembles
 * a per-combination runner from this without touching the dataset.
 */
export type PlannerWasmContext = {
  course: WasmCourseData;
  parameters: WasmRaceParameters;
  settings: WasmSettings;
  duelingRates: WasmDuelingRates;
  /** Runner DTO with an empty skill list; the per-combination skills are injected. */
  runnerBase: WasmCreateRunner;
  /** Resolved skill input DTOs keyed by full skill id. */
  skillInputs: Record<string, WasmSkillInput>;
  /** Group id keyed by normalized (base) skill id, for the order-stable sorter. */
  groupIds: Record<string, number>;
  masterSeed: number;
};

export type PlannerComparisonStats = {
  results: Array<number>;
  min: number;
  max: number;
  mean: number;
  median: number;
};

/**
 * Run a single vacuum runner over `nsamples` rounds via the Rust `runCompare`
 * batch call, for a prebuilt {@link PlannerWasmContext}. Worker-safe.
 *
 * Skills are sorted with a group sorter built from this runner's own skills so
 * the result is self-contained and cacheable (the compare-family builds the
 * sorter from the union of both runners; here the baseline must be stable
 * across candidates, so each runner sorts independently).
 */
export async function runPlannerVacuumWasm(
  ctx: PlannerWasmContext,
  skills: Array<string>,
  nsamples: number
): Promise<WasmCompareData> {
  const sorter = createSkillSorterByGroupWith(skills, (baseId) => ctx.groupIds[baseId]);
  const sortedSkills = skills.toSorted(sorter);

  const resolvedSkills: Array<WasmSkillInput> = [];
  for (const id of sortedSkills) {
    const input = ctx.skillInputs[id];
    if (input) {
      resolvedSkills.push(input);
    }
  }

  const params: WasmCompareParams = {
    course: ctx.course,
    parameters: ctx.parameters,
    settings: ctx.settings,
    duelingRates: ctx.duelingRates,
    runners: [{ ...ctx.runnerBase, skills: resolvedSkills }],
    nsamples,
    masterSeed: ctx.masterSeed
  };

  return runCompare(params);
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
