import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanDragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  className?: string;
};

export function PlanDragHandle(props: PlanDragHandleProps) {
  const { attributes, listeners, className } = props;

  return (
    <button
      type="button"
      className={cn(
        'touch-none cursor-grab rounded-lg text-muted-foreground outline-none active:cursor-grabbing focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
      <span className="sr-only">Reorder banner</span>
    </button>
  );
}
