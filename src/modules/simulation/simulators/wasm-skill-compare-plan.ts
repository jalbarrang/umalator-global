// Main-thread builder for the WASM skill-sampling plan (Compare Skills / Compare
// Uniques / basin pools). This is the data-dependent half: per tracked skill it
// resolves the group sort, builds the baseline + tracked-skill runners, converts
// them to WASM params, and precomputes the fallback effect metadata. The worker
// runs + reduces the resulting `SkillSamplingPlan` without touching the dataset.

import { cloneDeep } from 'es-toolkit';
import type { Run1RoundParams } from '@/modules/simulation/types';
import { compareParamsToWasm } from '@/lib/uma-sim-wasm/adapter-params';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { createSkillCompareSettings } from './skill-compare';
import { createSkillSorterByGroup, getFallbackEffectMeta } from './shared';
import { DEFAULT_DUELING_RATES, toCreateRunner, toSundayRaceParameters } from './shared-pure';
import type { SkillSamplingPlan, SkillSamplingPlanEntry } from './wasm-skill-compare';

function resolveRunnerName(outfitId: string, fallbackIndex: number): string {
  const info = outfitId ? getUmaDisplayInfo(outfitId) : null;
  return info?.name ?? `Runner ${fallbackIndex + 1}`;
}

/** Resolve `Run1RoundParams` into a data-free {@link SkillSamplingPlan}. */
export function buildSkillSamplingPlan(params: Run1RoundParams): SkillSamplingPlan {
  const { nsamples, skills, course, racedef, uma, options } = params;

  const parameters = toSundayRaceParameters(racedef);
  const settings = createSkillCompareSettings(options);
  const masterSeed = options.seed ?? 0;

  const entries: Array<SkillSamplingPlanEntry> = [];

  for (const id of skills) {
    const runnerWithTrackedSkill = cloneDeep(uma);
    runnerWithTrackedSkill.skills.push(id);

    const skillSorter = createSkillSorterByGroup([...uma.skills, ...runnerWithTrackedSkill.skills]);

    const baselineRunner = toCreateRunner(uma, uma.skills.toSorted(skillSorter));
    const trackedRunner = toCreateRunner(
      runnerWithTrackedSkill,
      runnerWithTrackedSkill.skills.toSorted(skillSorter)
    );

    const wasmParamsBaseline = compareParamsToWasm({
      course,
      parameters,
      settings,
      duelingRates: DEFAULT_DUELING_RATES,
      runner: baselineRunner,
      name: resolveRunnerName(baselineRunner.outfitId, 0),
      nsamples,
      masterSeed
    });
    const wasmParamsTracked = compareParamsToWasm({
      course,
      parameters,
      settings,
      duelingRates: DEFAULT_DUELING_RATES,
      runner: trackedRunner,
      name: resolveRunnerName(trackedRunner.outfitId, 1),
      nsamples,
      masterSeed
    });

    entries.push({
      skillId: id,
      fallback: getFallbackEffectMeta(id),
      nsamples,
      wasmParamsBaseline,
      wasmParamsTracked
    });
  }

  return { entries };
}
