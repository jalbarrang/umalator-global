import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CreateRunner } from '@/lib/sunday-tools/common/runner';
import type {
  DuelingRates,
  RaceLifecycleObserver,
  SimulationSettings,
  RaceParameters as SundayRaceParameters,
} from '@/lib/sunday-tools/common/race';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { ISkillTarget, ISkillType } from '@/lib/sunday-tools/skills/definitions';
import type { RunComparisonParams } from '@/modules/simulation/types';
import { Race } from '@/lib/sunday-tools/common/race';
import { parseAptitudeName, parseStrategyName } from '@/lib/sunday-tools/runner/runner.types';
import { SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import { getSkillById, getSkillMetaById } from '@/modules/skills/utils';

export type EffectMeta = {
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

export const DEFAULT_DUELING_RATES: DuelingRates = {
  runaway: 10,
  frontRunner: 10,
  paceChaser: 10,
  lateSurger: 10,
  endCloser: 10,
};

export function normalizeSkillId(skillId: string): string {
  return skillId.split('-')[0] ?? skillId;
}

export function isSameSkill(skillIdA: string, skillIdB: string): boolean {
  return skillIdA === skillIdB || normalizeSkillId(skillIdA) === normalizeSkillId(skillIdB);
}

export function getSkillEffectMetadata(skillId: string): Array<EffectMeta> {
  const baseSkillId = normalizeSkillId(skillId);
  let effects: Array<{ type: number; target?: number }> = [];
  try {
    const skillData = getSkillById(baseSkillId);
    effects = skillData.alternatives?.[0]?.effects ?? [];
  } catch {
    effects = [];
  }

  if (effects.length === 0) {
    return [{ effectType: SkillType.Noop, effectTarget: SkillTarget.Self }];
  }

  return effects.map((effect) => ({
    effectType: (effect.type ?? SkillType.Noop) as ISkillType,
    effectTarget: (effect.target ?? SkillTarget.Self) as ISkillTarget,
  }));
}

export function getFallbackEffectMeta(skillId: string): EffectMeta {
  return getSkillEffectMetadata(skillId)[0];
}

export function createSkillSorterByGroup(allSkills: Array<string>) {
  const commonSkills = Array.from(new Set(allSkills.toSorted((a, b) => +a - +b)));

  const getCommonGroupIndex = (id: string) => {
    try {
      const baseId = normalizeSkillId(id);
      const groupId = getSkillMetaById(baseId).groupId;
      const index = commonSkills.findIndex((skillId) => {
        const commonBaseId = normalizeSkillId(skillId);
        return getSkillMetaById(commonBaseId).groupId === groupId;
      });
      return index > -1 ? index : commonSkills.length;
    } catch {
      return commonSkills.length;
    }
  };

  return (a: string, b: string) => {
    const groupIndexA = getCommonGroupIndex(a);
    const groupIndexB = getCommonGroupIndex(b);
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
    return +normalizeSkillId(a) - +normalizeSkillId(b);
  };
}

export function toCreateRunner(
  runner: RunnerState,
  sortedSkills: Array<string>,
  forcedPositions?: Record<string, number>,
): CreateRunner {
  return {
    outfitId: runner.outfitId,
    mood: runner.mood,
    strategy: parseStrategyName(runner.strategy),
    aptitudes: {
      distance: parseAptitudeName(runner.distanceAptitude),
      surface: parseAptitudeName(runner.surfaceAptitude),
      strategy: parseAptitudeName(runner.strategyAptitude),
    },
    stats: {
      speed: runner.speed,
      stamina: runner.stamina,
      power: runner.power,
      guts: runner.guts,
      wit: runner.wisdom,
    },
    skills: sortedSkills,
    forcedPositions,
  };
}

export function toSundayRaceParameters(
  racedef: RunComparisonParams['racedef'],
): SundayRaceParameters {
  const race = racedef as Record<string, unknown>;

  const ground = (race.ground ?? race.groundCondition) as SundayRaceParameters['ground'];
  const weather = race.weather as SundayRaceParameters['weather'];
  const season = race.season as SundayRaceParameters['season'];
  const timeOfDay = (race.timeOfDay ?? race.time) as SundayRaceParameters['timeOfDay'];
  const grade = race.grade as SundayRaceParameters['grade'];

  if (ground == null || weather == null || season == null || timeOfDay == null || grade == null) {
    throw new Error('Invalid race conditions for Sunday engine migration');
  }

  return { ground, weather, season, timeOfDay, grade };
}

export function createCompareSettings(
  overrides: Partial<Omit<SimulationSettings, 'mode'>> = {},
): SimulationSettings {
  return {
    mode: 'compare',
    healthSystem: false,
    sectionModifier: false,
    rushed: false,
    downhill: false,
    spotStruggle: false,
    dueling: false,
    witChecks: false,
    ...overrides,
  };
}

export function createInitializedRace(params: {
  course: CourseData;
  raceParameters: SundayRaceParameters;
  settings: SimulationSettings;
  duelingRates: DuelingRates;
  skillSamples: number;
  runner: CreateRunner;
  collector?: RaceLifecycleObserver;
}): Race {
  const race = new Race({
    course: params.course,
    parameters: params.raceParameters,
    settings: params.settings,
    skillSamples: params.skillSamples,
    duelingRates: params.duelingRates,
    collector: params.collector,
  });

  race.onInitialize();
  race.skillSamples = params.skillSamples;
  race.addRunner(params.runner);
  race.prepareRace().validateRaceSetup();

  return race;
}

export function computePositionDiff(positionA: Array<number>, positionB: Array<number>): number {
  if (positionA.length === 0 || positionB.length === 0) {
    throw new Error('Position data is empty while computing position difference');
  }

  if (positionB.length <= positionA.length) {
    const bFrames = positionB.length;
    return positionB[bFrames - 1] - positionA[bFrames - 1];
  }

  const aFrames = positionA.length;
  return positionB[aFrames - 1] - positionA[aFrames - 1];
}
