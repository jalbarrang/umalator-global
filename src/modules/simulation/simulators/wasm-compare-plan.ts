// Main-thread builder for the WASM compare plan. This is the data-dependent
// half of the compare path (skill resolution, group sort, uma display names):
// it converts the app's `CompareParams` into a fully-resolved, structured-clone
// safe `ComparePlan` the worker runs without touching the dataset.

import type { CompareParams } from '@/modules/simulation/types';
import { compareParamsToWasm } from '@/lib/uma-sim-wasm/adapter-params';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { createSkillSorterByGroup } from './shared';
import {
  DEFAULT_DUELING_RATES,
  createCompareSettings,
  toCreateRunner,
  toSundayRaceParameters
} from './shared-pure';
import type { ComparePlan } from './wasm-compare';

function resolveRunnerName(outfitId: string, fallbackIndex: number): string {
  const info = outfitId ? getUmaDisplayInfo(outfitId) : null;
  return info?.name ?? `Runner ${fallbackIndex + 1}`;
}

/** Resolve `CompareParams` into the data-free {@link ComparePlan} for the worker. */
export function buildComparePlan(params: CompareParams): ComparePlan {
  const {
    nsamples,
    course,
    racedef,
    uma1,
    uma2,
    options,
    forcedPositions,
    injectedDebuffs,
    scenarioOverrides
  } = params;

  const baseSeed = options.seed ?? 0;
  const raceParameters = toSundayRaceParameters(racedef);

  const allSkillIds = [...uma1.skills, ...uma2.skills];
  const skillSorter = createSkillSorterByGroup(allSkillIds);
  const runnerASortedSkills = uma1.skills.toSorted(skillSorter);
  const runnerBSortedSkills = uma2.skills.toSorted(skillSorter);

  const settingsA = createCompareSettings({
    healthSystem: true,
    spotStruggle: true,
    sectionModifier: options.allowSectionModifierUma1,
    rushed: options.allowRushedUma1,
    downhill: options.allowDownhillUma1,
    witChecks: options.skillCheckChanceUma1,
    staminaDrainOverrides: options.staminaDrainOverrides
  });
  const settingsB = createCompareSettings({
    healthSystem: true,
    spotStruggle: true,
    sectionModifier: options.allowSectionModifierUma2,
    rushed: options.allowRushedUma2,
    downhill: options.allowDownhillUma2,
    witChecks: options.skillCheckChanceUma2,
    staminaDrainOverrides: options.staminaDrainOverrides
  });

  const runnerA = toCreateRunner(
    uma1,
    runnerASortedSkills,
    forcedPositions?.uma1,
    injectedDebuffs?.uma1,
    scenarioOverrides?.uma1
  );
  const runnerB = toCreateRunner(
    uma2,
    runnerBSortedSkills,
    forcedPositions?.uma2,
    injectedDebuffs?.uma2,
    scenarioOverrides?.uma2
  );

  const wasmParamsA = compareParamsToWasm({
    course,
    parameters: raceParameters,
    settings: settingsA,
    duelingRates: DEFAULT_DUELING_RATES,
    runner: runnerA,
    name: resolveRunnerName(runnerA.outfitId, 0),
    nsamples,
    masterSeed: baseSeed
  });
  const wasmParamsB = compareParamsToWasm({
    course,
    parameters: raceParameters,
    settings: settingsB,
    duelingRates: DEFAULT_DUELING_RATES,
    runner: runnerB,
    name: resolveRunnerName(runnerB.outfitId, 1),
    nsamples,
    masterSeed: baseSeed
  });

  return { wasmParamsA, wasmParamsB, nsamples, baseSeed };
}
