import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  SkillItem,
  SkillItemActions,
  SkillItemBody,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from './skill-list/skill-item';
import type { SkillEntry } from '@/modules/data/skills';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type VirtualizedSkillGridProps = {
  items: Array<SkillEntry>;
  selectedMap: Map<string, string>;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
  focusedSkillId?: string | null;
};

const ITEM_HEIGHT = 44; // Height of SkillItem
const GAP = 8; // Gap between items
const ROW_HEIGHT = ITEM_HEIGHT + GAP;
const OVERSCAN_ROWS = 3; // Render 3 extra rows above and below viewport

type VirtualizedSkillRowProps = {
  selected: boolean;
  isHovered: boolean;
  isFocused: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function VirtualizedSkillRow(props: VirtualizedSkillRowProps) {
  const { selected, isHovered, isFocused, onMouseEnter, onMouseLeave } = props;

  return (
    <SkillItemRoot
      interactive
      selected={selected}
      isHovered={isHovered}
      isFocused={isFocused}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="cursor-pointer"
    >
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemActions>
            <SkillItemDetailsActions />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

export function VirtualizedSkillGrid(props: VirtualizedSkillGridProps) {
  const { items, selectedMap, onClick, className = '', focusedSkillId = null } = props;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;

        if (width >= 1024) {
          setColumnCount(3);
        } else if (width >= 640) {
          setColumnCount(2);
        } else {
          setColumnCount(1);
        }
      }
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const rowCount = useMemo(
    () => Math.ceil(items.length / columnCount),
    [items.length, columnCount],
  );

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    getItemKey: (index) => {
      const rowStartIndex = index * columnCount;
      return items[rowStartIndex]?.id ?? `row-${index}`;
    },
  });

  useEffect(() => {
    if (!focusedSkillId) return;

    const focusedIndex = items.findIndex((skill) => skill.id === focusedSkillId);
    if (focusedIndex === -1) return;

    rowVirtualizer.scrollToIndex(Math.floor(focusedIndex / columnCount), {
      align: 'auto',
    });
  }, [focusedSkillId, items, columnCount, rowVirtualizer]);

  return (
    <ScrollArea
      className="flex-1 min-h-0"
      viewportRef={viewportRef}
      viewportClassName="overflow-y-auto"
    >
      <div
        className={cn('relative w-full', className)}
        onClick={onClick}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          padding: `${GAP / 2}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = items.slice(
            virtualRow.index * columnCount,
            virtualRow.index * columnCount + columnCount,
          );

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${ITEM_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid px-1"
                style={{
                  columnGap: `${GAP}px`,
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {rowItems.map((skill) => {
                  const isHovered = hoveredSkillId === skill.id;
                  const isFocused = focusedSkillId === skill.id;

                  return (
                    <SkillItem key={skill.id} skillId={skill.id}>
                      <VirtualizedSkillRow
                        selected={selectedMap.get(`${skill.groupId}`) === skill.id}
                        isHovered={isHovered}
                        isFocused={isFocused}
                        onMouseEnter={() => setHoveredSkillId(skill.id)}
                        onMouseLeave={() => setHoveredSkillId(null)}
                      />
                    </SkillItem>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
