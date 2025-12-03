import React from 'react';

const SECTION_COLOR = 'rgb(107,145,173)';
const BG_COLOR = 'rgb(228,235,240)';

/**
 * Renders the section numbers bar (1-24) at the bottom of the race track.
 */
export const SectionNumbers = React.memo(() => {
  return (
    <>
      {/* Background */}
      <rect x="0" y="82%" height="18%" width="100%" fill={BG_COLOR} />

      {/* Section divider lines */}
      {Array.from({ length: 25 }, (_, i) => (
        <line
          key={`section-line-${i}`}
          x1={`${(i / 24) * 100}%`}
          y1="96%"
          x2={`${(i / 24) * 100}%`}
          y2="100%"
          stroke={SECTION_COLOR}
          strokeWidth={i === 0 || i === 24 ? '4' : '2'}
        />
      ))}

      {/* Section numbers */}
      {Array.from({ length: 24 }, (_, i) => (
        <text
          key={`section-num-${i + 1}`}
          x={`${(1 / 48 + i / 24) * 100}%`}
          y="91%"
          fontSize="10px"
          textAnchor="middle"
          dominantBaseline="central"
          fill={SECTION_COLOR}
        >
          {i + 1}
        </text>
      ))}

      {/* Bottom border */}
      <rect x="0" y="98.2%" height="1.8%" width="100%" fill={SECTION_COLOR} />
    </>
  );
});
