import {
  AndOperator,
  CmpOperator,
  Condition,
  Operator,
  OrOperator,
} from '@simulation/lib/ActivationConditions';
import { Node, NodeType } from '@simulation/lib/ConditionParser';

function isCmpOperator(tree: Operator): tree is CmpOperator {
  return 'condition' in tree;
}

function assertIsCmpOperator(tree: Operator): asserts tree is CmpOperator {
  if (!isCmpOperator(tree)) {
    throw new Error('Tree is not a CmpOperator');
  }
}

function assertIsLogicalOp(
  tree: Operator,
): asserts tree is AndOperator | OrOperator {
  if (!('left' in tree && 'right' in tree)) {
    throw new Error('Tree is not a AndOperator or OrOperator');
  }
}

function flatten(node: AndOperator, conds: CmpOperator[]) {
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

function condMatcher(cond: Condition | CmpOperator, node: Operator) {
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

function andMatcher(conds: CmpOperator[], node: Operator) {
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
      } else {
        throw new Error("doesn't support @ in search conditions");
      }
    case NodeType.Cond:
      return condMatcher(match.cond, tree);
      break;
    case NodeType.Int:
      throw new Error("doesn't support sole integer as search condition");
  }
}

const mockSamplePolicy = {
  sample(_0, _1) {
    throw new Error('Not implemented');
  },
  reconcile(_) {
    return this;
  },
  reconcileAsap(_) {
    return this;
  },
  reconcileLogNormalRandom(_) {
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
      if (Object.prototype.hasOwnProperty.call(cache, prop)) {
        return cache[prop]; // cache to allow identity comparison
      }
      return (cache[prop] = { name: prop, samplePolicy: mockSamplePolicy });
    },
  },
);
