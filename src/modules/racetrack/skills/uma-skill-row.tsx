import React, { useMemo } from 'react';
import {
  type CompareRunnerId,
  useForcedPositionMap,
} from '@/modules/simulation/stores/forced-positions.store';
import { DragStartHandler, RegionDisplayType } from '../types';
import { RaceTrackDimensions } from '../types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { RegionData } from '../hooks/useVisualizationData';
import { useDragPreviewForUma } from '../hooks/useDragSkill';

import {
  COMPACT_BAR_HEIGHT,
  COMPACT_LANES,
  IMMEDIATE_HIT_PADDING,
  MARKER_START_PCT,
  MARKER_RUNG_STEP_PCT,
} from './definitions';
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
  rungs.push([]);
  return rungs.length - 1;
};

const rungToYPct = (rungIndex: number): number => {
  if (rungIndex < COMPACT_LANES) {
    return MARKER_START_PCT + MARKER_RUNG_STEP_PCT * rungIndex;
  }
  return MARKER_START_PCT - MARKER_RUNG_STEP_PCT * (rungIndex - COMPACT_LANES + 1);
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

  const runnerId: CompareRunnerId = umaIndex === 0 ? 'uma1' : 'uma2';
  const positionsMap = useForcedPositionMap(runnerId);
  const dragPreview = useDragPreviewForUma(umaIndex);
  const immediateCenterOffsetPct =
    (COMPACT_BAR_HEIGHT / 2 / RaceTrackDimensions.UmaSkillSectionRowHeight) * 100;

  const rowY = useMemo(() => (umaIndex === 0 ? 0 : '50%'), [umaIndex]);

  const umaRegions = useMemo(
    () =>
      [
        ...skillActivations.filter((r) => r.umaIndex === umaIndex),
        ...rushedIndicators.filter((r) => r.umaIndex === umaIndex),
        ...debuffIndicators.filter((r) => r.umaIndex === umaIndex),
      ].sort((a, b) => (a.regions[0]?.start ?? 0) - (b.regions[0]?.start ?? 0)),
    [skillActivations, rushedIndicators, debuffIndicators, umaIndex],
  );

  const { immediates, durations } = useMemo(() => {
    const rungs: Array<Array<{ start: number; end: number }>> = Array.from(
      { length: COMPACT_LANES },
      () => [],
    );
    const immOut: Array<ImmediateLayout> = [];
    const durOut: Array<DurationLayout> = [];
    const metersPerSvgUnit = course.distance / RaceTrackDimensions.RenderWidth;
    const immediateHalfWindowMeters = Math.max(1, IMMEDIATE_HIT_PADDING * metersPerSvgUnit);

    for (let i = 0; i < umaRegions.length; i++) {
      const desc = umaRegions[i];
      const isDebuff = desc.isDebuff ?? !!desc.debuffId;
      const markerType = desc.debuffId ? 'debuff' : 'skill';
      const dragSkillId = isDebuff && !desc.debuffId ? undefined : desc.skillId;

      if (desc.type === RegionDisplayType.Immediate && desc.regions.length > 0) {
        let position = desc.regions[0].start;

        if (desc.skillId && positionsMap[desc.skillId] !== undefined) {
          position = positionsMap[desc.skillId];
        }

        const matchesPreview =
          !!dragPreview &&
          dragPreview.markerType === markerType &&
          dragPreview.umaIndex === umaIndex &&
          ((markerType === 'debuff' && desc.debuffId === dragPreview.debuffId) ||
            (dragSkillId === dragPreview.skillId &&
              position === dragPreview.originalStart &&
              position === dragPreview.originalEnd));

        if (matchesPreview) {
          position = dragPreview.start;
        }

        const immediateStart = Math.max(0, position - immediateHalfWindowMeters);
        const immediateEnd = Math.min(course.distance, position + immediateHalfWindowMeters);

        const rungIndex = findAvailableRung(immediateStart, immediateEnd, rungs);
        rungs[rungIndex].push({ start: immediateStart, end: immediateEnd });

        const xPct = (position / course.distance) * 100;

        immOut.push({
          key: `imm-${i}`,
          xPct,
          markerY: rungToYPct(rungIndex) + immediateCenterOffsetPct,
          effectType: desc.effectType ?? 0,
          color: desc.color,
          isDebuff,
          text: desc.text,
          skillId: dragSkillId,
          umaIndex: desc.umaIndex,
          position,
          debuffId: desc.debuffId,
          isDragging: matchesPreview,
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

          const matchesPreview =
            !!dragPreview &&
            dragPreview.markerType === markerType &&
            dragPreview.umaIndex === umaIndex &&
            ((markerType === 'debuff' && desc.debuffId === dragPreview.debuffId) ||
              (dragSkillId === dragPreview.skillId &&
                start === dragPreview.originalStart &&
                end === dragPreview.originalEnd));

          if (matchesPreview) {
            start = dragPreview.start;
            end = dragPreview.end;
          }

          const xPct = (start / course.distance) * 100;
          const wPct = ((end - start) / course.distance) * 100;

          const rungIndex = findAvailableRung(start, end, rungs);
          rungs[rungIndex].push({ start, end });

          durOut.push({
            key: `c-${i}-${rIndex}-${desc.skillId ?? 'n'}`,
            xPct,
            wPct,
            markerY: rungToYPct(rungIndex),
            color: desc.color,
            text: desc.text,
            effectType: desc.effectType,
            skillId: dragSkillId,
            umaIndex: desc.umaIndex,
            start,
            end,
            isDebuff,
            debuffId: desc.debuffId,
            isDragging: matchesPreview,
          });
        }
      }
    }

    return { immediates: immOut, durations: durOut };
  }, [umaRegions, course.distance, positionsMap, dragPreview, umaIndex, immediateCenterOffsetPct]);

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
