import { useIsMobile } from '@/hooks/use-mobile';
import { aptitudeNames } from 'sunday-tools/runner/definitions';
import { ISavedRunner } from '@/store/runner-library.store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { SavedRunnerCard } from '../saved-runner-card';
import { cn } from '@/lib/utils';

export function meetsMinGrade(actual: string, min: string): boolean {
  return aptitudeNames.indexOf(actual as any) <= aptitudeNames.indexOf(min as any);
}

const CARD_HEIGHT = 182;
const GAP = 8;
const ROW_HEIGHT = CARD_HEIGHT + GAP;
const OVERSCAN = 2;

type IVirtualRunnerGridProps = {
  items: ISavedRunner[];
  selected: Set<string>;
  isSelecting: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (runner: ISavedRunner) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLoadToSimulation: (runner: ISavedRunner) => void;
};

export const VirtualRunnerGrid = (props: Readonly<IVirtualRunnerGridProps>) => {
  const { items, selected, isSelecting, onToggleSelect, onEdit, onDuplicate, onLoadToSimulation } =
    props;

  const isMobile = useIsMobile();
  const columns = isMobile ? 1 : 4;

  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT, // CARD_HEIGHT + GAP
    overscan: OVERSCAN
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const { totalHeight } = useMemo(() => {
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = totalRows * ROW_HEIGHT;

    return {
      totalHeight
    };
  }, [items.length, columns]);

  return (
    <div ref={containerRef} className="overflow-y-auto flex-1 min-h-0">
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * columns;
          const rowItems = items.slice(rowStart, Math.min(rowStart + columns, items.length));

          return (
            <div
              key={virtualRow.key}
              className="grid gap-2 box-border w-full px-2"
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                height: CARD_HEIGHT,
                gridTemplateColumns: `repeat(${columns}, 1fr)`
              }}
            >
              {rowItems.map((runner) => {
                return (
                  <div key={runner.id} className="relative">
                    <div
                      className={cn('h-full transition-opacity', {
                        'opacity-40': isSelecting && !selected.has(runner.id)
                      })}
                    >
                      <SavedRunnerCard
                        runner={runner}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onLoadToSimulation={onLoadToSimulation}
                        selected={selected.has(runner.id)}
                        onToggleSelect={() => onToggleSelect(runner.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
