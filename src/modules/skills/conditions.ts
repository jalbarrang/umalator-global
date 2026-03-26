import type { Operator } from '@/lib/sunday-tools/skills/parser/definitions';
import { createParser } from '@/lib/sunday-tools/skills/parser/ConditionParser';
import { mockConditions } from '@/lib/sunday-tools/skills/parser/ConditionMatcher';
import { getSkills } from '@/modules/data/skills';

var parser: ReturnType<typeof createParser> | null = null;

function getParser() {
  if (!parser) {
    parser = createParser({
      conditions: mockConditions,
    });
  }

  return parser;
}

export function parseSkillCondition(skillCondition: string) {
  return getParser().parseAny(skillCondition);
}

function tokenizeSkillsConditions() {
  const skills = getSkills();
  const acc: Record<string, Array<Operator>> = {};

  for (const skillData of skills) {
    const operators: Array<Operator> = [];
    for (const alternative of skillData.alternatives) {
      const condition = alternative.condition;

      if (condition === '' || condition === undefined) {
        continue;
      }

      const operator = getParser().parse(condition);
      operators.push(operator);
    }

    acc[skillData.id] = operators;
  }

  return acc;
}

export var tokenizedConditions: Record<string, Array<Operator>> = {};

export function rebuildTokenizedConditionsCache(): void {
  tokenizedConditions = tokenizeSkillsConditions();
}

rebuildTokenizedConditionsCache();

// Operation Parser
