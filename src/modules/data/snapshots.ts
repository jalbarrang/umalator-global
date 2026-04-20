import {
  DEFAULT_SNAPSHOT_ID,
  SNAPSHOT_IDS,
  getDataRuntime,
  type SnapshotId,
} from './runtime';
import { isSnapshotAvailable } from './snapshot-loader';

const FALLBACK_ORIGIN = 'https://example.invalid';
const FALLBACK_SNAPSHOT_LABELS: Record<SnapshotId, string> = {
  global: 'Global',
  jp: 'JP',
};

export type SnapshotAvailability = {
  id: SnapshotId;
  label: string;
  available: boolean;
};

export function isSnapshotId(value: string | null | undefined): value is SnapshotId {
  return value !== null && value !== undefined && SNAPSHOT_IDS.includes(value as SnapshotId);
}

function toUrl(location: Location | URL): URL {
  if (location instanceof URL) {
    return new URL(location.toString());
  }

  const origin = location.origin && location.origin !== 'null' ? location.origin : FALLBACK_ORIGIN;

  return new URL(`${location.pathname}${location.search}${location.hash}`, origin);
}

export function resolveSnapshotFromLocation(location: Location | URL): SnapshotId {
  const requestedSnapshot = toUrl(location).searchParams.get('snapshot');

  if (!isSnapshotId(requestedSnapshot)) {
    return DEFAULT_SNAPSHOT_ID;
  }

  return requestedSnapshot;
}

export function buildSnapshotSwitchUrl(snapshot: SnapshotId, location: Location | URL): string {
  const url = toUrl(location);

  if (snapshot === DEFAULT_SNAPSHOT_ID) {
    url.searchParams.delete('snapshot');
  } else {
    url.searchParams.set('snapshot', snapshot);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export const buildSnapshotUrl = buildSnapshotSwitchUrl;

export function getSnapshotLabel(snapshot: SnapshotId): string {
  return FALLBACK_SNAPSHOT_LABELS[snapshot] ?? snapshot;
}

export async function listSnapshotAvailability(): Promise<SnapshotAvailability[]> {
  const runtime = getDataRuntime();

  const entries = await Promise.all(
    SNAPSHOT_IDS.map(async (snapshotId): Promise<SnapshotAvailability> => {
      if (snapshotId === runtime.snapshot) {
        return {
          id: snapshotId,
          label: getSnapshotLabel(snapshotId),
          available: true,
        };
      }

      const available = await isSnapshotAvailable(snapshotId);
      return {
        id: snapshotId,
        label: getSnapshotLabel(snapshotId),
        available,
      };
    }),
  );

  return entries;
}
