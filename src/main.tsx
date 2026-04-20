import './polyfills';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';

import { enableMapSet } from 'immer';
import { ThemeStoreProvider } from './providers/theme/provider';
import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import {
  DEFAULT_SNAPSHOT_ID,
  initializeDataRuntime,
  type SnapshotId,
} from './modules/data/runtime';
import {
  buildSnapshotUrl,
  resolveSnapshotFromLocation,
} from './modules/data/snapshots';
import { loadSnapshotCatalog } from './modules/data/snapshot-loader';
import { buildCourseGeometryPath } from './modules/data/course-geometry';

if (import.meta.env.VITE_PUBLIC_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
  });
}

enableMapSet();

const rootComponent = document.getElementById('root');

if (!rootComponent) {
  throw new Error('Root element not found');
}

const root = createRoot(rootComponent);

function getCurrentUrl(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

function renderBootstrapError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown bootstrap error';

  root.render(
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-xl border border-border bg-card p-5 rounded-lg">
        <p className="text-sm font-medium">Failed to load snapshot data</p>
        <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
          {message}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Try reloading the page. If the problem persists, check that the snapshot data modules
          exist under <code>src/modules/data/</code>.
        </p>
      </div>
    </div>,
  );
}

async function bootstrapDataRuntime(snapshot: SnapshotId) {
  const catalog = await loadSnapshotCatalog(snapshot);

  initializeDataRuntime({
    snapshot,
    catalog: {
      ...catalog,
      courseGeometryPath: buildCourseGeometryPath(snapshot),
    },
  });
}

async function bootstrapApplication(): Promise<void> {
  const requestedSnapshot = resolveSnapshotFromLocation(window.location);

  try {
    await bootstrapDataRuntime(requestedSnapshot);
  } catch (error) {
    if (requestedSnapshot !== DEFAULT_SNAPSHOT_ID) {
      console.warn(`Snapshot "${requestedSnapshot}" failed to load, falling back to ${DEFAULT_SNAPSHOT_ID}.`, error);
      await bootstrapDataRuntime(DEFAULT_SNAPSHOT_ID);
    } else {
      throw error;
    }
  }

  const canonicalUrl = buildSnapshotUrl(requestedSnapshot, window.location);
  if (canonicalUrl !== getCurrentUrl(window.location)) {
    window.history.replaceState(null, '', canonicalUrl);
  }

  await import('./i18n');
  const { RootComponent } = await import('./routes/root');

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
}

void bootstrapApplication().catch((error) => {
  console.error('Snapshot bootstrap failed.', error);
  renderBootstrapError(error);
});
