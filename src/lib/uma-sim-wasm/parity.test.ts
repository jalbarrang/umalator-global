/**
 * t-008 — WASM vs TS statistical-parity harness (Fork B acceptance bar).
 *
 * Skipped by default. To run, build a *node-target* WASM package and point the
 * `UMA_WASM_NODE_PKG` env var at the generated `uma_sim_wasm.js`:
 *
 *   sysroot="$(cygpath -u "$(rustup run stable rustc --print sysroot)")"
 *   PATH="$sysroot/bin:$PATH" wasm-pack build packages/uma-sim-wasm \
 *     --target nodejs --out-dir .tmp-wasm-node/pkg --out-name uma_sim_wasm
 *   UMA_WASM_NODE_PKG="$(pwd)/.tmp-wasm-node/pkg/uma_sim_wasm.js" \
 *     bunx vitest run src/lib/uma-sim-wasm/parity.test.ts -t planner
 *   # run the 9-runner test separately to avoid heap pressure:
 *   UMA_WASM_NODE_PKG=... bunx vitest run src/lib/uma-sim-wasm/parity.test.ts -t 9-runner
 *
 * The web-target `loader.ts` cannot initialize under node (it fetches the .wasm
 * via `import.meta.url`), so this harness imports a node-target build directly.
 *
 * Recorded results + sign-off: docs/adr/0004-wasm-ts-statistical-parity.md.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { coursesService } from '@/modules/data/services/CourseService';
import { getDefaultCourseId } from '@/store/race/defaults';
import { createRaceConditions, racedefToParams } from '@/utils/races';
import { createRunnerState, runawaySkillId } from '@/modules/runners/components/runner-card/types';
import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import type { IStrategyName } from 'sunday-tools/runner/definitions';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';
import {
  createPlannerCompareSettings,
  runPlannerComparison
} from '@/modules/simulation/simulators/skill-planner-compare';
import { computePlannerStats } from '@/modules/simulation/simulators/wasm-skill-planner';
import { runRaceSim } from 'sunday-tools/race-sim/run-race-sim';
import { compareParamsToWasm, raceSimParamsToWasm } from '@/lib/uma-sim-wasm/adapter';
import type { WasmCompareData, WasmRaceSimResult } from '@/lib/uma-sim-wasm/types';
import {
  DEFAULT_DUELING_RATES,
  createSkillSorterByGroup,
  toCreateRunner,
  toSundayRaceParameters
} from '@/modules/simulation/simulators/shared';

type NodeWasmModule = {
  runCompare: (params: unknown) => WasmCompareData;
  runRaceSim: (params: unknown) => WasmRaceSimResult;
};

const PKG_PATH = process.env.UMA_WASM_NODE_PKG;

function loadWasm(): NodeWasmModule {
  if (!PKG_PATH) {
    throw new Error('UMA_WASM_NODE_PKG is not set');
  }
  return createRequire(import.meta.url)(PKG_PATH) as NodeWasmModule;
}

function distStats(xs: Array<number>) {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  const variance = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length;
  return { mean, median, std: Math.sqrt(variance), min: s[0], max: s[s.length - 1] };
}

describe.skipIf(!PKG_PATH)('t-008 WASM-vs-TS statistical parity', () => {
  it('planner: single-skill bashin-delta distribution', { timeout: 180000 }, () => {
    const wasm = loadWasm();
    const course = coursesService.getSimCourse(getDefaultCourseId());
    const racedef = racedefToParams(createRaceConditions());
    const N = 2000;
    const options = { ...defaultSimulationOptions, seed: 0 };

    const base = createRunnerState({ skills: [], speed: 1000, stamina: 1000 });
    const stronger = createRunnerState({ skills: [], speed: 1200, stamina: 1200 });

    const ts = runPlannerComparison({
      nsamples: N,
      course,
      racedef,
      runnerA: base,
      runnerB: stronger,
      candidateSkills: [runawaySkillId],
      ignoreStaminaConsumption: false,
      options
    });

    const vacuum = (runner: IRunnerState): WasmCompareData => {
      const sorter = createSkillSorterByGroup(runner.skills);
      const create = toCreateRunner({ ...runner }, runner.skills.toSorted(sorter));
      return wasm.runCompare(
        compareParamsToWasm({
          course,
          parameters: toSundayRaceParameters(racedef),
          settings: createPlannerCompareSettings(false, {}),
          duelingRates: DEFAULT_DUELING_RATES,
          runner: create,
          name: 'R',
          nsamples: N,
          masterSeed: 0
        })
      );
    };

    const w = computePlannerStats(vacuum(base), vacuum(stronger), N);
    const tsS = distStats(ts.results);
    const wS = distStats(w.results);

    // Fork B bar: |mean| within 2%, |median| within 2%, |std| within 10%.
    expect(Math.abs(tsS.mean - wS.mean) / Math.abs(tsS.mean)).toBeLessThan(0.02);
    expect(Math.abs(tsS.median - wS.median) / Math.abs(tsS.median)).toBeLessThan(0.02);
    expect(Math.abs(tsS.std - wS.std) / Math.max(tsS.std, 1e-6)).toBeLessThan(0.1);
  });

  it('race sim: 9-runner finish-rank distribution', { timeout: 300000 }, () => {
    runNineRunnerParity();
  });
});

/**
 * Per-skill activation/effect parity — the gate t-008 missed.
 *
 * For each representative skill family we assert (a) the per-skill bashin-delta
 * mean matches the TS engine within tolerance AND (b) WASM actually captured
 * non-empty `skillActivations` for the activating skill (Bug #1 regression).
 * Categories: order-conditioned, random-corner, rotation/conditional-passive,
 * plain duration.
 */
