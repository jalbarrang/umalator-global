import { cloneDeep } from 'es-toolkit';

export interface CompareResult {
  results: number[];
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

export interface SimulationRun {
  t: Array<number[]>;
  p: Array<number[]>;
  v: Array<number[]>;
  hp: Array<number[]>;
  currentLane: Array<number[]>;
  pacerGap: Array<number[]>;
  sk: SkillActivationMap[];
  sdly: number[];
  rushed: RegionActivation[][];
  posKeep: Array<Array<number[]>>;
  competeFight: Array<RegionActivation | []>;
  leadCompetition: Array<RegionActivation | []>;
  pacerV: Array<number[]>;
  pacerP: Array<number[]>;
  pacerT: Array<number[]>;
  pacerPosKeep: Array<Array<number[]>>;
  pacerLeadCompetition: Array<RegionActivation | []>;
}

// [RegionStart, RegionEnd]
export type RegionActivation = [number, number];
// export type Sk = Map<string, RegionActivation[]>;
export type SkillActivation = [
  start: number,
  end: number,
  perspective: string,
  type: string,
  // perspective: ISkillPerspective,
  // skillType: ISkillType,
  // target: ISkillTarget,
];
export type SkillActivationMap = Map<string, SkillActivation[]>;

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
  sk: [new Map(), new Map()],
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
