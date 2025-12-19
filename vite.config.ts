import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';

import netlify from '@netlify/vite-plugin-tanstack-start';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
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
});