type SkillParityCase = {
  id: string;
  label: string;
  /** Expect the skill to activate (non-zero bashin) and produce activation logs. */
  activates: boolean;
  /** Bashin-delta mean tolerance (absolute, bashin). */
  meanTol: number;
};

const SKILL_PARITY_CASES: Array<SkillParityCase> = [
  // Self-cast unique current-speed + targeted move-forward at remain 200m.
  { id: '110101', label: 'unique near-finish (Joyful Voyage!)', activates: true, meanTol: 0.15 },
  // all_corner_random==1 random-corner target-speed.
  { id: '200332', label: 'random-corner (Corner Adept ○)', activates: true, meanTol: 0.15 },
  // rotation==1 conditional passive (green) speed-up.
  { id: '200012', label: 'rotation passive (Right-Handed ○)', activates: true, meanTol: 0.1 },
  // Plain duration gold runaway target-speed (running_style==1).
  { id: runawaySkillId, label: 'plain-duration runaway', activates: true, meanTol: 0.15 }
];

describe.skipIf(!PKG_PATH)('skill-activation/effect parity (gate t-008 missed)', () => {
  const N = 2000;
  const options = { ...defaultSimulationOptions, seed: 0 };

  const buildVacuum =
    (wasm: NodeWasmModule, course: ReturnType<typeof coursesService.getSimCourse>, racedef: ReturnType<typeof racedefToParams>) =>
    (runner: IRunnerState): WasmCompareData => {
      const sorter = createSkillSorterByGroup(runner.skills);
      const create = toCreateRunner({ ...runner }, runner.skills.toSorted(sorter));
      return wasm.runCompare(
        compareParamsToWasm({
          course,
          parameters: toSundayRaceParameters(racedef),
          settings: createPlannerCompareSettings(false, {}),
          duelingRates: DEFAULT_DUELING_RATES,
          runner: create,
          name: 'R',
          nsamples: N,
          masterSeed: 0
        })
      );
    };

  const countActivationRounds = (data: WasmCompareData, skillId: string): number =>
    data.rounds.reduce((acc, round) => {
      const primary = round.runners[0];
      const self = primary?.skillActivations?.[skillId]?.length ?? 0;
      const targeted = primary?.targetedSkillActivations?.[skillId]?.length ?? 0;
      return acc + (self + targeted > 0 ? 1 : 0);
    }, 0);

  for (const testCase of SKILL_PARITY_CASES) {
    it(
      `skill ${testCase.id} — ${testCase.label}`,
      { timeout: 240000 },
      () => {
        const wasm = loadWasm();
        const course = coursesService.getSimCourse(getDefaultCourseId());
        const racedef = racedefToParams(createRaceConditions());
        const vacuum = buildVacuum(wasm, course, racedef);

        const base = createRunnerState({ skills: [], speed: 1100, stamina: 1100, power: 900 });
        const withSkill = createRunnerState({
          skills: [testCase.id],
          speed: 1100,
          stamina: 1100,
          power: 900
        });

        const ts = runPlannerComparison({
          nsamples: N,
          course,
          racedef,
          runnerA: base,
          runnerB: withSkill,
          candidateSkills: [testCase.id],
          ignoreStaminaConsumption: false,
          options
        });

        const wBase = vacuum(base);
        const wCand = vacuum(withSkill);
        const w = computePlannerStats(wBase, wCand, N);

        const tsMean = ts.results.reduce((a, b) => a + b, 0) / ts.results.length;
        const wMean = w.results.reduce((a, b) => a + b, 0) / w.results.length;
        const activationRounds = countActivationRounds(wCand, testCase.id);

        // Bashin-delta mean parity (absolute tolerance per case).
        expect(Math.abs(tsMean - wMean)).toBeLessThan(testCase.meanTol);

        if (testCase.activates) {
          // Bug #1 regression: an activating skill MUST yield non-empty
          // skillActivations in the compare collector.
          expect(activationRounds).toBeGreaterThan(0);
          // And it must actually move the result (non-trivial bashin).
          expect(Math.abs(wMean)).toBeGreaterThan(0.01);
        }
      }
    );
  }
});

