import React, { memo, useMemo } from 'react';
import { EffectSymbol } from '../primitives/effect-symbol';
import { COMPACT_SYMBOL_SIZE } from './definitions';
import { SkillTooltip, useSkillTooltip } from './skill-tooltip';

export type CompactSkillMarkerProps = {
  x: number;
  y: number;
  width: number;
  barHeight: number;
  color: { fill: string; stroke: string };
  text: string;
  effectType?: number;
  skillId?: string;
  start?: number;
  end?: number;
  onDragStart?: (e: React.MouseEvent) => void;
};

export const CompactSkillMarker = memo<CompactSkillMarkerProps>(
  ({ x, y, width, barHeight, color, text, effectType, skillId, start, end, onDragStart }) => {
    const isDraggable = useMemo(() => !!skillId && !!onDragStart, [skillId, onDragStart]);
    const markerStyle = useMemo(
      () => ({ cursor: isDraggable ? 'grab' : 'default' }),
      [isDraggable],
    );

    const { tooltipRef, bgRef, show, hide } = useSkillTooltip();

    const tooltipLabel = useMemo(() => {
      if (start == null) return text;
      const duration = end != null ? end - start : 0;
      return duration > 0
        ? `${text} @ ${Math.round(start)}m (${Math.round(duration)}m)`
        : `${text} @ ${Math.round(start)}m`;
    }, [text, start, end]);

    return (
      <svg
        className="compact-skill-marker select-none"
        x={`${x}%`}
        y={`${y}%`}
        width={`${width}%`}
        height={barHeight}
        overflow="visible"
        onMouseDown={onDragStart}
        onPointerEnter={show}
        onPointerLeave={hide}
        style={markerStyle}
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
              color={{ fill: '#fff', stroke: '#fff' }}
              size={COMPACT_SYMBOL_SIZE}
            />
          </g>
        )}

        <svg x="0" y="0" width="100%" height="100%">
          <text
            x={barHeight + 1}
            y={barHeight / 2}
            dominantBaseline="central"
            fill="#fff"
            fontSize="7px"
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
          >
            {text}
          </text>
        </svg>

        <SkillTooltip
          label={tooltipLabel}
          tooltipRef={tooltipRef}
          bgRef={bgRef}
          offsetY={-barHeight / 2 - 4}
        />
      </svg>
    );
  },
);
