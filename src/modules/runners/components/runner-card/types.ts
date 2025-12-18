import { Mood } from '@simulation/lib/RaceParameters';

export const defaultRunnerState: RunnerState = {
  outfitId: '',
  speed: 1200,
  stamina: 1200,
  power: 800,
  guts: 400,
  wisdom: 400,
  strategy: 'Senkou',
  distanceAptitude: 'S',
  surfaceAptitude: 'A',
  strategyAptitude: 'A',
  mood: 2 as Mood,
  skills: [],
  // Map of skillId -> forced position (in meters). If a skill is in this map, it will be forced to activate at that position.
  forcedSkillPositions: {},
  randomMobId: Math.floor(Math.random() * 624) + 8000,
};

export const createRunnerState = (
  props: Partial<RunnerState> = {},
): RunnerState => ({
  ...defaultRunnerState,
  randomMobId: Math.floor(Math.random() * 624) + 8000,
  ...props,
});

export type RunnerState = {
  outfitId: string;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: string;
  distanceAptitude: string;
  surfaceAptitude: string;
  strategyAptitude: string;
  mood: Mood;
  skills: string[];
  forcedSkillPositions: Record<string, number>; // TODO: Change to Map for easier serialization
  randomMobId?: number; // For placeholder image when no uma selected
  linkedRunnerId?: string; // Link to saved runner in library
};
