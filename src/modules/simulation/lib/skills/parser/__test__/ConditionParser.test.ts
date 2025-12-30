import { describe, expect, test } from 'bun:test';
import { createParser, createTypedParser } from '../ConditionParser';
import { defaultConditions } from '../conditions/conditions';

describe('ConditionParser', () => {
  describe('Basic Parsing', () => {
    test('parses simple condition with ==', () => {
      const parser = createParser();
      const result = parser.parse('phase==1');

      expect(result).toBeDefined();
      expect(result.samplePolicy).toBeDefined();
      expect(typeof result.apply).toBe('function');
    });

    test('parses all comparison operators', () => {
      const parser = createParser();
      const operators = ['phase==1', 'phase!=1', 'phase<2', 'phase<=2', 'phase>0', 'phase>=0'];

      for (const expr of operators) {
        const result = parser.parse(expr);
        expect(result).toBeDefined();
        expect(typeof result.apply).toBe('function');
      }
    });

    test('parses integer arguments correctly', () => {
      const parser = createParser();

      // Test different integer values
      const expressions = ['phase==0', 'phase==1', 'phase==99', 'order_rate==1234'];

      for (const expr of expressions) {
        const result = parser.parse(expr);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Complex Expressions', () => {
    test('parses chained AND expressions', () => {
      const parser = createParser();
      const result = parser.parse('phase==1&running_style==2');

      expect(result).toBeDefined();
      expect(typeof result.apply).toBe('function');
    });

    test('parses chained OR expressions', () => {
      const parser = createParser();
      const result = parser.parse('phase==1@phase==2');

      expect(result).toBeDefined();
      expect(typeof result.apply).toBe('function');
    });

    test('parses mixed AND/OR operators with correct precedence', () => {
      const parser = createParser();
      // OR has lower precedence than AND, so this groups as (phase==1&running_style==2)@phase==3
      const result = parser.parse('phase==1&running_style==2@phase==3');

      expect(result).toBeDefined();
      expect(typeof result.apply).toBe('function');
    });

    test('parses complex nested expressions', () => {
      const parser = createParser();
      const result = parser.parse('phase==0&running_style==1@phase==2&distance_type==3');

      expect(result).toBeDefined();
      expect(typeof result.apply).toBe('function');
    });
  });

  describe('parseAny Function', () => {
    test('returns op node for complete expressions', () => {
      const parser = createParser();
      const result = parser.parseAny('phase==1');

      expect(result.type).toBe('op');
      expect(result).toHaveProperty('op');
    });

    test('returns cond node for bare condition identifiers', () => {
      const parser = createParser();
      const result = parser.parseAny('phase');

      expect(result.type).toBe('cond');
      expect(result).toHaveProperty('cond');
    });

    test('returns op node for complex expressions', () => {
      const parser = createParser();
      const result = parser.parseAny('phase==1&running_style==2');

      expect(result.type).toBe('op');
      expect(result).toHaveProperty('op');
    });
  });

  describe('Error Cases', () => {
    test('throws on invalid character', () => {
      const parser = createParser();

      expect(() => parser.parse('phase==1$running_style==2')).toThrow();
      expect(() => parser.parse('phase==1#')).toThrow();
      expect(() => parser.parse('phase==1%')).toThrow();
    });

    test('throws on incomplete == operator', () => {
      const parser = createParser();

      expect(() => parser.parse('phase=1')).toThrow('expected =');
    });

    test('throws on incomplete != operator', () => {
      const parser = createParser();

      expect(() => parser.parse('phase!1')).toThrow('expected =');
    });

    test('throws on missing right operand', () => {
      const parser = createParser();

      expect(() => parser.parse('phase==')).toThrow();
    });

    test('throws on condition where operator expected', () => {
      const parser = createParser();

      // Space is an invalid character
      expect(() => parser.parse('phase phase')).toThrow('invalid character');
    });

    test('throws when parseAny gets non-operator at top level for parse()', () => {
      const parser = createParser();

      // parse() expects an operator node, not just a condition
      expect(() => parser.parse('phase')).toThrow('expected comparison or operator');
    });
  });

  describe('Factory Functions', () => {
    test('createParser() returns default parser', () => {
      const parser = createParser();

      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
      expect(typeof parser.parseAny).toBe('function');
    });

    test('createParser() with no args uses default conditions', () => {
      const parser = createParser();

      // Should be able to parse standard conditions
      const result = parser.parse('phase==1');
      expect(result).toBeDefined();
    });

    test('createParser({ conditions }) uses custom conditions', () => {
      const customConditions = {
        test_condition: defaultConditions.phase,
      };

      const parser = createParser({ conditions: customConditions });
      const result = parser.parse('test_condition==1');

      expect(result).toBeDefined();
    });

    test('createTypedParser infers correct types', () => {
      interface CustomCondition {
        name: string;
      }

      interface CustomOperator {
        execute: () => void;
      }

      const customConditions: Record<string, CustomCondition> = {
        custom: { name: 'test' },
      };

      class CustomEqOp implements CustomOperator {
        constructor(
          readonly cond: CustomCondition,
          readonly arg: number,
        ) {}

        execute() {}
      }

      const parser = createTypedParser(customConditions, {
        eq: CustomEqOp as any,
        neq: CustomEqOp as any,
        lt: CustomEqOp as any,
        lte: CustomEqOp as any,
        gt: CustomEqOp as any,
        gte: CustomEqOp as any,
        and: CustomEqOp as any,
        or: CustomEqOp as any,
      });

      const result = parser.parse('custom==1');
      expect(result).toBeDefined();
    });

    test('parser functions are reusable', () => {
      const parser = createParser();

      const result1 = parser.parse('phase==1');
      const result2 = parser.parse('phase==2');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).not.toBe(result2);
    });
  });

  describe('Integration with Default Conditions', () => {
    test('parses real condition names from Conditions', () => {
      const parser = createParser();

      // These are actual condition names from ActivationConditions
      const realConditions = ['phase==1', 'running_style==1', 'distance_type==2', 'ground_type==1'];

      for (const expr of realConditions) {
        const result = parser.parse(expr);
        expect(result).toBeDefined();
      }
    });

    test('parsed operator has required interface', () => {
      const parser = createParser();
      const result = parser.parse('phase==1');

      // Check Operator interface
      expect(result).toHaveProperty('samplePolicy');
      expect(result).toHaveProperty('apply');
      expect(typeof result.apply).toBe('function');
    });

    test('parses real skill condition from skills.json', () => {
      const parser = createParser();

      // Actual condition from skills.json (skill with multiple chained conditions)
      const skillCondition = 'distance_type==4&phase_random==1&order>=5';
      const result = parser.parse(skillCondition);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('samplePolicy');
      expect(result).toHaveProperty('apply');
      expect(typeof result.apply).toBe('function');
    });

    test('parses real skill condition from skills.json with correct structure', () => {
      const parser = createParser();

      // Actual condition from skills.json (skill with multiple chained conditions)
      const skillCondition = 'distance_type==4&phase_random==1&order>=5';
      const result = parser.parse(skillCondition);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('samplePolicy');
      expect(result).toHaveProperty('apply');
      expect(typeof result.apply).toBe('function');

      // Since this is: (distance_type==4 & phase_random==1) & order>=5
      // The top level should be an AndOperator
      expect(result.constructor.name).toBe('AndOperator');

      // AndOperator has left and right properties
      const topAnd = result as any;
      expect(topAnd).toHaveProperty('left');
      expect(topAnd).toHaveProperty('right');

      // Left side should be another AndOperator (distance_type==4 & phase_random==1)
      expect(topAnd.left.constructor.name).toBe('AndOperator');
      const leftAnd = topAnd.left;

      // Left side of inner AND should be EqOperator for distance_type==4
      expect(leftAnd.left.constructor.name).toBe('EqOperator');
      expect(leftAnd.left.condition).toBeDefined();
      expect(leftAnd.left.argument).toBe(4);

      // Right side of inner AND should be EqOperator for phase_random==1
      expect(leftAnd.right.constructor.name).toBe('EqOperator');
      expect(leftAnd.right.condition).toBeDefined();
      expect(leftAnd.right.argument).toBe(1);

      // Right side of top AND should be GteOperator for order>=5
      expect(topAnd.right.constructor.name).toBe('GteOperator');
      expect(topAnd.right.condition).toBeDefined();
      expect(topAnd.right.argument).toBe(5);
    });

    test('parseAny returns correct node structure for complex skill condition', () => {
      const parser = createParser();

      const skillCondition = 'distance_type==4&phase_random==1&order>=5';
      const result = parser.parseAny(skillCondition);

      expect(result.type).toBe('op');
      expect(result).toHaveProperty('op');

      if (result.type === 'op') {
        // Verify it's an AndOperator with the expected structure
        const op = result.op as any;
        expect(op.constructor.name).toBe('AndOperator');

        // Validate the nested structure matches our expectations
        expect(op.left.constructor.name).toBe('AndOperator');
        expect(op.left.left.argument).toBe(4);
        expect(op.left.right.argument).toBe(1);
        expect(op.right.argument).toBe(5);
      }
    });
  });

  describe('ParseNode Types', () => {
    test('parseAny returns correct node type for integers', () => {
      const parser = createParser();
      const result = parser.parseAny('123');

      expect(result.type).toBe('int');
      if (result.type === 'int') {
        expect(result.value).toBe(123);
      }
    });

    test('parseAny returns correct node type for conditions', () => {
      const parser = createParser();
      const result = parser.parseAny('phase');

      expect(result.type).toBe('cond');
      if (result.type === 'cond') {
        expect(result.cond).toBeDefined();
      }
    });

    test('parseAny returns correct node type for operators', () => {
      const parser = createParser();
      const result = parser.parseAny('phase==1');

      expect(result.type).toBe('op');
      if (result.type === 'op') {
        expect(result.op).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles condition names with underscores', () => {
      const parser = createParser();
      const result = parser.parse('running_style==1');

      expect(result).toBeDefined();
    });

    test('handles zero as argument', () => {
      const parser = createParser();
      const result = parser.parse('phase==0');

      expect(result).toBeDefined();
    });

    test('handles large integers', () => {
      const parser = createParser();
      const result = parser.parse('order_rate==9999');

      expect(result).toBeDefined();
    });

    test('handles multi-digit integers', () => {
      const parser = createParser();
      const result = parser.parse('phase==123');

      expect(result).toBeDefined();
    });

    test('handles conditions with custom names via custom conditions map', () => {
      const customConditions = {
        phase0: defaultConditions.phase,
        value123: defaultConditions.phase,
      };

      const parser = createParser({ conditions: customConditions });

      const result1 = parser.parse('phase0==1');
      const result2 = parser.parse('value123==456');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
