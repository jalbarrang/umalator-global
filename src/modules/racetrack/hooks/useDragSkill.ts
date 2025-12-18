import { useState, useCallback } from 'react';

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
}

interface DragOffset {
  x: number;
  y: number;
}

interface UseDragSkillParams {
  xOffset: number;
  courseDistance: number;
  viewBoxWidth: number; // Add this new param
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
  viewBoxWidth, // Add this
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

      // Get the main SVG element
      const mainSvg = (e.currentTarget as Element).closest(
        '.racetrackView',
      ) as SVGSVGElement | null;
      if (!mainSvg) return;

      const svgCoords = clientToSvgCoords(mainSvg, e.clientX, e.clientY);
      if (!svgCoords) return;

      const trackWidth = viewBoxWidth - xOffset;
      const x = svgCoords.x - xOffset;
      const dragX = (x / trackWidth) * courseDistance;

      setDraggedSkill({
        skillId,
        umaIndex,
        originalStart: start,
        originalEnd: end,
      });
      setDragOffset({ x: dragX - start, y: 0 });
    },
    [xOffset, courseDistance, viewBoxWidth],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggedSkill) return;

      const svg = e.currentTarget;
      const svgCoords = clientToSvgCoords(svg, e.clientX, e.clientY);
      if (!svgCoords) return;

      const trackWidth = viewBoxWidth - xOffset;
      const x = svgCoords.x - xOffset;

      const newStart = Math.round(
        Math.max(
          0,
          Math.min(
            courseDistance,
            (x / trackWidth) * courseDistance - dragOffset.x,
          ),
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
    [
      draggedSkill,
      dragOffset,
      xOffset,
      courseDistance,
      viewBoxWidth,
      onSkillDrag,
    ],
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
