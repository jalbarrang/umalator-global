import destructureProps from './rules/destructure-props.js';
import requireUseShallow from './rules/require-use-shallow.js';

/**
 * Local ESLint plugin holding project-specific React/Zustand rules.
 * @type {import('eslint').ESLint.Plugin}
 */
const plugin = {
  meta: {
    name: 'react-props',
  },
  rules: {
    'destructure-props': destructureProps,
    'require-use-shallow': requireUseShallow,
  },
};

export default plugin;
