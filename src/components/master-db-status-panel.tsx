import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { refreshMasterDbStore, useMasterDbStatus } from '@/modules/data/master-db.store';

const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatRelativeAge(timestamp: number, now: number): string {
  const elapsedMs = Math.max(0, now - timestamp);
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes < 1) {
    return 'just now';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

function getSourceBadgeVariant(
  source: 'static' | 'cache' | 'fresh',
): 'default' | 'secondary' | 'outline' {
  if (source === 'fresh') {
    return 'default';
  }
  if (source === 'cache') {
    return 'secondary';
  }
  return 'outline';
}

function getSourceDescription(source: 'static' | 'cache' | 'fresh'): string {
  if (source === 'fresh') {
    return 'Fresh remote database';
  }
  if (source === 'cache') {
    return 'Cached fallback database';
  }
  return 'Bundled static database';
}

export function MasterDbStatusPanel() {
  const status = useMasterDbStatus();

  const now = Date.now();
  const lastUpdatedLabel = useMemo(() => {
    if (!status.fetchedAt) {
      return null;
    }

    const absoluteLabel = absoluteDateFormatter.format(new Date(status.fetchedAt));
    const relativeLabel = formatRelativeAge(status.fetchedAt, now);
    return `${absoluteLabel} (${relativeLabel})`;
  }, [now, status.fetchedAt]);

  const expiresAtLabel = useMemo(() => {
    if (!status.expiresAt) {
      return null;
    }
    return absoluteDateFormatter.format(new Date(status.expiresAt));
  }, [status.expiresAt]);

  return (
    <Panel>
      <PanelHeader className="flex items-center justify-between gap-2">
        <PanelTitle>Game Database</PanelTitle>
        <Badge variant={getSourceBadgeVariant(status.source)}>{status.source}</Badge>
      </PanelHeader>

      <PanelContent className="space-y-3">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Source: {getSourceDescription(status.source)}</div>
          <div>
            Resource version: <span className="font-mono">{status.resourceVersion}</span>
          </div>
          {status.appVersion && (
            <div>
              App version: <span className="font-mono">{status.appVersion}</span>
            </div>
          )}
          {lastUpdatedLabel && <div>Last updated: {lastUpdatedLabel}</div>}
          {expiresAtLabel && <div>Cache expires: {expiresAtLabel}</div>}
        </div>

        {status.isInitializing && (
          <div className="space-y-1.5">
            <Progress value={status.progressPercent ?? 0} />
            <div className="text-xs text-muted-foreground">
              {status.progressStep ?? 'Updating database...'}
            </div>
          </div>
        )}

        {!status.isWorkerSupported && (
          <p className="text-xs text-destructive">Web workers are not available in this runtime.</p>
        )}

        {status.warning && <p className="text-xs text-amber-600 dark:text-amber-400">{status.warning}</p>}
        {status.error && <p className="text-xs text-destructive">{status.error}</p>}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!status.isWorkerSupported || status.isInitializing}
          onClick={refreshMasterDbStore}
        >
          {status.isInitializing ? 'Updating...' : 'Refresh Database'}
        </Button>
      </PanelContent>
    </Panel>
  );
}
