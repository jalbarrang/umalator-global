import type { IMood, IStrategyName } from 'sunday-tools/runner/definitions';
import { Mood } from 'sunday-tools/runner/definitions';

export const defaultRunnerState: IRunnerState = {
  outfitId: '',
  speed: 1200,
  stamina: 1200,
  power: 800,
  guts: 400,
  wisdom: 400,
  strategy: 'Front Runner',
  distanceAptitude: 'S',
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
  randomMobId?: number; // For placeholder image when no uma selected
  linkedRunnerId?: string; // Link to saved runner in library
};

export const runawaySkillId = '202051' as const;
