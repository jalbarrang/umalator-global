import { createParser } from '../simulation/lib/skills/parser/ConditionParser';
import type { Operator } from '../simulation/lib/skills/parser/definitions';
import SkillsDataList from '@/modules/data/skill_data.json';

import { mockConditions } from '@/modules/simulation/lib/skills/parser/ConditionMatcher';

const Parser = createParser({
  conditions: mockConditions,
});

export const parseSkillCondition = (skillCondition: string) => {
  return Parser.parseAny(skillCondition);
};

const tokenizeSkillsConditions = () => {
  return Object.entries(SkillsDataList).reduce(
    (acc, [id, skillData]) => {
      acc[id] = skillData.alternatives.map((alternative) => Parser.parse(alternative.condition));
      return acc;
    },
    {} as Record<string, Array<Operator>>,
  );
};

export const tokenizedConditions = tokenizeSkillsConditions();

// Operation Parser
