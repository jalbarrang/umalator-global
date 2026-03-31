const STORE_HOOK_PATTERN = /^use\w*Store$/;

function isUseShallowCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'useShallow'
  );
}

function returnsNewReference(selectorNode) {
  if (selectorNode.type !== 'ArrowFunctionExpression') return false;
  if (!selectorNode.expression) return false;

  const { body } = selectorNode;
  return body.type === 'ObjectExpression' || body.type === 'ArrayExpression';
}

function checkSelector(selectorArg, callNode, context) {
  if (!selectorArg) return;
  if (isUseShallowCall(selectorArg)) return;

  if (returnsNewReference(selectorArg)) {
    context.report({
      node: selectorArg,
      message:
        'Zustand selector returns a new object/array reference every render. Wrap it with useShallow() to prevent unnecessary re-renders.',
    });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require useShallow for Zustand selectors that return new object/array references',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'Identifier' && STORE_HOOK_PATTERN.test(callee.name)) {
          checkSelector(node.arguments[0], node, context);
          return;
        }

        if (callee.type === 'Identifier' && callee.name === 'useStore') {
          checkSelector(node.arguments[1], node, context);
        }
      },
    };
  },
};
