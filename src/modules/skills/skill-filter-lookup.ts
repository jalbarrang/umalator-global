import { parseSkillCondition, tokenizedConditions } from '@/modules/skills/conditions';
import type { SkillService, SkillsMap } from '@/modules/data/services/SkillService';
import { treeMatch } from 'sunday-tools/skills/parser/ConditionMatcher';

type ConditionFilterMap = Record<string, Array<ReturnType<typeof parseSkillCondition>>>;

let conditionFilterMapCache: ConditionFilterMap | null = null;

function getConditionFilterMap(): ConditionFilterMap {
  if (conditionFilterMapCache) {
    return conditionFilterMapCache;
  }

  conditionFilterMapCache = {
    nige: [parseSkillCondition('running_style==1')],
    senkou: [parseSkillCondition('running_style==2')],
    sasi: [parseSkillCondition('running_style==3')],
    oikomi: [parseSkillCondition('running_style==4')],
    short: [parseSkillCondition('distance_type==1')],
    mile: [parseSkillCondition('distance_type==2')],
    medium: [parseSkillCondition('distance_type==3')],
    long: [parseSkillCondition('distance_type==4')],
    turf: [parseSkillCondition('ground_type==1')],
    dirt: [parseSkillCondition('ground_type==2')],
    phase0: [
      parseSkillCondition('phase==0'),
      parseSkillCondition('phase_random==0'),
      parseSkillCondition('phase_firsthalf_random==0'),
      parseSkillCondition('phase_laterhalf_random==0')
    ],
    phase1: [
      parseSkillCondition('phase==1'),
      parseSkillCondition('phase>=1'),
      parseSkillCondition('phase_random==1'),
      parseSkillCondition('phase_firsthalf_random==1'),
      parseSkillCondition('phase_laterhalf_random==1')
    ],
    phase2: [
      parseSkillCondition('phase==2'),
      parseSkillCondition('phase_random==2'),
      parseSkillCondition('phase_firsthalf_random==2'),
      parseSkillCondition('phase_laterhalf_random==2'),
      parseSkillCondition('phase_firstquarter_random==2'),
      parseSkillCondition('is_lastspurt==1')
    ],
    phase3: [
      parseSkillCondition('phase==3'),
      parseSkillCondition('phase>=2'),
      parseSkillCondition('phase_random==3'),
      parseSkillCondition('phase_firsthalf_random==3'),
      parseSkillCondition('phase_laterhalf_random==3')
    ],
    finalcorner: [
      parseSkillCondition('is_finalcorner==1'),
      parseSkillCondition('is_finalcorner_laterhalf==1'),
      parseSkillCondition('is_finalcorner_random==1')
    ],
    finalstraight: [
      parseSkillCondition('is_finalcorner==1'),
      parseSkillCondition('is_last_straight_onetime==1'),
      parseSkillCondition('is_finalcorner==1&corner==0')
    ]
  };

  return conditionFilterMapCache;
}

const generateSkillFilterLookUp = (skillsToMatch: SkillsMap) => {
  const filterLookup: Record<string, Set<string>> = {};
  const filterMapEntries = Object.entries(getConditionFilterMap());

  for (const [filterKey, ops] of filterMapEntries) {
    filterLookup[filterKey] = new Set();

    for (const id of Object.keys(skillsToMatch)) {
      const conditions = tokenizedConditions[id];
      if (!conditions) continue;

      const matches = ops.some((op) => conditions.some((alt) => treeMatch(op, alt)));

      if (matches) {
        filterLookup[filterKey].add(id);
      }
    }
  }

  return filterLookup;
};

export let skillFilterLookUp: Record<string, Set<string>> = {};

export function rebuildSkillFilterLookUp(skillsService: SkillService): void {
  const skillCollectionAsMap = skillsService.getAll().reduce((acc, skill) => {
    acc[skill.id] = skill;
    return acc;
  }, {} as SkillsMap);

  skillFilterLookUp = generateSkillFilterLookUp(skillCollectionAsMap);
}
