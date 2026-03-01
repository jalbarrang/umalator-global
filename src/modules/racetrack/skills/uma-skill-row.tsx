import React, { useMemo } from 'react';
import { useForcedPositions } from '@/modules/simulation/stores/forced-positions.store';
import { RegionDisplayType } from '../types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { CompactSkillMarker } from './compact-skill-marker';
import { useRaceTrack } from '../context/RaceTrackContext';

const COMPACT_BAR_HEIGHT = 10;
const COMPACT_LANES = 3;

const findAvailableRung = (
  start: number,
  end: number,
  rungs: Array<Array<{ start: number; end: number }>>,
): number => {
  for (let i = 0; i < rungs.length; i++) {
    const hasOverlap = rungs[i].some((b) => !(end <= b.start || start >= b.end));
    if (!hasOverlap) return i;
  }
  return 0;
};

export type UmaSkillRowProps = {
  course: CourseData;
  umaIndex: 0 | 1;
  label: string;

  yOffset: number;

  visible: boolean;
  onDragStart: (
    e: React.MouseEvent,
    skillId: string,
    umaIndex: number,
    start: number,
    end: number,
    markerType?: 'skill' | 'debuff',
    debuffId?: string,
  ) => void;
};

export const UmaSkillRow = React.memo<UmaSkillRowProps>((props) => {
  const { umaIndex, course, label, yOffset, visible, onDragStart } = props;
  const forcedPositions = useForcedPositions();

  const { skillActivations, rushedIndicators } = useRaceTrack();

  const umaRegions = useMemo(
    () => [
      ...skillActivations.filter((r) => r.umaIndex === umaIndex),
      ...rushedIndicators.filter((r) => r.umaIndex === umaIndex),
    ],
    [skillActivations, rushedIndicators, umaIndex],
  );

  if (!visible) return null;

  const rungs: Array<Array<{ start: number; end: number }>> = Array.from(
    { length: COMPACT_LANES },
    () => [],
  );
  const seen = new Set<number>();

  const immediateLines: Array<React.ReactElement> = [];
  const markers: Array<React.ReactElement> = [];

  for (let descIndex = 0; descIndex < umaRegions.length; descIndex++) {
    const desc = umaRegions[descIndex];

    if (desc.type === RegionDisplayType.Immediate && desc.regions.length > 0) {
      let xPct = (desc.regions[0].start / course.distance) * 100;
      const COLLISION_OFFSET = 0.3;
      while (seen.has(xPct)) {
        xPct += COLLISION_OFFSET;
      }
      seen.add(xPct);
      immediateLines.push(
        <line
          key={`imm-${descIndex}`}
          x1={`${xPct}%`}
          y1="0"
          x2={`${xPct}%`}
          y2="100%"
          stroke={desc.color.stroke}
          strokeWidth={xPct === 0 ? 3 : 1.5}
        />,
      );
      continue;
    }

    if (desc.type === RegionDisplayType.Textbox) {
      for (let rIndex = 0; rIndex < desc.regions.length; rIndex++) {
        const r = desc.regions[rIndex];
        let start = r.start;
        let end = r.end;

        if (desc.skillId && desc.umaIndex !== undefined) {
          const positions = desc.umaIndex === 0 ? forcedPositions.uma1 : forcedPositions.uma2;
          const forcedPos = positions?.[desc.skillId];
          if (forcedPos !== undefined) {
            start = forcedPos;
            end = forcedPos + (r.end - r.start);
          }
        }

        const xPct = (start / course.distance) * 100;
        const wPct = ((end - start) / course.distance) * 100;

        const rungIndex = findAvailableRung(start, end, rungs);
        rungs[rungIndex % COMPACT_LANES].push({ start, end });

        const markerY = yOffset + COMPACT_BAR_HEIGHT + 2 + (COMPACT_BAR_HEIGHT + 1) * rungIndex;

        const handleOnDragStart = (e: React.MouseEvent) => {
          if (!desc.skillId || desc.umaIndex === undefined) return;
          onDragStart(e, desc.skillId, desc.umaIndex, start, end);
        };

        markers.push(
          <CompactSkillMarker
            key={`c-${descIndex}-${rIndex}-${desc.skillId ?? 'n'}`}
            x={xPct}
            y={markerY}
            width={wPct}
            barHeight={COMPACT_BAR_HEIGHT}
            color={desc.color}
            text={desc.text}
            effectType={desc.effectType}
            skillId={desc.skillId}
            onDragStart={handleOnDragStart}
          />,
        );
      }
    }
  }

  return (
    <svg x="0" y={yOffset} width="100%" height="20">
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="var(--card)"
        stroke="color-mix(in srgb, var(--border) 60%, transparent)"
        strokeWidth="0.6"
        rx="3"
        ry="3"
      />
      <text
        x="4"
        y="50%"
        fill="var(--muted-foreground)"
        fontSize="9px"
        fontWeight="600"
        dominantBaseline="central"
        opacity="0.7"
      >
        {label}
      </text>

      {immediateLines}
      {markers}
    </svg>
  );
});
