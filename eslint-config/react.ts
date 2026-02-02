import type { Linter } from 'eslint';

/**
 * @see https://github.com/jsx-eslint/eslint-plugin-react
 */
export const reactRules: Linter.RulesRecord = {
  // react-hooks
  'react-hooks/exhaustive-deps': 'warn',
};
