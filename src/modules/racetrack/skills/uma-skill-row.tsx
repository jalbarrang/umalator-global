import React, { useMemo } from 'react';
import { useForcedPositionMap } from '@/modules/simulation/stores/forced-positions.store';
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
  return 100 - MARKER_START_PCT - MARKER_RUNG_STEP_PCT * rungIndex;
};

const normalizeUmaIndex = (value?: number): 0 | 1 | null => {
  if (value === 0 || value === 1) return value;
  return null;
};

export type UmaSkillSectionProps = {
  course: CourseData;
  skillActivations: Array<RegionData>;
  rushedIndicators: Array<RegionData>;
  debuffIndicators: Array<RegionData>;
  showUma1: boolean;
  showUma2: boolean;
  onDragStart: DragStartHandler;
};

export const UmaSkillSection = React.memo<UmaSkillSectionProps>((props) => {
  const {
    course,
    skillActivations,
    rushedIndicators,
    debuffIndicators,
    showUma1,
    showUma2,
    onDragStart,
  } = props;

  const positionsMapUma1 = useForcedPositionMap('uma1');
  const positionsMapUma2 = useForcedPositionMap('uma2');
  const dragPreviewUma1 = useDragPreviewForUma(0);
  const dragPreviewUma2 = useDragPreviewForUma(1);
  const immediateCenterOffsetPct =
    (COMPACT_BAR_HEIGHT / 2 / RaceTrackDimensions.UmaSkillSectionHeight) * 100;

  const visibleRegions = useMemo(
    () =>
      [...skillActivations, ...rushedIndicators, ...debuffIndicators]
        .filter((region) => {
          const regionUmaIndex = normalizeUmaIndex(region.umaIndex);
          if (regionUmaIndex === null) return false;
          return regionUmaIndex === 0 ? showUma1 : showUma2;
        })
        .sort((a, b) => {
          const umaA = a.umaIndex ?? 0;
          const umaB = b.umaIndex ?? 0;

          if (umaA !== umaB) return umaB - umaA;

          return (b.regions[0]?.start ?? 0) - (a.regions[0]?.start ?? 0);
        }),
    [skillActivations, rushedIndicators, debuffIndicators, showUma1, showUma2],
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

    for (let i = 0; i < visibleRegions.length; i++) {
      const desc = visibleRegions[i];
      const umaIndex = normalizeUmaIndex(desc.umaIndex);
      if (umaIndex === null) continue;

      const positionsMap = umaIndex === 0 ? positionsMapUma1 : positionsMapUma2;
      const dragPreview = umaIndex === 0 ? dragPreviewUma1 : dragPreviewUma2;
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
          key: `imm-${umaIndex}-${i}`,
          xPct,
          markerY: rungToYPct(rungIndex) + immediateCenterOffsetPct,
          effectType: desc.effectType ?? 0,
          color: desc.color,
          isDebuff,
          text: desc.text,
          skillId: dragSkillId,
          umaIndex,
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
            key: `c-${umaIndex}-${i}-${rIndex}-${desc.skillId ?? 'n'}`,
            xPct,
            wPct,
            markerY: rungToYPct(rungIndex),
            color: desc.color,
            text: desc.text,
            effectType: desc.effectType,
            skillId: dragSkillId,
            umaIndex,
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
  }, [
    visibleRegions,
    course.distance,
    positionsMapUma1,
    positionsMapUma2,
    dragPreviewUma1,
    dragPreviewUma2,
    immediateCenterOffsetPct,
  ]);

  return (
    <svg x="0" y="0" width="100%" height="100%" overflow="visible">
      {durations.map(({ key, ...d }) => (
        <DurationMarker key={key} {...d} onDragStart={onDragStart} />
      ))}

      {immediates.map(({ key, ...d }) => (
        <ImmediateMarker key={key} {...d} onDragStart={onDragStart} />
      ))}
    </svg>
  );
});
