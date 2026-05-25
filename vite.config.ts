/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';
import sitemap from 'vite-sitemap-plugin';

// Feature Flags:
// Vite automatically loads environment variables from .env files
// Feature flags should be prefixed with VITE_FEATURE_ to be accessible via import.meta.env
// See docs/feature-flags.md for usage and best practices

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
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
