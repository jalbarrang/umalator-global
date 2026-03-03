import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DragStartHandler } from '../types';
import { IMMEDIATE_HIT_PADDING, IMMEDIATE_SYMBOL_SIZE } from './definitions';
import { EffectSymbol } from '../primitives/effect-symbol';
import { SkillTooltip, useSkillTooltip } from './skill-tooltip';

export type ImmediateLayout = {
  key: string;
  xPct: number;
  markerY: number;
  effectType: number;
  color: { fill: string; stroke: string };
  isDebuff: boolean;
  text: string;
  skillId?: string;
  umaIndex?: number;
  position: number;
  debuffId?: string;
  isDragging?: boolean;
};

export const ImmediateMarker = React.memo<ImmediateLayout & { onDragStart: DragStartHandler }>(
  ({
    xPct,
    markerY,
    effectType,
    color,
    isDebuff,
    text,
    skillId,
    umaIndex,
    position,
    debuffId,
    isDragging = false,
    onDragStart,
  }) => {
    const { tooltipRef, bgRef, show, hide } = useSkillTooltip();
    const wasDraggingRef = useRef(false);
    const label = useMemo(() => `${text} @ ${Math.round(position)}m`, [text, position]);

    useEffect(() => {
      if (isDragging) {
        wasDraggingRef.current = true;
        return;
      }

      if (wasDraggingRef.current) {
        hide();
        wasDraggingRef.current = false;
      }
    }, [isDragging, hide]);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!skillId || umaIndex === undefined) return;
        onDragStart(
          e,
          skillId,
          umaIndex,
          position,
          position,
          isDebuff ? 'debuff' : 'skill',
          debuffId,
        );
      },
      [skillId, umaIndex, position, isDebuff, debuffId, onDragStart],
    );

    const handlePointerLeave = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (isDragging || e.buttons !== 0) return;
        hide();
      },
      [hide, isDragging],
    );

    return (
      <svg
        x={`${xPct}%`}
        y={`${markerY}%`}
        width="0"
        height="0"
        overflow="visible"
        style={{ cursor: skillId ? 'grab' : 'default' }}
        onMouseDown={handleMouseDown}
        onPointerEnter={show}
        onPointerLeave={handlePointerLeave}
      >
        <rect
          x={-IMMEDIATE_HIT_PADDING}
          y={-IMMEDIATE_HIT_PADDING}
          width={IMMEDIATE_HIT_PADDING * 2}
          height={IMMEDIATE_HIT_PADDING * 2}
          fill="transparent"
        />

        <EffectSymbol
          effectType={effectType}
          color={color}
          size={IMMEDIATE_SYMBOL_SIZE}
        />

        <SkillTooltip
          label={label}
          tooltipRef={tooltipRef}
          bgRef={bgRef}
          offsetY={-IMMEDIATE_SYMBOL_SIZE - 6}
        />
      </svg>
    );
  },
);
