import * as React from 'react';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';

// Types
export interface VirtualRenderContext {
  virtualItem: VirtualItem;
  index: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}

export interface VirtualTableProps {
  data: Array<unknown>;
  height: string | number;
  estimateSize?: number;
  overscan?: number;
  header?: React.ReactNode;
  children: (context: VirtualRenderContext) => React.ReactNode;
  className?: string;
  getItemKey?: (index: number) => string | number;
}

export interface VirtualTableRowProps extends React.ComponentProps<'tr'> {
  virtualItem: VirtualItem;
  index: number;
}

// VirtualTable Component
function VirtualTable({
  data,
  height,
  estimateSize = 50,
  overscan = 20,
  header,
  children,
  className,
  getItemKey,
  ...props
}: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey,
  });

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height: heightStyle }}
      {...props}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <table data-slot="table" className="w-full caption-bottom text-sm">
          {header}
          <tbody data-slot="table-body">
            {virtualizer.getVirtualItems().map((virtualItem, index) =>
              children({
                virtualItem,
                index,
                virtualizer,
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// VirtualTableHeader Component
function VirtualTableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />;
}

// VirtualTableRow Component
function VirtualTableRow({ virtualItem, index, className, style, ...props }: VirtualTableRowProps) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      style={{
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start - index * virtualItem.size}px)`,
        ...style,
      }}
      {...props}
    />
  );
}

export { VirtualTable, VirtualTableHeader, VirtualTableRow };