function runNineRunnerParity() {
    const wasm = loadWasm();
    const course = coursesService.getSimCourse(getDefaultCourseId());
    const racedef = racedefToParams(createRaceConditions());
    const RN = 500;

    const strategies: Array<IStrategyName> = [
      'Front Runner',
      'Pace Chaser',
      'Late Surger',
      'End Closer',
      'Front Runner',
      'Pace Chaser',
      'Late Surger',
      'End Closer',
      'Pace Chaser'
    ];
    const states = strategies.map((strategy, i) =>
      createRunnerState({ strategy, speed: 880 + i * 50, stamina: 900 + i * 40, power: 650 + i * 25, skills: [] })
    );
    const sorter = createSkillSorterByGroup([]);
    const runners = states.map((s) => toCreateRunner({ ...s }, s.skills.toSorted(sorter)));

    const params = {
      course,
      parameters: toSundayRaceParameters(racedef),
      runners,
      nsamples: RN,
      masterSeed: 0,
      focusRunnerIds: []
    };

    const tsResult = runRaceSim(params);
    const wasmResult = wasm.runRaceSim(raceSimParamsToWasm(params, (_r, i) => `R${i}`));

    const meanRank = (orders: Array<Array<{ runnerId: number }>>) => {
      const sum = new Array(9).fill(0);
      const cnt = new Array(9).fill(0);
      for (const round of orders) {
        round.forEach((e, rank) => {
          sum[e.runnerId] += rank;
          cnt[e.runnerId] += 1;
        });
      }
      return sum.map((s, i) => (cnt[i] > 0 ? s / cnt[i] : 0));
    };

    const tsRank = meanRank(tsResult.finishOrders);
    const wRank = meanRank(wasmResult.finishOrders);

    // Fork B bar: mean finish rank per gate within 1.0 place.
    for (let i = 0; i < 9; i++) {
      expect(Math.abs(tsRank[i] - wRank[i])).toBeLessThan(1.0);
    }
}
