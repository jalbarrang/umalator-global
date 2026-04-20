import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildSnapshotSwitchUrl,
  getSnapshotLabel,
  isSnapshotId,
  listSnapshotAvailability,
  type SnapshotAvailability,
} from '@/modules/data/snapshots';
import { getDataRuntime, type SnapshotId } from '@/modules/data/runtime';

export function SnapshotSwitcher() {
  const runtime = getDataRuntime();
  const currentSnapshot = runtime.snapshot;
  const currentLabel = getSnapshotLabel(currentSnapshot);

  const initialOptions = useMemo<SnapshotAvailability[]>(
    () => [{ id: currentSnapshot, label: currentLabel, available: true }],
    [currentSnapshot, currentLabel],
  );

  const [snapshotOptions, setSnapshotOptions] = useState<SnapshotAvailability[]>(initialOptions);

  useEffect(() => {
    let cancelled = false;
    void listSnapshotAvailability().then((options) => {
      if (!cancelled) setSnapshotOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSnapshot]);

  const handleValueChange = (nextSnapshot: SnapshotId | null) => {
    if (!isSnapshotId(nextSnapshot) || nextSnapshot === currentSnapshot) {
      return;
    }

    const target = snapshotOptions.find((o) => o.id === nextSnapshot);
    if (!target?.available) return;

    window.location.assign(buildSnapshotSwitchUrl(nextSnapshot, window.location));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground lg:inline">Server</span>

      <Select value={currentSnapshot} onValueChange={handleValueChange}>
        <SelectTrigger size="sm" className="min-w-32" aria-label="Select data snapshot">
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {snapshotOptions.map((option) => (
            <SelectItem key={option.id} value={option.id} disabled={!option.available}>
              <div className="flex w-full items-center justify-between gap-2">
                <span>{option.label}</span>
                {!option.available && (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
