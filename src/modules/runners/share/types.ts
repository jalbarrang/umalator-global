export type SingleExportSkill = {
  skill_id: number;
  skill_level: number;
};

export type SingleExportData = {
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
  create_time: string;
  rank_score?: number;
  skill_array: SingleExportSkill[];
};
