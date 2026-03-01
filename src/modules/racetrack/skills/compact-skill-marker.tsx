import React, { memo } from 'react';
import { EffectSymbol } from '../primitives/effect-symbol';

const COMPACT_SYMBOL_SIZE = 3.5;

export type CompactSkillMarkerProps = {
  x: number;
  y: number;
  width: number;
  barHeight: number;
  color: { fill: string; stroke: string };
  text: string;
  effectType?: number;
  skillId?: string;
  onDragStart?: (e: React.MouseEvent) => void;
};

export const CompactSkillMarker = memo<CompactSkillMarkerProps>(
  ({ x, y, width, barHeight, color, text, effectType, skillId, onDragStart }) => {
    const isDraggable = !!skillId && !!onDragStart;
    return (
      <svg
        className="compact-skill-marker select-none"
        x={x}
        y={y}
        width={`${width}%`}
        height={barHeight}
        overflow="visible"
        onMouseDown={onDragStart}
        style={{ cursor: isDraggable ? 'grab' : 'default' }}
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth="0.6"
          rx="2"
          ry="2"
        />
        {effectType != null && (
          <g transform={`translate(${barHeight / 2}, ${barHeight / 2})`}>
            <EffectSymbol
              effectType={effectType}
              color={{ fill: 'rgba(255,255,255,0.9)', stroke: color.stroke }}
              injected={false}
              size={COMPACT_SYMBOL_SIZE}
            />
          </g>
        )}
        <title>{text}</title>
      </svg>
    );
  },
);
