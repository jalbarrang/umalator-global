import { useIsMobile } from '@/hooks/use-mobile';
import { aptitudeNames } from '@/lib/sunday-tools/runner/definitions';
import { ISavedRunner } from '@/store/runner-library.store';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SavedRunnerCard } from '../saved-runner-card';

export function meetsMinGrade(actual: string, min: string): boolean {
  return aptitudeNames.indexOf(actual as any) <= aptitudeNames.indexOf(min as any);
}

export const CARD_HEIGHT = 230;
export const GAP = 16;
export const ROW_HEIGHT = CARD_HEIGHT + GAP;
export const OVERSCAN = 3;

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
  const {
    items,
    selected,
    isSelecting,
    onToggleSelect,
    onEdit,
    onDelete,
    onDuplicate,
    onLoadToSimulation,
  } = props;

  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnCount, setColumnCount] = useState(1);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setContainerHeight(e.currentTarget.clientHeight);
  }, []);

  const { startIdx, endIdx, totalHeight } = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnCount);
    const totalHeight = totalRows * ROW_HEIGHT;
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    return {
      startIdx: startRow * columnCount,
      endIdx: Math.min(items.length, endRow * columnCount),
      totalHeight,
    };
  }, [items.length, columnCount, scrollTop, containerHeight]);

  const getStyle = useCallback(
    (index: number): React.CSSProperties => {
      const row = Math.floor(index / columnCount);
      const col = index % columnCount;
      return {
        position: 'absolute',
        top: row * ROW_HEIGHT,
        left: `calc(${col} * (100% / ${columnCount}) + ${col > 0 ? GAP / 2 : 0}px)`,
        width: `calc(100% / ${columnCount} - ${GAP}px)`,
        height: CARD_HEIGHT,
      };
    },
    [columnCount],
  );

  return (
    <div ref={containerRef} className="overflow-y-auto flex-1 min-h-0" onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative', padding: GAP / 2 }}>
        {items.slice(startIdx, endIdx).map((runner, i) => {
          const idx = startIdx + i;
          return (
            <div key={runner.id} style={getStyle(idx)} className="relative">
              {/* {isSelecting && (
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => onToggleSelect(runner.id)}
                />
              )} */}

              <div
                className={`h-full ${
                  isSelecting && !selected.has(runner.id)
                    ? 'opacity-40 transition-opacity'
                    : 'transition-opacity'
                }`}
              >
                <SavedRunnerCard
                  runner={runner}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onLoadToSimulation={onLoadToSimulation}
                />
              </div>

              {/* {isSelecting && (
                <div className="absolute top-3 left-3 z-20">
                  <Checkbox
                    checked={selected.has(runner.id)}
                    onCheckedChange={() => onToggleSelect(runner.id)}
                  />
                </div>
              )} */}
            </div>
          );
        })}
      </div>
    </div>
  );
};
