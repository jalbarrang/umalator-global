import { useEffect, useImperativeHandle, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import type { SkillEntry } from '@/modules/data/services/SkillService';

export const SKILL_PICKER_ROW_HEIGHT = 52;
const MOBILE_SKILL_OVERSCAN = 20;
const DESKTOP_SKILL_OVERSCAN = 8;

export type SkillPickerVirtualGridHandle = {
  scrollToRow: (rowIndex: number) => void;
};

export type SkillPickerVirtualGridProps = {
  ref?: React.RefObject<SkillPickerVirtualGridHandle | null>;
  filteredSkills: Array<SkillEntry>;
  columnCount: number;
  enabled?: boolean;
  scrollClassName?: string;
  renderItem: (args: { skill: SkillEntry; skillIndex: number }) => React.ReactNode;
};

export function SkillPickerVirtualGrid(props: SkillPickerVirtualGridProps) {
  const { ref, filteredSkills, columnCount, enabled = true, scrollClassName, renderItem } = props;
  const resolvedColumnCount = Math.max(1, columnCount);
  const isDesktopLayout = resolvedColumnCount > 1;
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const virtualRowCount = Math.ceil(filteredSkills.length / resolvedColumnCount);
  const rowOverscan = isDesktopLayout ? DESKTOP_SKILL_OVERSCAN : MOBILE_SKILL_OVERSCAN;

  const rowVirtualizer = useVirtualizer({
    count: virtualRowCount,
    enabled: enabled && scrollElement !== null,
    getScrollElement: () => scrollElement,
    estimateSize: () => SKILL_PICKER_ROW_HEIGHT,
    overscan: rowOverscan,
    getItemKey: (index) => {
      const rowStart = index * resolvedColumnCount;
      return filteredSkills[rowStart]?.id ?? `skill-row-${index}`;
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToRow: (rowIndex: number) => {
        rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
      }
    }),
    [rowVirtualizer]
  );

  useEffect(() => {
    if (!enabled) return;
    rowVirtualizer.measure();
  }, [enabled, filteredSkills.length, resolvedColumnCount, rowVirtualizer]);

  return (
    <div
      ref={setScrollElement}
      className={cn('min-h-0 flex-1 overflow-y-auto p-2', scrollClassName)}
    >
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="relative w-full">
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * resolvedColumnCount;
          const rowSkills = filteredSkills.slice(rowStart, rowStart + resolvedColumnCount);
          if (rowSkills.length === 0) return null;

          return (
            <div
              key={`skill-row-${rowStart}`}
              className="absolute top-0 left-0 w-full pb-1"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${resolvedColumnCount}, minmax(0, 1fr))` }}
              >
                {rowSkills.map((skill, columnIndex) => {
                  const skillIndex = rowStart + columnIndex;

                  return (
                    <div key={skill.id} className="min-w-0">
                      {renderItem({ skill, skillIndex })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
