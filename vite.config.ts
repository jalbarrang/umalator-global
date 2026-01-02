import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Feature Flags:
// Vite automatically loads environment variables from .env files
// Feature flags should be prefixed with VITE_FEATURE_ to be accessible via import.meta.env
// See docs/feature-flags.md for usage and best practices

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, './src/modules/data'),
      '@simulation': path.resolve(__dirname, './src/modules/simulation'),
      '@skills': path.resolve(__dirname, './src/modules/skills'),
      '@workers': path.resolve(__dirname, './src/workers'),
      '@scripts': path.resolve(__dirname, './scripts'),
      '@cli': path.resolve(__dirname, './cli'),
    },
  },
});
