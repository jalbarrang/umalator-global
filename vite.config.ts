///
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
});
