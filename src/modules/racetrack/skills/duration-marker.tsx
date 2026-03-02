import React, { useCallback } from 'react';
import { DragStartHandler } from '../types';
import { CompactSkillMarker } from './compact-skill-marker';
import { COMPACT_BAR_HEIGHT } from './definitions';

export type DurationLayout = {
  key: string;
  xPct: number;
  wPct: number;
  markerY: number;
  color: { fill: string; stroke: string };
  text: string;
  effectType?: number;
  skillId?: string;
  umaIndex?: number;
  start: number;
  end: number;
  isDebuff: boolean;
  debuffId?: string;
};

export const DurationMarker = React.memo<DurationLayout & { onDragStart: DragStartHandler }>(
  ({
    xPct,
    wPct,
    markerY,
    color,
    text,
    effectType,
    skillId,
    umaIndex,
    start,
    end,
    isDebuff,
    debuffId,
    onDragStart,
  }) => {
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!skillId || umaIndex === undefined) return;
        onDragStart(e, skillId, umaIndex, start, end, isDebuff ? 'debuff' : 'skill', debuffId);
      },
      [skillId, umaIndex, start, end, isDebuff, debuffId, onDragStart],
    );

    return (
      <CompactSkillMarker
        x={xPct}
        y={markerY}
        width={wPct}
        barHeight={COMPACT_BAR_HEIGHT}
        color={color}
        text={text}
        effectType={effectType}
        skillId={skillId}
        start={start}
        end={end}
        onDragStart={handleMouseDown}
      />
    );
  },
);
