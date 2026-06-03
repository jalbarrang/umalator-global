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
import { compareParamsToWasm, wasmCompareRoundDataToCollected } from '@/lib/uma-sim-wasm/adapter';
import { runCompare } from '@/lib/uma-sim-wasm/loader';
import type { WasmCompareData } from '@/lib/uma-sim-wasm/types';
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

type SampleSummary = {
  basinn: number;
  data: SkillSimulationRun;
  trackedMeta: SkillTrackedMeta | null;
};

/** Inputs shared by the two vacuum compare races (baseline + tracked-skill). */
type VacuumCompareContext = {
  course: SkillCompareParams['course'];
  parameters: ReturnType<typeof toSundayRaceParameters>;
  settings: ReturnType<typeof createSkillCompareSettings>;
  nsamples: number;
  masterSeed: number;
};

/** Run one vacuum compare race for a prepared runner. */
function runVacuumCompare(
  create: ReturnType<typeof toCreateRunner>,
  fallbackIndex: number,
  ctx: VacuumCompareContext
): Promise<WasmCompareData> {
  return runCompare(
    compareParamsToWasm({
      course: ctx.course,
      parameters: ctx.parameters,
      settings: ctx.settings,
      duelingRates: DEFAULT_DUELING_RATES,
      runner: create,
      name: resolveRunnerName(create.outfitId, fallbackIndex),
      nsamples: ctx.nsamples,
      masterSeed: ctx.masterSeed
    })
  );
}

/**
 * Reduce one paired sample (baseline vs tracked) into its bashin delta,
 * representative-run payload, and optional tracked-skill meta.
 * Replicates `SkillCompareDataCollector.finalizeCurrentTrackedMeta`.
 */
function summarizeSample(
  roundA: WasmCompareData['rounds'][number] | undefined,
  roundB: WasmCompareData['rounds'][number] | undefined,
  trackedSkillId: string,
  fallback: ReturnType<typeof getFallbackEffectMeta>
): SampleSummary {
  const baselinePrimary = roundA?.runners[0];
  const trackedPrimary = roundB?.runners[0];
  if (!baselinePrimary || !trackedPrimary || !roundB) {
    throw new Error('Missing collected runner data for skill comparison');
  }

  const baselinePosition = baselinePrimary.position;
  if (baselinePosition.length === 0) {
    throw new Error('Missing collected runner data for skill comparison');
  }

  const collectedB = wasmCompareRoundDataToCollected(trackedPrimary);
  const basinn = computePositionDiff(baselinePosition, collectedB.position) / 2.5;

  const trackedUsed = collectedB.usedSkills.some((usedSkillId) =>
    isSameSkill(usedSkillId, trackedSkillId)
  );
  const trackedLogs = getTrackedLogs(collectedB, trackedSkillId);
  const logs =
    trackedLogs.length > 0
      ? trackedLogs
      : buildFallbackLogs(collectedB, trackedUsed, trackedSkillId, roundB.seed, fallback);
  const positions = extractUniquePositions(logs);

  const data: SkillSimulationRun =
    logs.length === 0
      ? initializeSkillSimulationRun()
      : { sk: [{}, { [trackedSkillId]: logs.map((log) => ({ ...log })) }] };

  const trackedMeta =
    trackedUsed || positions.length > 0 ? { horseLength: basinn, positions } : null;

  return { basinn, data, trackedMeta };
}

/**
 * Streams the running min/max plus the runs closest to the estimated mean and
 * median (estimated once `cutoff` samples are in). Retains only the four
 * representative {@link SkillSimulationRun}s instead of every sample's payload.
 */
class RepresentativeRunTracker {
  minrun: SkillSimulationRun = initializeSkillSimulationRun();
  maxrun: SkillSimulationRun = initializeSkillSimulationRun();
  meanrun: SkillSimulationRun = initializeSkillSimulationRun();
  medianrun: SkillSimulationRun = initializeSkillSimulationRun();

  private min = Infinity;
  private max = -Infinity;
  private estMean = 0;
  private estMedian = 0;
  private bestMeanDiff = Infinity;
  private bestMedianDiff = Infinity;

  constructor(private readonly cutoff: number) {}

  /** Observe one sample. `diffSoFar` must already include `basinn`. */
  observe(index: number, basinn: number, data: SkillSimulationRun, diffSoFar: Array<number>): void {
    if (basinn < this.min) {
      this.min = basinn;
      this.minrun = data;
    }
    if (basinn > this.max) {
      this.max = basinn;
      this.maxrun = data;
    }

    if (index === this.cutoff) {
      diffSoFar.sort((a, b) => a - b);
      this.estMean = diffSoFar.reduce((a, b) => a + b) / diffSoFar.length;
      const mid = Math.floor(diffSoFar.length / 2);
      this.estMedian =
        mid > 0 && diffSoFar.length % 2 === 0
          ? (diffSoFar[mid - 1] + diffSoFar[mid]) / 2
          : diffSoFar[mid];
    }

    if (index >= this.cutoff) {
      const meanDiff = Math.abs(basinn - this.estMean);
      const medianDiff = Math.abs(basinn - this.estMedian);
      if (meanDiff < this.bestMeanDiff) {
        this.bestMeanDiff = meanDiff;
        this.meanrun = data;
      }
      if (medianDiff < this.bestMedianDiff) {
        this.bestMedianDiff = medianDiff;
        this.medianrun = data;
      }
    }
  }

  toRunData(): SkillSimulationData {
    return {
      minrun: this.minrun,
      maxrun: this.maxrun,
      meanrun: this.meanrun,
      medianrun: this.medianrun
    };
  }
}

/** Run a WASM-backed skill comparison and produce a {@link SkillComparisonResult}. */
export async function runSkillComparisonWasm(
  params: SkillCompareParams
): Promise<SkillComparisonResult> {
  const { nsamples, course, racedef, runnerA, runnerB, trackedSkillId, options } = params;

  const skillSorter = createSkillSorterByGroup([...runnerA.skills, ...runnerB.skills]);
  const fallback = getFallbackEffectMeta(trackedSkillId);

  const compareContext: VacuumCompareContext = {
    course,
    parameters: toSundayRaceParameters(racedef),
    settings: createSkillCompareSettings(options),
    nsamples,
    masterSeed: options.seed ?? 0
  };

  const [dataA, dataB] = await Promise.all([
    runVacuumCompare(
      toCreateRunner(runnerA, runnerA.skills.toSorted(skillSorter)),
      0,
      compareContext
    ),
    runVacuumCompare(
      toCreateRunner(runnerB, runnerB.skills.toSorted(skillSorter)),
      1,
      compareContext
    )
  ]);

  const diff: Array<number> = [];
  const trackedMetaCollection: Array<SkillTrackedMeta> = [];
  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);
  const representatives = new RepresentativeRunTracker(sampleCutoff);

  for (let i = 0; i < nsamples; ++i) {
    const { basinn, data, trackedMeta } = summarizeSample(
      dataA.rounds[i],
      dataB.rounds[i],
      trackedSkillId,
      fallback
    );
    if (trackedMeta) {
      trackedMetaCollection.push(trackedMeta);
    }
    diff.push(basinn);
    representatives.observe(i, basinn, data, diff);
  }

  diff.sort((a, b) => a - b);
  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  const skillActivations: Record<string, SkillTrackedMetaCollection> =
    trackedMetaCollection.length > 0 ? { [trackedSkillId]: trackedMetaCollection } : {};

  return {
    results: diff,
    skillActivations,
    runData: representatives.toRunData(),
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
