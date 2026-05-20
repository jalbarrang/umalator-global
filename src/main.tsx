if (import.meta.env.DEV) {
  import('react-grab');
}

import './polyfills';
import '@/modules/data/bootstrap-skill-indexes';

// Supports weights 100-900
import '@fontsource-variable/inter/wght.css';
// Supports weights 100-900
import '@fontsource-variable/noto-sans-jp/wght.css';

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './i18n';

import { enableMapSet } from 'immer';
import { reconcileStoresAfterHydration } from '@/store/race/reconcile';
import { ThemeStoreProvider } from './providers/theme/provider';
import { RootComponent } from './routes/root';

import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';

import { config } from './config';

if (config.posthog.key) {
  posthog.init(config.posthog.key, {
    api_host: config.posthog.host,
    defaults: '2026-01-30'
  });
}

enableMapSet();
reconcileStoresAfterHydration();

const rootComponent = document.getElementById('root');

if (!rootComponent) {
  throw new Error('Root element not found');
}

const root = createRoot(rootComponent);
root.render(
  <PostHogProvider client={posthog}>
    <PostHogErrorBoundary>
      <BrowserRouter basename={config.basePath}>
        <ThemeStoreProvider>
          <RootComponent />
        </ThemeStoreProvider>
      </BrowserRouter>
    </PostHogErrorBoundary>
  </PostHogProvider>
);
