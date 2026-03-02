import React, { useCallback, useMemo } from 'react';
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
    onDragStart,
  }) => {
    const { tooltipRef, bgRef, show, hide } = useSkillTooltip();
    const label = useMemo(() => `${text} @ ${Math.round(position)}m`, [text, position]);

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
        onPointerLeave={hide}
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
