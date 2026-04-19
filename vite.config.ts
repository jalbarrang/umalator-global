/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';
import sitemap from 'vite-sitemap-plugin';

// Feature Flags:
// Vite automatically loads environment variables from .env files
// Feature flags should be prefixed with VITE_FEATURE_ to be accessible via import.meta.env
// See docs/feature-flags.md for usage and best practices

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : './',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        start_url: './',
        scope: './',
        name: 'Yet Another Umalator',
        short_name: 'Umalator',
        description: 'Race and skill simulation toolkit for Uma Musume: Pretty Derby.',
        theme_color: '#111315',
        background_color: '#111315',
        display: 'standalone',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        screenshots: [
          {
            src: 'desktop-screenshot.png',
            sizes: '1490x836',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Desktop view of Yet Another Umalator',
          },
          {
            src: 'mobile-screenshot.png',
            sizes: '406x727',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile view of Yet Another Umalator',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        globIgnores: ['**/data/course_geometry.json'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/course_geometry.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'course-geometry-data',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
    sitemap({
      base: 'https://jalbarrang.github.io/umalator-global',
      // HashRouter routes are not crawlable sitemap entries, so only emit the real homepage for now.
      urls: [],
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
  },
}));
