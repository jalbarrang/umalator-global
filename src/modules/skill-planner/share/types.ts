import type { HintLevel } from '../types';

export type SkillPlannerExportSkill = {
  skill_id: number;
  hint_level: HintLevel;
};

export type SkillPlannerExportData = {
  card_id: number;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wiz: number;
  proper_distance_short: number;
  proper_distance_mile: number;
  proper_distance_middle: number;
  proper_distance_long: number;
  proper_ground_turf: number;
  proper_ground_dirt: number;
  proper_running_style_nige: number;
  proper_running_style_senko: number;
  proper_running_style_sashi: number;
  proper_running_style_oikomi: number;
  strategy: number;
  mood: number;
  budget: number;
  fast_learner: boolean;
  obtained_skills: Array<{ skill_id: number }>;
  candidate_skills: Array<SkillPlannerExportSkill>;
};
