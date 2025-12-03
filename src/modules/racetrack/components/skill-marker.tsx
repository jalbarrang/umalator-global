import React from 'react';

interface SkillMarkerProps {
  x: number;
  y: number;
  width: number;
  color: {
    fill: string;
    stroke: string;
  };
  text: string;
  skillId?: string;
  umaIndex?: number;
  onDragStart?: (e: React.MouseEvent) => void;
}

/**
 * Renders a draggable skill marker on the race track.
 */
export const SkillMarker = React.memo<SkillMarkerProps>(
  ({ x, y, width, color, text, skillId, onDragStart }) => {
    const isDraggable = !!skillId && !!onDragStart;

    return (
      <svg
        className="drag-textbox"
        x={`${x}%`}
        y={`${y}%`}
        width={`${width}%`}
        height="10%"
        onMouseDown={isDraggable ? onDragStart : undefined}
        style={{ cursor: isDraggable ? 'grab' : 'default' }}
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={color.fill}
          stroke={color.stroke}
        />
        <text x="0" y="50%" fontSize="12px" dominantBaseline="central">
          {text}
        </text>
      </svg>
    );
  },
);

SkillMarker.displayName = 'SkillMarker';
