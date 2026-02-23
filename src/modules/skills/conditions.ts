import type { Operator } from '@/lib/sunday-tools/skills/parser/definitions';
import { createParser } from '@/lib/sunday-tools/skills/parser/ConditionParser';
import { mockConditions } from '@/lib/sunday-tools/skills/parser/ConditionMatcher';
import { skills } from '@/modules/data/skills';

const Parser = createParser({
  conditions: mockConditions,
});

export const parseSkillCondition = (skillCondition: string) => {
  return Parser.parseAny(skillCondition);
};

const tokenizeSkillsConditions = () => {
  const conditionEntries = Object.entries(skills);

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
