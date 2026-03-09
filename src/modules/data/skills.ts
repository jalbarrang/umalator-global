import type { SkillsMap } from './skill-types';
import { getRuntimeSkills } from './runtime-data-context';

export function getSkills(): SkillsMap {
  return getRuntimeSkills();
}

// Preserve the legacy `skills[id]` / `Object.entries(skills)` API while serving live store data.
export const skills = new Proxy({} as SkillsMap, {
  get: (_target, prop) => Reflect.get(getSkills(), prop),
  has: (_target, prop) => Reflect.has(getSkills(), prop),
  ownKeys: () => Reflect.ownKeys(getSkills()),
  getOwnPropertyDescriptor: (_target, prop) =>
    Reflect.getOwnPropertyDescriptor(getSkills(), prop) ?? {
      configurable: true,
      enumerable: true,
      writable: false,
      value: undefined,
    },
}) as SkillsMap;

export type { SkillEntry, SkillsMap, SkillSource } from './skill-types';
