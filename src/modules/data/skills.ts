import _skills from './skills.json';
import type { SkillsMap } from './skill-types';

export const skills = _skills as SkillsMap;

export type { SkillEntry, SkillsMap, SkillSource } from './skill-types';
