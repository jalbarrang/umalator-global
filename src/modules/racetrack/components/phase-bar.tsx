import React from 'react';
import { SectionText } from './section-text';
import { DistanceMarker } from './distance-marker';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

interface PhaseBarProps {
  distance: number;
}

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

/**
 * Renders the race phase bar (Phase 0-3: Early, Mid, Late, Last Spurt).
 */
export const PhaseBar = React.memo<PhaseBarProps>(({ distance }) => {
  // Calculate phase start distances
  const phase1Start = Math.round(CourseHelpers.phaseStart(distance, 1));
  const phase2Start = Math.round(CourseHelpers.phaseStart(distance, 2));
  const phase3Start = Math.round(CourseHelpers.phaseStart(distance, 3));

  return (
    <>
      {PHASES.map((phase) => (
        <svg
          key={phase.id}
          className={`phase ${phase.id}`}
          x={phase.x}
          y="64%"
          width={phase.width}
          height="18%"
        >
          <rect x="0" y="0" height="90%" width="100%" fill={phase.mainColor} />
          <rect x="0" y="90%" height="10%" width="100%" fill={phase.accentColor} />
          <SectionText id={phase.id} w={phase.w} />
        </svg>
      ))}

      {/* Phase boundary markers */}
      <DistanceMarker d={phase1Start} x={16.67} y={78} />
      <DistanceMarker d={phase2Start} x={66.67} y={78} />
      <DistanceMarker d={phase3Start} x={83.33} y={78} />
    </>
  );
});
