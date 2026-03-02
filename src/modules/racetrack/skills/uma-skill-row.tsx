import React, { useMemo } from 'react';
import { useForcedPositions } from '@/modules/simulation/stores/forced-positions.store';
import { DragStartHandler, RegionDisplayType } from '../types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { RegionData } from '../hooks/useVisualizationData';

import { COMPACT_LANES, MARKER_START_PCT, MARKER_RUNG_STEP_PCT } from './definitions';
import { ImmediateLayout, ImmediateMarker } from './immediate-marker';
import { DurationLayout, DurationMarker } from './duration-marker';

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

// --- Main component ---

export type UmaSkillRowProps = {
  course: CourseData;
  skillActivations: Array<RegionData>;
  rushedIndicators: Array<RegionData>;
  debuffIndicators: Array<RegionData>;
  umaIndex: 0 | 1;
  label: string;
  visible: boolean;
  onDragStart: DragStartHandler;
};

export const UmaSkillRow = React.memo<UmaSkillRowProps>((props) => {
  const {
    umaIndex,
    course,
    skillActivations,
    rushedIndicators,
    debuffIndicators,
    label,
    visible,
    onDragStart,
  } = props;

  const forcedPositions = useForcedPositions();

  const rowY = useMemo(() => (umaIndex === 0 ? 0 : '50%'), [umaIndex]);

  const umaRegions = useMemo(
    () => [
      ...skillActivations.filter((r) => r.umaIndex === umaIndex),
      ...rushedIndicators.filter((r) => r.umaIndex === umaIndex),
      ...debuffIndicators.filter((r) => r.umaIndex === umaIndex),
    ],
    [skillActivations, rushedIndicators, debuffIndicators, umaIndex],
  );

  const positionsMap = useMemo(
    () => (umaIndex === 0 ? forcedPositions.uma1 : forcedPositions.uma2),
    [forcedPositions, umaIndex],
  );

  const { immediates, durations } = useMemo(() => {
    const rungs: Array<Array<{ start: number; end: number }>> = Array.from(
      { length: COMPACT_LANES },
      () => [],
    );
    const seenX = new Set<number>();
    const immOut: Array<ImmediateLayout> = [];
    const durOut: Array<DurationLayout> = [];

    for (let i = 0; i < umaRegions.length; i++) {
      const desc = umaRegions[i];

      if (desc.type === RegionDisplayType.Immediate && desc.regions.length > 0) {
        let position = desc.regions[0].start;

        if (desc.skillId && positionsMap[desc.skillId] !== undefined) {
          position = positionsMap[desc.skillId];
        }

        let xPct = (position / course.distance) * 100;
        while (seenX.has(xPct)) xPct += 0.3;
        seenX.add(xPct);

        immOut.push({
          key: `imm-${i}`,
          xPct,
          effectType: desc.effectType ?? 0,
          color: desc.color,
          isDebuff: !!desc.debuffId,
          text: desc.text,
          skillId: desc.skillId,
          umaIndex: desc.umaIndex,
          position,
          debuffId: desc.debuffId,
        });
        continue;
      }

      if (desc.type === RegionDisplayType.Textbox) {
        for (let rIndex = 0; rIndex < desc.regions.length; rIndex++) {
          const region = desc.regions[rIndex];
          const duration = region.end - region.start;

          let start = region.start;
          let end = region.end;

          if (desc.skillId && positionsMap[desc.skillId] !== undefined) {
            start = positionsMap[desc.skillId];
            end = start + duration;
          }

          const xPct = (start / course.distance) * 100;
          const wPct = ((end - start) / course.distance) * 100;

          const rungIndex = findAvailableRung(start, end, rungs);
          rungs[rungIndex % COMPACT_LANES].push({ start, end });

          durOut.push({
            key: `c-${i}-${rIndex}-${desc.skillId ?? 'n'}`,
            xPct,
            wPct,
            markerY: MARKER_START_PCT + MARKER_RUNG_STEP_PCT * rungIndex,
            color: desc.color,
            text: desc.text,
            effectType: desc.effectType,
            skillId: desc.skillId,
            umaIndex: desc.umaIndex,
            start,
            end,
            isDebuff: !!desc.debuffId,
            debuffId: desc.debuffId,
          });
        }
      }
    }

    return { immediates: immOut, durations: durOut };
  }, [umaRegions, course.distance, positionsMap]);

  if (!visible) return null;

  return (
    <svg x="0" y={rowY} width="100%" height="50%" overflow="visible">
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

      {durations.map(({ key, ...d }) => (
        <DurationMarker key={key} {...d} onDragStart={onDragStart} />
      ))}

      {immediates.map(({ key, ...d }) => (
        <ImmediateMarker key={key} {...d} onDragStart={onDragStart} />
      ))}
    </svg>
  );
});
