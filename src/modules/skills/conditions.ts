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
  const conditionEntries = Object.entries(SkillsDataList);

  const acc: Record<string, Array<Operator>> = {};

  for (const [id, skillData] of conditionEntries) {
    const alternatives = skillData.alternatives;

    const operators: Array<Operator> = [];
    for (const alternative of alternatives) {
      const condition = alternative.condition;

      if (condition === '' || condition === undefined) {
        continue;
      }

      const operator = Parser.parse(condition);
      operators.push(operator);
    }

    acc[id] = operators;
  }

  return acc;
};

export const tokenizedConditions = tokenizeSkillsConditions();

// Operation Parser
