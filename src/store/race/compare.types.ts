import { SkillId } from '@/modules/skills/utils';

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
  sk: Sk[];
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

export type RegionActivation = [number, number];
export type Sk = Map<SkillId, RegionActivation[]>;

export interface StaminaStats {
  uma1: StaminaStatsUma1;
  uma2: StaminaStatsUma1;
}

export interface StaminaStatsUma1 {
  staminaSurvivalRate: number;
  fullSpurtRate: number;
}
