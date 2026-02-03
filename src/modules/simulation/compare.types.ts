import { cloneDeep } from 'es-toolkit';
import type { ISkillPerspective, ISkillTarget, ISkillType } from './lib/skills/definitions';

export interface CompareResult {
  results: Array<number>;
  runData: SimulationData;
  rushedStats: Stats;
  leadCompetitionStats: Stats;
  spurtInfo: null;
  staminaStats: StaminaStats;
  firstUmaStats: FirstUMAStats;
}

export interface FirstUMAStats {
  uma1: FirstUMAStatsUma1;
  uma2: FirstUMAStatsUma1;
}

export interface FirstUMAStatsUma1 {
  firstPlaceRate: number;
}

export interface Stats {
  uma1: LeadCompetitionStatsUma1;
  uma2: LeadCompetitionStatsUma1;
}

export interface LeadCompetitionStatsUma1 {
  min: number;
  max: number;
  mean: number;
  frequency: number;
}

export interface SimulationData {
  minrun: SimulationRun;
  maxrun: SimulationRun;
  meanrun: SimulationRun;
  medianrun: SimulationRun;
}

export type SkillSimulationData = {
  minrun: SkillSimulationRun;
  maxrun: SkillSimulationRun;
  meanrun: SkillSimulationRun;
  medianrun: SkillSimulationRun;
};

export interface SimulationRun {
  t: Array<Array<number>>;
  p: Array<Array<number>>;
  v: Array<Array<number>>;
  hp: Array<Array<number>>;
  currentLane: Array<Array<number>>;
  pacerGap: Array<Array<number>>;
  sk: [SkillActivationMap, SkillActivationMap];
  sdly: Array<number>;
  rushed: Array<Array<RegionActivation>>;
  posKeep: Array<Array<Array<number>>>;
  competeFight: Array<RegionActivation | []>;
  leadCompetition: Array<RegionActivation | []>;
  pacerV: Array<Array<number>>;
  pacerP: Array<Array<number>>;
  pacerT: Array<Array<number>>;
  pacerPosKeep: Array<Array<Array<number>>>;
  pacerLeadCompetition: Array<RegionActivation | []>;
}

export interface SkillSimulationRun {
  sk: [SkillActivationMap, SkillActivationMap];
}

// [RegionStart, RegionEnd]
export type RegionActivation = [number, number];

/**
 * Metadata for tracking skill activations
 *
 * this type takes care to store data used for skill comparison simulation purposes
 */
export type SkillTrackedMeta = {
  /**
   * The length of the horse gained from the skill, recorded at the end of the race.
   */
  horseLength: number;
  /**
   * The positions this skill was activated at
   */
  positions: Array<number>;
};

export type SkillTrackedMetaCollection = Array<SkillTrackedMeta>;

export type SkillEffectLog = {
  executionId: string;
  skillId: string;
  start: number;
  end: number;
  perspective: ISkillPerspective;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

export type SkillActivationMap = Record<string, Array<SkillEffectLog>>;

export interface StaminaStats {
  uma1: StaminaStatsUma1;
  uma2: StaminaStatsUma1;
}

export interface StaminaStatsUma1 {
  staminaSurvivalRate: number;
  fullSpurtRate: number;
}

const defaultSimulationRun: SimulationRun = {
  t: [[], []],
  p: [[], []],
  v: [[], []],
  hp: [[], []],
  currentLane: [[], []],
  pacerGap: [[], []],
  sk: [{}, {}],
  sdly: [0, 0],
  rushed: [[], []],
  posKeep: [[], []],
  competeFight: [[], []],
  leadCompetition: [[], []],
  pacerV: [[], [], []],
  pacerP: [[], [], []],
  pacerT: [[], [], []],
  pacerPosKeep: [[], [], []],
  pacerLeadCompetition: [[], [], []],
};

export const initializeSimulationRun = (
  simulationRun: Partial<SimulationRun> = {},
): SimulationRun => ({
  ...cloneDeep(defaultSimulationRun),
  ...simulationRun,
});

export const initializeSkillSimulationRun = (
  skillSimulationRun: Partial<SkillSimulationRun> = {},
): SkillSimulationRun => ({
  sk: [{}, {}],
  ...skillSimulationRun,
});
