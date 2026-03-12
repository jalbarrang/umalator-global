/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

// Feature Flags:
// Vite automatically loads environment variables from .env files
// Feature flags should be prefixed with VITE_FEATURE_ to be accessible via import.meta.env
// See docs/feature-flags.md for usage and best practices

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteTsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  worker: {
    plugins: () => [
      viteTsconfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
  server: {
    proxy: {
      '/api/cdn': {
        target: 'https://assets-umamusume-en.akamaized.net',
        changeOrigin: true,
        headers: {
          'User-Agent': 'UnityPlayer/2022.3.46f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)',
        },
        rewrite: (path) => path.replace(/^\/api\/cdn/, ''),
      },
      '/api/ver': {
        target: 'https://uma.moe',
        changeOrigin: true,
      },
    },
  },
});
