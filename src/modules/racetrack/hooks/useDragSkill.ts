import { useCallback, useState } from 'react';
import { create } from 'zustand';

// Helper to convert client coords to SVG space
function clientToSvgCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());

  return { x: svgPoint.x, y: svgPoint.y };
}

export interface DraggedSkill {
  skillId: string;
  umaIndex: number;
  originalStart: number;
  originalEnd: number;
  markerType: 'skill' | 'debuff';
  debuffId?: string;
}

export interface DragPreview extends DraggedSkill {
  start: number;
  end: number;
}

interface DragOffset {
  x: number;
}

type DragPreviewState = {
  preview: DragPreview | null;
};

const useDragPreviewStore = create<DragPreviewState>(() => ({
  preview: null,
}));

const previewMatchesDraggedSkill = (preview: DragPreview | null, draggedSkill: DraggedSkill | null) => {
  if (!preview || !draggedSkill) return false;

  return (
    preview.skillId === draggedSkill.skillId &&
    preview.umaIndex === draggedSkill.umaIndex &&
    preview.markerType === draggedSkill.markerType &&
    preview.debuffId === draggedSkill.debuffId &&
    preview.originalStart === draggedSkill.originalStart &&
    preview.originalEnd === draggedSkill.originalEnd
  );
};

const previewsAreEqual = (a: DragPreview | null, b: DragPreview | null) => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.skillId === b.skillId &&
    a.umaIndex === b.umaIndex &&
    a.markerType === b.markerType &&
    a.debuffId === b.debuffId &&
    a.originalStart === b.originalStart &&
    a.originalEnd === b.originalEnd &&
    a.start === b.start &&
    a.end === b.end
  );
};

const setDragPreview = (preview: DragPreview | null) => {
  useDragPreviewStore.setState((state) => {
    if (previewsAreEqual(state.preview, preview)) {
      return state;
    }
    return { preview };
  });
};

const clearDragPreview = () => {
  useDragPreviewStore.setState((state) => {
    if (!state.preview) {
      return state;
    }
    return { preview: null };
  });
};

export const useDragPreviewForUma = (umaIndex: 0 | 1) => {
  return useDragPreviewStore((state) => {
    if (!state.preview || state.preview.umaIndex !== umaIndex) {
      return null;
    }
    return state.preview;
  });
};

export const getActiveDragPreview = () => {
  return useDragPreviewStore.getState().preview;
};

interface UseDragSkillParams {
  xOffset: number;
  courseDistance: number;
  viewBoxWidth: number;
  onSkillDrag?: (
    skillId: string,
    umaIndex: number,
    start: number,
    end: number,
    markerType: 'skill' | 'debuff',
    debuffId?: string,
  ) => void;
}

export function useDragSkill({
  xOffset,
  courseDistance,
  viewBoxWidth,
  onSkillDrag,
}: UseDragSkillParams) {
  const [draggedSkill, setDraggedSkill] = useState<DraggedSkill | null>(null);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0 });

  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      skillId: string,
      umaIndex: number,
      start: number,
      end: number,
      markerType: 'skill' | 'debuff' = 'skill',
      debuffId?: string,
    ) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the main SVG element
      const mainSvg = e.currentTarget.closest<SVGSVGElement>('.racetrackView');
      if (!mainSvg) return;

      const svgCoords = clientToSvgCoords(mainSvg, e.clientX, e.clientY);
      if (!svgCoords) return;

      const trackWidth = viewBoxWidth;
      const x = svgCoords.x - xOffset;
      const dragX = (x / trackWidth) * courseDistance;

      clearDragPreview();
      setDraggedSkill({
        skillId,
        umaIndex,
        originalStart: start,
        originalEnd: end,
        markerType,
        debuffId,
      });
      setDragOffset({ x: dragX - start });
    },
    [xOffset, courseDistance, viewBoxWidth],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggedSkill) return;

      const svg = e.currentTarget;
      const svgCoords = clientToSvgCoords(svg, e.clientX, e.clientY);
      if (!svgCoords) return;

      const trackWidth = viewBoxWidth;
      const x = svgCoords.x - xOffset;

      const newStart = Math.round(
        Math.max(0, Math.min(courseDistance, (x / trackWidth) * courseDistance - dragOffset.x)),
      );
      const skillLength = Math.max(50, draggedSkill.originalEnd - draggedSkill.originalStart);
      const newEnd = Math.round(
        Math.max(newStart + skillLength, Math.min(courseDistance, newStart + skillLength)),
      );

      setDragPreview({
        ...draggedSkill,
        start: newStart,
        end: newEnd,
      });
    },
    [draggedSkill, dragOffset, xOffset, courseDistance, viewBoxWidth],
  );

  const handleDragEnd = useCallback(() => {
    const preview = useDragPreviewStore.getState().preview;

    if (onSkillDrag && draggedSkill) {
      const previewToCommit =
        preview && previewMatchesDraggedSkill(preview, draggedSkill) ? preview : null;

      onSkillDrag(
        draggedSkill.skillId,
        draggedSkill.umaIndex,
        previewToCommit ? previewToCommit.start : draggedSkill.originalStart,
        previewToCommit ? previewToCommit.end : draggedSkill.originalEnd,
        draggedSkill.markerType,
        draggedSkill.debuffId,
      );
    }

    clearDragPreview();
    setDraggedSkill(null);
  }, [draggedSkill, onSkillDrag]);

  return {
    draggedSkill,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
