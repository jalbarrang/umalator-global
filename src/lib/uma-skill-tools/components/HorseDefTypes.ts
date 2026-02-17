import { Map as ImmMap, Record } from 'immutable';
import type { Mood } from '../sim/RaceParameters';

import skillsMeta from '@/modules/data/skill_meta.json';

export function isDebuffSkill(id: string) {
  // iconId 3xxxx is the debuff icons
  // i think this basically matches the intuitive behavior of being able to add multiple debuff skills and not other skills;
  // e.g. there are some skills with both a debuff component and a positive component and typically it doesnt make sense to
  // add multiple of those
  return skillsMeta[id as keyof typeof skillsMeta].iconId[0] == '3';
}

export function SkillSet(ids: Array<string>) {
  const entries: Array<[string, string]> = [];
  let ndebuff = 0;

  for (const id of ids) {
    const groupId = skillsMeta[id as keyof typeof skillsMeta].groupId;
    if (!isDebuffSkill(id)) {
      entries.push([`${groupId}`, id]);
      continue;
    }

    entries.push([groupId + '-' + ndebuff, id]);
    ndebuff++;
  }

  return ImmMap(entries);
}

const CC_GLOBAL = true;

export class HorseState extends Record({
  outfitId: '',
  speed: CC_GLOBAL ? 1200 : 1850,
  stamina: CC_GLOBAL ? 1200 : 1700,
  power: CC_GLOBAL ? 800 : 1700,
  guts: CC_GLOBAL ? 400 : 1200,
  wisdom: CC_GLOBAL ? 400 : 1300,
  strategy: 'Senkou',
  distanceAptitude: 'S',
  surfaceAptitude: 'A',
  strategyAptitude: 'A',
  mood: 2 as Mood,
  skills: SkillSet([]),
  // Map of skillId -> forced position (in meters). If a skill is in this map, it will be forced to activate at that position.
  forcedSkillPositions: ImmMap<string, number>(),
}) {}
