export interface ISkill {
  activation: number;
  char?: number[];
  condition_groups: ISkillConditionGroup[];
  desc_en?: string;
  desc_ko?: string;
  desc_tw?: string;
  endesc: string;
  enname: string;
  gene_version?: ISkillGeneVersion;
  iconid: number;
  id: number;
  jpdesc: string;
  jpname: string;
  loc?: ISkillLocalization;
  name_en?: string;
  name_ko?: string;
  name_tw?: string;
  rarity: number;
  type: Type[];
  cost?: number;
  versions?: number[];
  char_e?: number[];
  sup_e?: Array<number[]>;
  sup_hint?: Array<number[]>;
  sce_e?: number[];
  evo?: Evo[];
  evo_cond?: Array<
    Array<Array<Array<number | string> | number | null | string>>
  >;
  pre_evo?: PreEvo;
}

export interface ISkillConditionGroup {
  base_time: number;
  condition: string;
  effects: PurpleEffect[];
  precondition?: string;
  cd?: number;
  time_scale?: number;
}

export interface PurpleEffect {
  type: number;
  value: number;
  target?: number;
  target_details?: number;
  value_scale?: number;
  max_procs?: number;
}

export interface Evo {
  card_id?: number;
  evos: number[];
  scenario_id?: number;
}

export interface ISkillGeneVersion {
  activation: number;
  condition_groups: ISkillConditionGroup[];
  cost?: number;
  desc_en?: string;
  desc_ko?: string;
  desc_tw?: string;
  iconid: number;
  id: number;
  inherited: boolean;
  name_en?: string;
  name_ko?: string;
  name_tw?: string;
  parent_skills: number[];
  rarity: number;
}

export interface ISkillLocalization {
  en?: ISkillEnglishLocale; // Global
}

export interface ISkillEnglishLocale {
  char?: number[];
  condition_groups?: ISkillEnglishConditionGroup[];
  gene_version?: ISkillEnglishGeneVersion;
  type?: Type[];
  sup_e?: Array<number[]>;
  sup_hint?: Array<number[]>;
  char_e?: number[];
  iconid?: number;
}

export interface ISkillEnglishConditionGroup {
  base_time: number;
  condition: string;
  effects: FluffyEffect[];
  precondition?: string;
  cd?: number;
}

export interface FluffyEffect {
  type: number;
  value: number;
  target?: number;
  target_details?: number;
}

export interface ISkillEnglishGeneVersion {
  condition_groups: ISkillEnglishConditionGroup[];
  iconid?: number;
}

export enum Type {
  Btw = 'btw',
  Cha = 'cha',
  Cor = 'cor',
  Dbf = 'dbf',
  Dir = 'dir',
  FC = 'f_c',
  FS = 'f_s',
  L0 = 'l_0',
  L1 = 'l_1',
  L2 = 'l_2',
  L3 = 'l_3',
  Ldr = 'ldr',
  Lng = 'lng',
  Med = 'med',
  Mil = 'mil',
  Nac = 'nac',
  Run = 'run',
  Sho = 'sho',
  Slo = 'slo',
  Str = 'str',
  Tur = 'tur',
}

export interface PreEvo {
  card_id?: number;
  old: number;
  scenario_id?: number;
}
