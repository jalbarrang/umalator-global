import './polyfills';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import './i18n';

import { enableMapSet } from 'immer';
import { ThemeStoreProvider } from './providers/theme/provider';
import { RootComponent } from './routes/root';

import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
});

enableMapSet();

const rootComponent = document.getElementById('root');

if (!rootComponent) {
  throw new Error('Root element not found');
}

const root = createRoot(rootComponent);
root.render(
  <PostHogProvider client={posthog}>
    <PostHogErrorBoundary>
      <HashRouter>
        <ThemeStoreProvider>
          <RootComponent />
        </ThemeStoreProvider>
      </HashRouter>
    </PostHogErrorBoundary>
  </PostHogProvider>,
);
