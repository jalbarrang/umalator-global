import tseslint from 'typescript-eslint';
// import stylisticPlugin from '@stylistic/eslint-plugin';
import { globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import-x';
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { javascriptRules } from './javascript';
import { importRules } from './import';
import { typescriptRules } from './typescript';
import { nodeRules } from './node';
// import { stylisticRules } from './stylistic';
import { reactRules } from './react';
import type { Linter } from 'eslint';

const GLOB_EXCLUDE = [
  '**/src/components/ui/**',
  '**/.nx/**',
  '**/.svelte-kit/**',
  '**/build/**',
  '**/coverage/**',
  '**/dist/**',
  '**/snap/**',
  '**/vite.config.*.timestamp-*.*',
  '**/.netlify/**',
];

const jsRules = {
  ...javascriptRules,
  ...typescriptRules,
  ...importRules,
  ...nodeRules,
  ...reactRules,
  // ...stylisticRules,
};

const jsPlugins = {
  // '@stylistic': stylisticPlugin,
  '@typescript-eslint': tseslint.plugin,
  import: importPlugin,
  node: nodePlugin,
  'react-hooks': reactHooksPlugin,
};

export const umalatorConfig: Array<Linter.Config> = [
  {
    name: 'umalator/javascript',
    // @ts-expect-error
    plugins: jsPlugins,
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2023,
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: jsRules,
  },
  globalIgnores(GLOB_EXCLUDE),
];
