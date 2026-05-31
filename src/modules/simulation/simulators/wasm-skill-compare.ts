// WASM-backed skill-compare orchestration (Compare Skills / Compare Uniques).
// Mirrors `skill-compare.ts` but sources telemetry from the Rust `runCompare`
// read-model. Two vacuum races share a master seed: the baseline runner and the
// runner with the tracked skill added. The bashin-delta + tracked-skill meta
// reduction lives here on the TS side.

import { cloneDeep } from 'es-toolkit';
import type {
  Run1RoundParams,
  RunComparisonParams,
  SkillComparisonResponse
} from '@/modules/simulation/types';
import type {
  SkillEffectLog,
  SkillSimulationData,
  SkillSimulationRun,
  SkillTrackedMeta,
  SkillTrackedMetaCollection
} from '@/modules/simulation/compare.types';
import type { CollectedRunnerRoundData } from 'sunday-tools/common/race-observer';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import { SkillPerspective } from 'sunday-tools/skills/definitions';
import {
  compareParamsToWasm,
  wasmCompareRoundDataToCollected
} from '@/lib/uma-sim-wasm/adapter';
import { runCompare } from '@/lib/uma-sim-wasm/loader';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { createSkillCompareSettings } from './skill-compare';
import type { SkillComparisonResult } from './skill-compare';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createSkillSorterByGroup,
  getFallbackEffectMeta,
  isSameSkill,
  toCreateRunner,
  toSundayRaceParameters
} from './shared';

type SkillCompareParams = RunComparisonParams & { trackedSkillId: string };

function resolveRunnerName(outfitId: string, fallbackIndex: number): string {
  const info = outfitId ? getUmaDisplayInfo(outfitId) : null;
  return info?.name ?? `Runner ${fallbackIndex + 1}`;
}

/** Tracked-skill activation logs for `trackedSkillId`, normalized to that id. */
function getTrackedLogs(
  roundB: CollectedRunnerRoundData,
  trackedSkillId: string
): Array<SkillEffectLog> {
  const matching: Array<SkillEffectLog> = [];
  for (const [skillId, logs] of Object.entries(roundB.skillActivations)) {
    if (!isSameSkill(skillId, trackedSkillId)) {
      continue;
    }
    for (const log of logs) {
      matching.push({ ...log, skillId: trackedSkillId });
    }
  }
  return matching;
}

function buildFallbackLogs(
  roundB: CollectedRunnerRoundData,
  trackedUsed: boolean,
  trackedSkillId: string,
  seed: number,
  fallback: ReturnType<typeof getFallbackEffectMeta>
): Array<SkillEffectLog> {
  if (!trackedUsed) {
    return [];
  }
  const activationPosition =
    roundB.position.length > 0
      ? Math.min(roundB.position[roundB.position.length - 1], roundB.finishPosition)
      : roundB.finishPosition;
  return [
    {
      executionId: `${seed}-${roundB.runnerId}-fallback`,
      skillId: trackedSkillId,
      start: activationPosition,
      end: activationPosition,
      perspective: SkillPerspective.Self,
      effectType: fallback.effectType,
      effectTarget: fallback.effectTarget
    }
  ];
}

