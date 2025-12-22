import SkillsDataList from '@data/skill_data.json';

import type { Operator } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';
import { mockConditions } from '@/modules/simulation/lib/skills/activation/ConditionMatcher';
import { getDefaultParser } from '@/modules/simulation/lib/skills/activation/ConditionParser';

const Parser = getDefaultParser(mockConditions);

export const parseSkillCondition = (skillCondition: string) => {
  return Parser.parseAny(Parser.tokenize(skillCondition));
};

const tokenizeSkillsConditions = () => {
  return Object.entries(SkillsDataList).reduce(
    (acc, [id, skillData]) => {
      acc[id] = skillData.alternatives.map((alternative) =>
        Parser.parse(Parser.tokenize(alternative.condition)),
      );
      return acc;
    },
    {} as Record<string, Array<Operator>>,
  );
};

export const tokenizedConditions = tokenizeSkillsConditions();

// Operation Parser
