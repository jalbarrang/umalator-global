import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkillItem } from './skill-list/SkillItem';
import type { CSSProperties } from 'react';
import type { Skill } from '@/modules/skills/utils';

type VirtualizedSkillGridProps = {
  items: Array<Skill>;
  selectedMap: Map<string, string>;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
  focusedSkillId?: string | null;
};

const ITEM_HEIGHT = 44; // Height of SkillItem
const GAP = 8; // Gap between items
const ROW_HEIGHT = ITEM_HEIGHT + GAP;
const OVERSCAN_ROWS = 3; // Render 3 extra rows above and below viewport

export function VirtualizedSkillGrid({
  items,
  selectedMap,
  onClick,
  className = '',
  focusedSkillId = null,
}: VirtualizedSkillGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);

  // Detect column count based on container width using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Set initial container height
        setContainerHeight(entry.contentRect.height);

        // Determine column count based on breakpoints (matching Tailwind)
        // sm: 640px, lg: 1024px
        if (width >= 1024) {
          setColumnCount(3);
        } else if (width >= 640) {
          setColumnCount(2);
        } else {
          setColumnCount(1);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setContainerHeight(target.clientHeight);
  }, []);

  // Calculate visible range based on scroll position
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnCount);
    const totalHeight = totalRows * ROW_HEIGHT;

    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    return {
      startIndex: startRow * columnCount,
      endIndex: Math.min(items.length, endRow * columnCount),
      totalHeight,
    };
  }, [items.length, columnCount, scrollTop, containerHeight]);

  // Calculate positioning for an item
  const getItemStyle = useCallback(
    (index: number): CSSProperties => {
      const row = Math.floor(index / columnCount);
      const col = index % columnCount;

      return {
        position: 'absolute',
        top: `${row * ROW_HEIGHT}px`,
        left: `calc(${col} * (100% / ${columnCount}) + ${col > 0 ? GAP / 2 : 0}px)`,
        width: `calc(100% / ${columnCount} - ${GAP}px)`,
        height: `${ITEM_HEIGHT}px`,
      };
    },
    [columnCount],
  );

  // Auto-scroll to focused skill
  useEffect(() => {
    if (!focusedSkillId || !containerRef.current) return;

    const focusedIndex = items.findIndex((skill) => skill.id === focusedSkillId);
    if (focusedIndex === -1) return;

    const row = Math.floor(focusedIndex / columnCount);
    const itemTop = row * ROW_HEIGHT;
    const itemBottom = itemTop + ITEM_HEIGHT;

    const container = containerRef.current;
    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + container.clientHeight;

    // Scroll if item is not fully visible
    if (itemTop < viewportTop) {
      // Scroll up to show item at top
      container.scrollTop = itemTop - GAP;
    } else if (itemBottom > viewportBottom) {
      // Scroll down to show item at bottom
      container.scrollTop = itemBottom - container.clientHeight + GAP;
    }
  }, [focusedSkillId, items, columnCount]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto flex-1 min-h-0 ${className}`}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
          padding: `${GAP / 2}px`,
        }}
        onClick={onClick}
      >
        {items.slice(startIndex, endIndex).map((skill, i) => {
          const actualIndex = startIndex + i;
          const isHovered = hoveredSkillId === skill.id;
          const isFocused = focusedSkillId === skill.id;

          return (
            <SkillItem
              key={skill.id}
              skillId={skill.id}
              selected={selectedMap.get(skill.meta.groupId) === skill.id}
              isHovered={isHovered}
              isFocused={isFocused}
              onMouseEnter={() => setHoveredSkillId(skill.id)}
              onMouseLeave={() => setHoveredSkillId(null)}
              className="cursor-pointer"
              style={getItemStyle(actualIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
