function isPascalCase(name) {
  return name != null && /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function getComponentName(node) {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }

  const parent = node.parent;
  if (!parent) return null;

  if (parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
    return parent.id.name;
  }

  // React.memo(() => {}), React.forwardRef(() => {}), memo(), forwardRef()
  if (parent.type === 'CallExpression') {
    const callee = parent.callee;
    const isReactWrapper =
      (callee.type === 'MemberExpression' &&
        callee.object.name === 'React' &&
        (callee.property.name === 'memo' || callee.property.name === 'forwardRef')) ||
      (callee.type === 'Identifier' && (callee.name === 'memo' || callee.name === 'forwardRef'));

    if (
      isReactWrapper &&
      parent.parent &&
      parent.parent.type === 'VariableDeclarator' &&
      parent.parent.id &&
      parent.parent.id.type === 'Identifier'
    ) {
      return parent.parent.id.name;
    }
  }

  return null;
}

function hasBodyDestructuring(body, paramName) {
  if (!body || body.type !== 'BlockStatement') return false;

  for (const stmt of body.body) {
    if (stmt.type !== 'VariableDeclaration') continue;
    for (const decl of stmt.declarations) {
      if (
        decl.id.type === 'ObjectPattern' &&
        decl.init &&
        decl.init.type === 'Identifier' &&
        decl.init.name === paramName
      ) {
        return true;
      }
    }
  }

  return false;
}

const PRIMITIVE_TYPE_ANNOTATIONS = new Set([
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
  'TSBigIntKeyword',
  'TSSymbolKeyword',
  'TSNullKeyword',
  'TSUndefinedKeyword',
  'TSVoidKeyword',
  'TSNeverKeyword',
]);

function isInsideForwardRef(node) {
  const parent = node.parent;
  if (!parent || parent.type !== 'CallExpression') return false;
  const callee = parent.callee;
  return (
    (callee.type === 'MemberExpression' &&
      callee.object.name === 'React' &&
      callee.property.name === 'forwardRef') ||
    (callee.type === 'Identifier' && callee.name === 'forwardRef')
  );
}

function checkFunction(node, context) {
  const name = getComponentName(node);
  if (!name || !isPascalCase(name)) return;

  const params = node.params;
  if (params.length === 0) return;

  const maxParams = isInsideForwardRef(node) ? 2 : 1;
  if (params.length > maxParams) return;

  const firstParam = params[0];
  if (firstParam.type === 'ObjectPattern') return;
  if (firstParam.type !== 'Identifier') return;

  if (
    firstParam.typeAnnotation &&
    firstParam.typeAnnotation.typeAnnotation &&
    PRIMITIVE_TYPE_ANNOTATIONS.has(firstParam.typeAnnotation.typeAnnotation.type)
  ) {
    return;
  }

  const paramName = firstParam.name;
  if (paramName.startsWith('_')) return;

  if (hasBodyDestructuring(node.body, paramName)) return;

  context.report({
    node: firstParam,
    message: `Props parameter '${paramName}' in component '${name}' must be destructured in the function signature or body.`,
  });
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require destructuring of React component props',
    },
    schema: [],
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        checkFunction(node, context);
      },
      FunctionExpression(node) {
        checkFunction(node, context);
      },
      ArrowFunctionExpression(node) {
        checkFunction(node, context);
      },
    };
  },
};
