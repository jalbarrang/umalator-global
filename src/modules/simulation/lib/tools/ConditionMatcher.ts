import { AndOperator, OrOperator } from '@simulation/lib/ActivationConditions';
import { NodeType } from '@simulation/lib/ConditionParser';
import type { CmpOperator, Condition, Operator } from '@simulation/lib/ActivationConditions';
import type { Node } from '@simulation/lib/ConditionParser';
import type { ActivationSamplePolicy } from '../ActivationSamplePolicy';

function isCmpOperator(tree: Operator): tree is CmpOperator {
  return 'condition' in tree;
}

function assertIsCmpOperator(tree: Operator): asserts tree is CmpOperator {
  if (!isCmpOperator(tree)) {
    throw new Error('Tree is not a CmpOperator');
  }
}

function assertIsLogicalOp(tree: Operator): asserts tree is AndOperator | OrOperator {
  if (!('left' in tree && 'right' in tree)) {
    throw new Error('Tree is not a AndOperator or OrOperator');
  }
}

function flatten(node: AndOperator, conds: Array<CmpOperator>) {
  // due to the grammar the right branch of an & must be a comparison
  // (there are no parenthesis to override precedence and & is left-associative)
  assertIsCmpOperator(node.right);

  conds.push(node.right);
  if (node.left instanceof AndOperator) {
    return flatten(node.left, conds);
  }

  // if it's not an & it must be a comparison, since @ has a lower precedence
  assertIsCmpOperator(node.left);

  conds.push(node.left);

  return conds;
}

function condMatcher(cond: Condition | CmpOperator, node: Operator): boolean {
  if (isCmpOperator(node)) {
    if ('argument' in cond) {
      return (
        node.condition === cond.condition &&
        node.argument == cond.argument &&
        Object.getPrototypeOf(cond) === Object.getPrototypeOf(node)
      ); // match operator type (gt, eq, etc)
    } else {
      return node.condition === cond;
    }
  }

  assertIsLogicalOp(node);

  return condMatcher(cond, node.left) || condMatcher(cond, node.right);
}

function andMatcher(conds: Array<CmpOperator>, node: Operator): boolean {
  if (node instanceof OrOperator) {
    const conds2 = conds.slice(); // gets destructively modified

    return andMatcher(conds, node.left) || andMatcher(conds2, node.right);
  } else if (node instanceof AndOperator) {
    assertIsCmpOperator(node.right);
    const idx = conds.findIndex((c) => condMatcher(c, node.right));

    if (idx != -1) {
      conds.splice(idx, 1);
    }

    return conds.length == 0 || andMatcher(conds, node.left);
  } else {
    assertIsCmpOperator(node);

    return conds.length == 1 && condMatcher(conds[0], node);
  }
}

export function treeMatch(match: Node, tree: Operator) {
  switch (match.type) {
    case NodeType.Op:
      if (match.op instanceof AndOperator) {
        return andMatcher(flatten(match.op, []), tree);
      } else if (isCmpOperator(match.op)) {
        return condMatcher(match.op, tree);
      }

      throw new Error("doesn't support @ in search conditions");
    case NodeType.Cond:
      return condMatcher(match.cond, tree);
    case NodeType.Int:
      throw new Error("doesn't support sole integer as search condition");
  }
}

const mockSamplePolicy: ActivationSamplePolicy = {
  sample(_0, _1) {
    throw new Error('Not implemented');
  },
  reconcile(_) {
    return this;
  },
  reconcileImmediate(_) {
    return this;
  },
  reconcileDistributionRandom(_) {
    return this;
  },
  reconcileRandom(_) {
    return this;
  },
  reconcileStraightRandom(_) {
    return this;
  },
  reconcileAllCornerRandom(_) {
    return this;
  },
};

export const mockConditions = new Proxy(
  {},
  {
    get(cache: object, prop: string) {
      if (prop in cache) {
        return cache[prop as keyof typeof cache];
      }

      const condition = { name: prop, samplePolicy: mockSamplePolicy };
      // @ts-expect-error - cache is an object
      cache[prop] = condition;

      return condition;
    },
  },
);
