import SkillsDataList from '@data/skill_data.json';

import { getParser } from '@simulation/lib/ConditionParser';
import { mockConditions } from '@simulation/lib/tools/ConditionMatcher';
import { Operator } from '@simulation/lib/ActivationConditions';

const Parser = getParser(mockConditions);

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
    {} as Record<string, Operator[]>,
  );
};

export const tokenizedConditions = tokenizeSkillsConditions();

// Operation Parser
