/// <reference types="vitest/config" />

import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';
import sitemap from 'vite-sitemap-plugin';

const root = dirname(fileURLToPath(import.meta.url));

function getSemver(): string {
  try {
    const tag = execSync('git describe --tags --abbrev=0 --match "v*"', {
      cwd: root,
      encoding: 'utf8'
    }).trim();
    return tag.replace(/^v/, '');
  } catch {
    return '0.0.0-dev';
  }
}

function getCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const __APP__VERSION__ = `${getSemver()}+${getCommitHash()}`;

// Feature Flags:
// Vite automatically loads environment variables from .env files
// Feature flags should be prefixed with VITE_FEATURE_ to be accessible via import.meta.env
// See docs/feature-flags.md for usage and best practices

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __APP__VERSION__: JSON.stringify(__APP__VERSION__)
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss(),
    sitemap({
      base: process.env.VITE_SITE_URL ?? 'https://jalbarrang.github.io/umalator-global',
      urls: [
        '/',
        '/skill-bassin',
        '/uma-bassin',
        '/runners',
        '/race-sim',
        '/skill-planner',
        '/spark-odds',
        '/skills',
        '/support-cards'
      ]
    })
  ],
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es'
  },
  test: {
    globals: true,
    setupFiles: ['./src/test-setup.ts']
  }
});
