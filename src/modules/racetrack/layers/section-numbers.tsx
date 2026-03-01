import React from 'react';

const SECTION_COLOR = 'rgb(107,145,173)';
const BG_COLOR = 'rgb(228,235,240)';

/**
 * Renders the section numbers bar (1-24) at the bottom of the race track.
 */
type SectionNumbersBarProps = {
  readonly yOffset: number;
};

const sectionNumbersBarHeightPx = 20;

export const SectionNumbersBar = React.memo<SectionNumbersBarProps>(({ yOffset }) => {
  return (
    <svg
      id="race-section-numbers"
      x="0"
      y={yOffset}
      width="100%"
      height={sectionNumbersBarHeightPx}
    >
      {/* Background */}
      <rect x="0" y="0" height="100%" width="100%" fill={BG_COLOR} />

      {/* Section divider lines */}
      {Array.from({ length: 25 }, (_, i) => {
        const x1 = (i / 24) * 100;
        const x2 = (i / 24) * 100;
        const y1 = sectionNumbersBarHeightPx - 4;
        const y2 = sectionNumbersBarHeightPx;
        const strokeWidth = i === 0 || i === 24 ? '4' : '2';

        return (
          <line
            key={`section-line-${i}`}
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
      {Array.from({ length: 24 }, (_, i) => {
        const x1 = (1 / 48 + i / 24) * 100;
        const y1 = sectionNumbersBarHeightPx / 2;

        return (
          <text
            key={`section-num-${i + 1}`}
            x={`${x1}%`}
            y={y1}
            fontSize="10px"
            textAnchor="middle"
            dominantBaseline="central"
            fill={SECTION_COLOR}
          >
            {i + 1}
          </text>
        );
      })}

      {/* Bottom border */}
      <rect x="0" y={sectionNumbersBarHeightPx - 2} height="2" width="100%" fill={SECTION_COLOR} />
    </svg>
  );
});
