import path from 'node:path';
import netlify from '@netlify/vite-plugin-tanstack-start';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    devtools(),
    ...(process.env.NODE_ENV === 'production' ? [netlify()] : []),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
  ],
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