function extractUniquePositions(logs: Array<SkillEffectLog>): Array<number> {
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

/** Run a WASM-backed skill comparison and produce a {@link SkillComparisonResult}. */
export async function runSkillComparisonWasm(
  params: SkillCompareParams
): Promise<SkillComparisonResult> {
  const { nsamples, course, racedef, runnerA, runnerB, trackedSkillId, options } = params;

  const masterSeed = options.seed ?? 0;
  const skillSorter = createSkillSorterByGroup([...runnerA.skills, ...runnerB.skills]);
  const runnerASortedSkills = runnerA.skills.toSorted(skillSorter);
  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorter);

  const raceParameters = toSundayRaceParameters(racedef);
  const settings = createSkillCompareSettings(options);
  const fallback = getFallbackEffectMeta(trackedSkillId);

  const createA = toCreateRunner(runnerA, runnerASortedSkills);
  const createB = toCreateRunner(runnerB, runnerBSortedSkills);

  const [dataA, dataB] = await Promise.all([
    runCompare(
      compareParamsToWasm({
        course,
        parameters: raceParameters,
        settings,
        duelingRates: DEFAULT_DUELING_RATES,
        runner: createA,
        name: resolveRunnerName(createA.outfitId, 0),
        nsamples,
        masterSeed
      })
    ),
    runCompare(
      compareParamsToWasm({
        course,
        parameters: raceParameters,
        settings,
        duelingRates: DEFAULT_DUELING_RATES,
        runner: createB,
        name: resolveRunnerName(createB.outfitId, 1),
        nsamples,
        masterSeed
      })
    )
  ]);

  const diff: Array<number> = [];
  let min = Infinity;
  let max = -Infinity;
  let estMean = 0;
  let estMedian = 0;
  let bestMeanDiff = Infinity;
  let bestMedianDiff = Infinity;

  let minrun: SkillSimulationRun = initializeSkillSimulationRun();
  let maxrun: SkillSimulationRun = initializeSkillSimulationRun();
  let meanrun: SkillSimulationRun = initializeSkillSimulationRun();
  let medianrun: SkillSimulationRun = initializeSkillSimulationRun();

  const trackedMetaCollection: Array<SkillTrackedMeta> = [];
  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);

  for (let i = 0; i < nsamples; ++i) {
    const baselinePrimary = dataA.rounds[i]?.runners[0];
    const trackedPrimary = dataB.rounds[i]?.runners[0];
    if (!baselinePrimary || !trackedPrimary) {
      throw new Error('Missing collected runner data for skill comparison');
    }

    const baselinePosition = baselinePrimary.position;
    const roundB = wasmCompareRoundDataToCollected(trackedPrimary);
    const seed = dataB.rounds[i].seed;

    if (baselinePosition.length === 0) {
      throw new Error('Missing collected runner data for skill comparison');
    }

    const positionDiff = computePositionDiff(baselinePosition, roundB.position);
    const basinn = positionDiff / 2.5;

    // Replicates SkillCompareDataCollector.finalizeCurrentTrackedMeta.
    const trackedUsed = roundB.usedSkills.some((usedSkillId) =>
      isSameSkill(usedSkillId, trackedSkillId)
    );
    const trackedLogs = getTrackedLogs(roundB, trackedSkillId);
    const logs =
      trackedLogs.length > 0
        ? trackedLogs
        : buildFallbackLogs(roundB, trackedUsed, trackedSkillId, seed, fallback);
    const positions = extractUniquePositions(logs);

    if (trackedUsed || positions.length > 0) {
      trackedMetaCollection.push({ horseLength: basinn, positions });
    }

    const data: SkillSimulationRun =
      logs.length === 0
        ? initializeSkillSimulationRun()
        : { sk: [{}, { [trackedSkillId]: logs.map((log) => ({ ...log })) }] };

    diff.push(basinn);

    if (basinn < min) {
      min = basinn;
      minrun = data;
    }
    if (basinn > max) {
      max = basinn;
      maxrun = data;
    }

    if (i === sampleCutoff) {
      diff.sort((a, b) => a - b);
      estMean = diff.reduce((a, b) => a + b) / diff.length;
      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
    }

    if (i >= sampleCutoff) {
      const meanDiff = Math.abs(basinn - estMean);
      const medianDiff = Math.abs(basinn - estMedian);
      if (meanDiff < bestMeanDiff) {
        bestMeanDiff = meanDiff;
        meanrun = data;
      }
      if (medianDiff < bestMedianDiff) {
        bestMedianDiff = medianDiff;
        medianrun = data;
      }
    }
  }

  diff.sort((a, b) => a - b);

  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  const runData: SkillSimulationData = { minrun, maxrun, meanrun, medianrun };
  const skillActivations: Record<string, SkillTrackedMetaCollection> =
    trackedMetaCollection.length > 0 ? { [trackedSkillId]: trackedMetaCollection } : {};

  return {
    results: diff,
    skillActivations,
    runData,
    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median
  };
}

/** WASM-backed equivalent of `runSampling` (one skill per call). */
export async function runSamplingWasm(params: Run1RoundParams): Promise<SkillComparisonResponse> {
  const { nsamples, skills, course, racedef, uma, options } = params;

  const data: SkillComparisonResponse = {};

  for (const id of skills) {
    const runnerWithTrackedSkill = cloneDeep(uma);
    runnerWithTrackedSkill.skills.push(id);

    const { results, runData, min, max, mean, median, skillActivations } =
      await runSkillComparisonWasm({
        trackedSkillId: id,
        nsamples,
        course,
        racedef,
        runnerA: uma,
        runnerB: runnerWithTrackedSkill,
        options
      });

    data[id] = {
      id,
      results,
      skillActivations,
      runData,
      min,
      max,
      mean,
      median,
      filterReason: undefined
    };
  }

  return data;
}
