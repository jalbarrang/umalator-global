import type { IMood, IStrategyName } from '@/lib/uma-domain/runner/definitions';
import { Mood } from '@/lib/uma-domain/runner/definitions';

const defaultRunnerState: IRunnerState = {
  outfitId: '',
  speed: 1200,
  stamina: 1200,
  power: 800,
  guts: 400,
  wisdom: 400,
  strategy: 'Front Runner',
  distanceAptitude: 'A',
  surfaceAptitude: 'A',
  strategyAptitude: 'A',
  mood: Mood.Great,
  skills: [],
  randomMobId: Math.floor(Math.random() * 624) + 8000
};

export const createRunnerState = (props: Partial<IRunnerState> = {}): IRunnerState => ({
  ...defaultRunnerState,
  randomMobId: Math.floor(Math.random() * 624) + 8000,
  ...props
});

export type IRunnerState = {
  outfitId: string;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategyName;
  distanceAptitude: string;
  surfaceAptitude: string;
  strategyAptitude: string;
  mood: IMood;
  skills: Array<string>;
  team?: number | null; // CM/LoH team grouping (1-based); null/undefined = no team
  gate?: number | null; // 1-based post/gate position; null/undefined = auto-assign
  rankScore?: number | null; // Game character-strength score (from imported races)
  star?: number | null; // Character star rating (1-5); affects unique-skill evaluation
  popularity?: number | null; // Manual betting-popularity rank override (1-based); null = auto
  imported?: boolean; // Runner came from a race import (e.g. Hakuraku); star is irrelevant
  skillLevels?: Record<string, number>; // base skill id -> level (incl. unique)
  aptitudes?: RunnerAptitudes; // Full 10-bucket aptitude grades (fidelity over the 3 collapsed)
  randomMobId?: number; // For placeholder image when no uma selected
  linkedRunnerId?: string; // Link to saved runner in library
};

// Per-bucket aptitude grades (letters S..G). Used when richer fidelity than the
// three collapsed grades is available (e.g. imported rosters).
export type RunnerAptitudes = {
  distanceShort: string;
  distanceMile: string;
  distanceMiddle: string;
  distanceLong: string;
  turf: string;
  dirt: string;
  nige: string;
  senko: string;
  sashi: string;
  oikomi: string;
};

export const runawaySkillId = '202051' as const;
