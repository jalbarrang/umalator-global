import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Find from Project Root
        '@': path.resolve(__dirname, './src'),
        '@data': path.resolve(__dirname, './src/modules/data'),
        '@simulation': path.resolve(__dirname, './src/modules/simulation'),
        '@skills': path.resolve(__dirname, './src/modules/skills'),
      },
    },
    define: {
      // Global constants (replaces define from build.mjs)
      CC_DEBUG: JSON.stringify(isDev),
      'process.env': {},
    },
  };
});
