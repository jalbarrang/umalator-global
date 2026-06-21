import { config } from './config';

if (config.enableGrab) {
  import('react-grab');
}

import './polyfills';
import { DataBootGate } from '@/components/data-boot-gate';

// Supports weights 100-900
import '@fontsource-variable/inter/wght.css';
// Supports weights 100-900
import '@fontsource-variable/noto-sans-jp/wght.css';

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';

import { enableMapSet } from 'immer';
import { reconcileStoresAfterHydration } from '@/store/race/reconcile';
import { ThemeStoreProvider } from './providers/theme/provider';
import { RootComponent } from './routes/root';

import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import { useAnalyticsConsentStore } from '@/store/analytics-consent.store';

if (config.posthog.key) {
  posthog.init(config.posthog.key, {
    api_host: config.posthog.host,
    defaults: '2026-01-30',
    // No capturing until the visitor explicitly opts in (see ConsentBanner).
    opt_out_capturing_by_default: true,
    respect_dnt: true
  });

  // Re-apply a previously stored decision on load.
  if (useAnalyticsConsentStore.getState().consent === 'granted') {
    posthog.opt_in_capturing();
  }
}

enableMapSet();
reconcileStoresAfterHydration();

const rootComponent = document.getElementById('root');

if (!rootComponent) {
  throw new Error('Root element not found');
}

const root = createRoot(rootComponent);
const queryClient = new QueryClient();

// The app mounts immediately; <DataBootGate> (inside the providers) shows the
// splash while the data bootstrap runs, then renders the routes once the service
// singletons are populated.
root.render(
  <PostHogProvider client={posthog}>
    <PostHogErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={config.basePath}>
          <ThemeStoreProvider>
            <DataBootGate>
              <RootComponent />
            </DataBootGate>
          </ThemeStoreProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </PostHogErrorBoundary>
  </PostHogProvider>
);
