import { DEFAULT_COURSE_ID, DEFAULT_SAMPLES, DEFAULT_SEED } from './constants';
import { createRaceConditions } from './races';
import type { RaceConditions } from './races';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { IPosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';

export async function serialize(
  courseId: number,
  nsamples: number,
  seed: number,
  posKeepMode: IPosKeepMode,
  racedef: RaceConditions,
  uma1: RunnerState,
  uma2: RunnerState,
  pacer: RunnerState,
  showVirtualPacemakerOnGraph: boolean,
  pacemakerCount: number,
  selectedPacemakers: Array<boolean>,
  showLanes: boolean,
  witVarianceSettings: {
    allowRushedUma1: boolean;
    allowRushedUma2: boolean;
    allowDownhillUma1: boolean;
    allowDownhillUma2: boolean;
    allowSectionModifierUma1: boolean;
    allowSectionModifierUma2: boolean;
    allowSkillCheckChanceUma1: boolean;
    allowSkillCheckChanceUma2: boolean;
    simWitVariance: boolean;
  },
) {
  const json = JSON.stringify({
    courseId,
    nsamples,
    seed,
    posKeepMode,
    racedef: racedef,
    uma1: uma1,
    uma2: uma2,
    pacer: pacer,
    witVarianceSettings,
    showVirtualPacemakerOnGraph,
    pacemakerCount,
    selectedPacemakers,
    showLanes,
  });

  const enc = new TextEncoder();
  const stringStream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(json));
      controller.close();
    },
  });

  const zipped = stringStream.pipeThrough(new CompressionStream('gzip'));
  const reader = zipped.getReader();
  let buf = new Uint8Array();
  let result;
  while ((result = await reader.read())) {
    if (result.done) {
      return encodeURIComponent(btoa(String.fromCharCode(...buf)));
    } else {
      buf = new Uint8Array([...buf, ...result.value]);
    }
  }
}

export async function deserialize(hash: string) {
  const zipped = atob(decodeURIComponent(hash));
  const buf = new Uint8Array(zipped.split('').map((c) => c.charCodeAt(0)));
  const stringStream = new ReadableStream({
    start(controller) {
      controller.enqueue(buf);
      controller.close();
    },
  });

  const unzipped = stringStream.pipeThrough(new DecompressionStream('gzip'));
  const reader = unzipped.getReader();
  const decoder = new TextDecoder();
  let json = '';
  let result;

  while ((result = await reader.read())) {
    if (result.done) {
      try {
        const o = JSON.parse(json);

        const uma1: RunnerState = {
          ...o.uma1,
          skills: Array.from(o.uma1.skills),
          forcedSkillPositions: new Map(o.uma1.forcedSkillPositions),
        };

        const uma2: RunnerState = {
          ...o.uma2,
          skills: Array.from(o.uma2.skills),
          forcedSkillPositions: new Map(o.uma2.forcedSkillPositions),
        };

        const pacer: RunnerState = {
          ...o.pacer,
          skills: Array.from(o.pacer.skills ?? []),
          forcedSkillPositions: new Map(o.pacer.forcedSkillPositions ?? {}),
        };

        return {
          courseId: o.courseId,
          nsamples: o.nsamples,
          seed: o.seed ?? DEFAULT_SEED, // field added later, could be undefined when loading state from existing links
          posKeepMode:
            o.posKeepMode != null
              ? o.posKeepMode
              : o.usePosKeep
                ? PosKeepMode.Approximate
                : PosKeepMode.None, // backward compatibility
          racedef: createRaceConditions(o.racedef),
          uma1,
          uma2,
          pacer,
          witVarianceSettings: o.witVarianceSettings || {
            allowRushedUma1: true,
            allowRushedUma2: true,
            allowDownhillUma1: true,
            allowDownhillUma2: true,
            allowSectionModifierUma1: true,
            allowSectionModifierUma2: true,
            allowSkillCheckChanceUma1: true,
            allowSkillCheckChanceUma2: true,
            simWitVariance: true,
          },
          showVirtualPacemakerOnGraph:
            o.showVirtualPacemakerOnGraph != null ? o.showVirtualPacemakerOnGraph : false,
          pacemakerCount: o.pacemakerCount != null ? o.pacemakerCount : 1,
          selectedPacemakers:
            o.selectedPacemakers != null ? o.selectedPacemakers : [false, false, false],
          showLanes: o.showLanes != null ? o.showLanes : false,
        };
      } catch {
        return {
          courseId: DEFAULT_COURSE_ID,
          nsamples: DEFAULT_SAMPLES,
          seed: DEFAULT_SEED,
          posKeepMode: PosKeepMode.Approximate,
          racedef: createRaceConditions(),
          uma1: createRunnerState(),
          uma2: createRunnerState(),
          pacer: createRunnerState({ strategy: 'Front Runner' }),
          witVarianceSettings: {
            allowRushedUma1: true,
            allowRushedUma2: true,
            allowDownhillUma1: true,
            allowDownhillUma2: true,
            allowSectionModifierUma1: true,
            allowSectionModifierUma2: true,
            allowSkillCheckChanceUma1: true,
            allowSkillCheckChanceUma2: true,
            simWitVariance: true,
          },
          showVirtualPacemakerOnGraph: false,
          pacemakerCount: 1,
          selectedPacemakers: [false, false, false],
          showLanes: false,
        };
      }
    } else {
      json += decoder.decode(result.value);
    }
  }
}

export async function saveToLocalStorage(
  courseId: number,
  nsamples: number,
  seed: number,
  posKeepMode: IPosKeepMode,
  racedef: RaceConditions,
  uma1: RunnerState,
  uma2: RunnerState,
  pacer: RunnerState,
  showVirtualPacemakerOnGraph: boolean,
  pacemakerCount: number,
  selectedPacemakers: Array<boolean>,
  showLanes: boolean,
  witVarianceSettings: {
    allowRushedUma1: boolean;
    allowRushedUma2: boolean;
    allowDownhillUma1: boolean;
    allowDownhillUma2: boolean;
    allowSectionModifierUma1: boolean;
    allowSectionModifierUma2: boolean;
    allowSkillCheckChanceUma1: boolean;
    allowSkillCheckChanceUma2: boolean;
    simWitVariance: boolean;
  },
) {
  try {
    const hash = await serialize(
      courseId,
      nsamples,
      seed,
      posKeepMode,
      racedef,
      uma1,
      uma2,
      pacer,
      showVirtualPacemakerOnGraph,
      pacemakerCount,
      selectedPacemakers,
      showLanes,
      witVarianceSettings,
    );

    if (hash) {
      localStorage.setItem('umalator-settings', hash);
    }
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
}

export async function loadFromLocalStorage() {
  try {
    const hash = localStorage.getItem('umalator-settings');
    if (hash) {
      return await deserialize(hash);
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return null;
}
