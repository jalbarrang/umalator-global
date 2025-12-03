import { useState, useCallback } from 'react';

export interface DraggedSkill {
  skillId: string;
  umaIndex: number;
  originalStart: number;
  originalEnd: number;
}

interface DragOffset {
  x: number;
  y: number;
}

interface UseDragSkillParams {
  xOffset: number;
  courseDistance: number;
  onSkillDrag?: (
    skillId: number,
    umaIndex: number,
    start: number,
    end: number,
  ) => void;
}

export function useDragSkill({
  xOffset,
  courseDistance,
  onSkillDrag,
}: UseDragSkillParams) {
  const [draggedSkill, setDraggedSkill] = useState<DraggedSkill | null>(null);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      skillId: string,
      umaIndex: number,
      start: number,
      end: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the main SVG element (the one with the race track)
      const mainSvg = (e.currentTarget as Element).closest('.racetrackView');
      if (!mainSvg) return;

      const rect = mainSvg.getBoundingClientRect();
      const w = rect.width - xOffset;
      const x = e.clientX - rect.left - xOffset;
      const dragX = (x / w) * courseDistance;

      setDraggedSkill({
        skillId,
        umaIndex,
        originalStart: start,
        originalEnd: end,
      });
      setDragOffset({ x: dragX - start, y: 0 });
    },
    [xOffset, courseDistance],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggedSkill) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const w = rect.width - xOffset;
      const x = e.clientX - rect.left - xOffset;

      const newStart = Math.round(
        Math.max(
          0,
          Math.min(courseDistance, (x / w) * courseDistance - dragOffset.x),
        ),
      );
      const skillLength = Math.max(
        50,
        draggedSkill.originalEnd - draggedSkill.originalStart,
      );
      const newEnd = Math.round(
        Math.max(
          newStart + skillLength,
          Math.min(courseDistance, newStart + skillLength),
        ),
      );

      if (onSkillDrag) {
        onSkillDrag(
          parseInt(draggedSkill.skillId, 10),
          draggedSkill.umaIndex,
          newStart,
          newEnd,
        );
      }
    },
    [draggedSkill, dragOffset, xOffset, courseDistance, onSkillDrag],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedSkill(null);
  }, []);

  return {
    draggedSkill,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
