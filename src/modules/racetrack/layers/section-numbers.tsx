import React from 'react';
import { RaceTrackDimensions } from '../types';

const SECTION_COLOR = 'rgb(107,145,173)';
const BG_COLOR = 'rgb(228,235,240)';

/**
 * Renders the section numbers bar (1-24) at the bottom of the race track.
 */
export const SectionNumbersBar = React.memo(() => {
  return (
    <svg
      id="race-section-numbers"
      x={RaceTrackDimensions.xOffset}
      y={RaceTrackDimensions.SectionNumbersBarY}
      width={RaceTrackDimensions.RenderWidth}
      height={RaceTrackDimensions.SectionNumbersBarHeight}
    >
      {/* Background */}
      <rect x="0" y="0" height="100%" width="100%" fill={BG_COLOR} />

      {/* Section divider lines */}
      {Array.from({ length: 25 }, (_, sectionLine) => sectionLine).map((sectionLine) => {
        const x1 = (sectionLine / 24) * 100;
        const x2 = (sectionLine / 24) * 100;
        const y1 = RaceTrackDimensions.SectionNumbersBarHeight - 4;
        const y2 = RaceTrackDimensions.SectionNumbersBarHeight;
        const strokeWidth = sectionLine === 0 || sectionLine === 24 ? '4' : '2';

        return (
          <line
            key={`section-line-${sectionLine}`}
            x1={`${x1}%`}
            y1={y1}
            x2={`${x2}%`}
            y2={y2}
            stroke={SECTION_COLOR}
            strokeWidth={strokeWidth}
          />
        );
      })}

      {/* Section numbers */}
      {Array.from({ length: 24 }, (_, sectionNumber) => sectionNumber + 1).map((sectionNumber) => {
        const x1 = (1 / 48 + (sectionNumber - 1) / 24) * 100;
        const y1 = RaceTrackDimensions.SectionNumbersBarHeight / 2;

        return (
          <text
            key={`section-num-${sectionNumber}`}
            x={`${x1}%`}
            y={y1}
            fontSize="10px"
            textAnchor="middle"
            dominantBaseline="central"
            fill={SECTION_COLOR}
          >
            {sectionNumber}
          </text>
        );
      })}

      {/* Bottom border */}
      <rect
        x="0"
        y={RaceTrackDimensions.SectionNumbersBarHeight - 2}
        height="2"
        width="100%"
        fill={SECTION_COLOR}
      />
    </svg>
  );
});
