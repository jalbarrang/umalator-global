import { z } from 'zod';
import { aptitudeNames, moods, strategyNames } from '@/lib/sunday-tools/runner/definitions';
import {
  grades,
  groundConditions,
  seasons,
  timeOfDays,
  weathers,
} from '@/lib/sunday-tools/course/definitions';

export const RunnerConfigSchema = z.object({
  outfitId: z.string(),
  speed: z.number().min(0).max(2000),
  stamina: z.number().min(0).max(2000),
  power: z.number().min(0).max(2000),
  guts: z.number().min(0).max(2000),
  wisdom: z.number().min(0).max(2000),
  strategy: z.enum(strategyNames),
  distanceAptitude: z.enum(aptitudeNames),
  surfaceAptitude: z.enum(aptitudeNames),
  strategyAptitude: z.enum(aptitudeNames),
  mood: z.literal(moods),
  skills: z.array(z.string()),
  forcedSkillPositions: z.record(z.string(), z.number()).optional().default({}),
  randomMobId: z.number().optional().default(8573),
});

export const RaceConditionsSchema = z.object({
  mood: z.literal(moods),
  ground: z.literal(groundConditions),
  weather: z.literal(weathers),
  season: z.literal(seasons),
  time: z.literal(timeOfDays),
  grade: z.literal(grades),
});

export const DebugConfigSchema = z.object({
  runner: RunnerConfigSchema,
  courseId: z.number(),
  raceConditions: RaceConditionsSchema,
});

export type DebugConfig = z.infer<typeof DebugConfigSchema>;
