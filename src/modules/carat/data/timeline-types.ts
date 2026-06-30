type TimelineCardType = 'character' | 'support' | null;
export type TimelinePredictionKind = 'confirmed' | 'interpolated' | 'extrapolated';
type TimelineBannerType = 'character_banner' | 'support_card_banner' | 'paid_banner';
type TimelineNonBannerType = 'campaign' | 'story_event' | 'champions_meeting' | 'legend_race';

type TimelinePrediction = {
  kind: TimelinePredictionKind;
  confidence?: number;
  based_on?: string;
  days_offset?: number;
  note?: string;
  [key: string]: unknown;
};

export type TimelineEvent = {
  id: string;
  card_type: TimelineCardType;
  type: TimelineBannerType | TimelineNonBannerType | string;
  title?: string | null;
  description?: string | null;
  gacha_id?: number | string | null;
  gacha_ids?: Array<number | string> | null;
  gacha_type?: string | null;
  global_release_date?: string | null;
  jp_release_date?: string | null;
  estimated_end_date?: string | null;
  banner_duration_days?: number | null;
  pickup_card_ids?: number[] | null;
  related_characters?: string[] | null;
  related_support_cards?: string[] | null;
  image?: string | null;
  image_path?: string | null;
  gametora_url?: string | null;
  is_confirmed?: boolean | null;
  prediction?: TimelinePrediction | null;
  source?: string | null;
  tags?: string[] | null;
  year?: number | null;
};

export type TimelineAnniversary = {
  date?: string;
  global_date?: string;
  jp_date?: string;
  label?: string;
  year?: number;
  index?: number;
  is_confirmed?: boolean;
  [key: string]: unknown;
};

type TimelineCalculation = {
  generated_at?: string;
  source?: string;
  [key: string]: unknown;
};

export type TimelinePayload = {
  anniversaries: TimelineAnniversary[];
  calculation: TimelineCalculation;
  events: TimelineEvent[];
  version: string;
};
