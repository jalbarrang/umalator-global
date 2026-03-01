import React from 'react';
import { SectionText } from '../primitives/section-text';
import { DistanceMarker } from '../primitives/distance-marker';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { useRaceTrack } from '../context/RaceTrackContext';

// Phase configuration
const PHASES = [
  {
    id: 'phase0',
    x: '0',
    width: '16.67%',
    mainColor: 'rgb(0,154,111)',
    accentColor: 'rgb(0,92,66)',
    w: 0.1667,
  },
  {
    id: 'phase1',
    x: '16.67%',
    width: '50%',
    mainColor: 'rgb(242,233,103)',
    accentColor: 'rgb(190,179,16)',
    w: 0.5,
  },
  {
    id: 'phase2',
    x: '66.67%',
    width: '16.67%',
    mainColor: 'rgb(209,134,175)',
    accentColor: 'rgb(149,56,107)',
    w: 0.1667,
  },
  {
    id: 'phase3',
    x: '83.33%',
    width: '16.67%',
    mainColor: 'rgb(199,109,159)',
    accentColor: 'rgb(133,51,96)',
    w: 0.1667,
  },
];

const phaseBarHeightPx = 50;

/**
 * Renders the race phase bar (Phase 0-3: Early, Mid, Late, Last Spurt).
 */
type PhaseBarProps = {
  readonly yOffset: number;
};

export const PhaseBar = React.memo<PhaseBarProps>(({ yOffset }) => {
  const { courseDistance: distance } = useRaceTrack();
  // Calculate phase start distances
  const phase1Start = Math.round(CourseHelpers.phaseStart(distance, 1));
  const phase2Start = Math.round(CourseHelpers.phaseStart(distance, 2));
  const phase3Start = Math.round(CourseHelpers.phaseStart(distance, 3));

  return (
    <svg id="race-phases" x="0" y={yOffset} width="100%" height={phaseBarHeightPx}>
      {PHASES.map((phase) => (
        <svg
          key={phase.id}
          className={`phase ${phase.id}`}
          x={phase.x}
          y="0"
          width={phase.width}
          height="100%"
        >
          <rect x="0" y="0" height="100%" width="100%" fill={phase.mainColor} />
          <rect x="0" y="90%" height="10%" width="100%" fill={phase.accentColor} />
          <SectionText id={phase.id} w={phase.w} />
        </svg>
      ))}

      {/* Phase boundary markers */}
      <DistanceMarker d={phase1Start} x={16.67} y={phaseBarHeightPx - 2} />
      <DistanceMarker d={phase2Start} x={66.67} y={phaseBarHeightPx - 2} />
      <DistanceMarker d={phase3Start} x={83.33} y={phaseBarHeightPx - 2} />
    </svg>
  );
});
