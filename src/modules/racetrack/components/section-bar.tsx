import React, { useMemo } from 'react';
import { SectionText } from './section-text';
import { DistanceMarker } from './distance-marker';

interface Straight {
  readonly start: number;
  readonly end: number;
  readonly frontType: number;
}

interface Corner {
  readonly start: number;
  readonly length: number;
}

interface SectionBarProps {
  straights: ReadonlyArray<Straight>;
  corners: ReadonlyArray<Corner>;
  distance: number;
}

// Colors for straights (alternating)
const STRAIGHT_COLORS = {
  main: ['rgb(209,235,255)', 'rgb(185,224,255)'],
  accent: ['rgb(23,154,255)', 'rgb(9,146,254)'],
};

// Colors for corners (alternating)
const CORNER_COLORS = {
  main: ['rgb(255,216,185)', 'rgb(254,228,209)'],
  accent: ['rgb(254,117,9)', 'rgb(250,121,27)'],
};

/**
 * Renders the straights and corners bar showing course sections.
 */
export const SectionBar = React.memo<SectionBarProps>(({ straights, corners, distance }) => {
  const elements = useMemo(() => {
    // Combine and sort all sections for marker placement
    const allSections = straights
      .concat(
        corners.map((c) => ({
          start: c.start,
          end: c.start + c.length,
          frontType: 0,
        })),
      )
      .sort((a, b) => a.start - b.start);

    // Straight section boxes
    const straightBoxes = straights.map((s, i) => (
      <svg
        key={`straight-${i}`}
        className="straight"
        x={`${(s.start / distance) * 100}%`}
        y="46%"
        width={`${((s.end - s.start) / distance) * 100}%`}
        height="18%"
      >
        <rect x="0" y="0" height="90%" width="100%" fill={STRAIGHT_COLORS.main[i % 2]} />
        <rect x="0" y="90%" height="10%" width="100%" fill={STRAIGHT_COLORS.accent[i % 2]} />
        <SectionText id="straight" w={((s.end - s.start) / distance) * 100} />
      </svg>
    ));

    // Corner section boxes
    const cornerBoxes = corners.map((c, i) => (
      <svg
        key={`corner-${i}`}
        className="corner"
        x={`${(c.start / distance) * 100}%`}
        y="46%"
        width={`${(c.length / distance) * 100}%`}
        height="18%"
      >
        <rect x="0" y="0" height="90%" width="100%" fill={CORNER_COLORS.main[i % 2]} />
        <rect x="0" y="90%" height="10%" width="100%" fill={CORNER_COLORS.accent[i % 2]} />
        <SectionText
          id="corner"
          w={c.length / distance}
          fields={{ n: 4 - ((corners.length - i - 1) % 4) }}
        />
      </svg>
    ));

    // Distance markers for section boundaries
    const sectionMarkers = allSections.flatMap((s, i) => {
      const nodes: Array<React.ReactElement> = [];
      let markedStart = false;

      if (s.start !== 0 && (i === 0 || s.start !== allSections[i - 1].end)) {
        markedStart = true;
        nodes.push(
          <DistanceMarker
            key={`section-marker-${i}-start`}
            d={s.start}
            x={(s.start / distance) * 100}
            y={60}
            up={i > 0 && s.start - allSections[i - 1].end < distance * 0.05}
          />,
        );
      }

      if (s.end !== distance) {
        nodes.push(
          <DistanceMarker
            key={`section-marker-${i}-end`}
            d={s.end}
            x={(s.end / distance) * 100}
            y={60}
            up={markedStart && s.end - s.start < distance * 0.05}
          />,
        );
      }

      return nodes;
    });

    return { straightBoxes, cornerBoxes, sectionMarkers };
  }, [straights, corners, distance]);

  return (
    <>
      {/* Background bar */}
      <svg className="sectionsBg" x="0" y="46%" width="100%" height="18%">
        <rect x="0" y="0" height="90%" width="100%" fill="rgb(232,232,232)" />
        <rect x="0" y="90%" height="10%" width="100%" fill="rgb(139,139,139)" />
      </svg>
      {elements.straightBoxes}
      {elements.cornerBoxes}
      {elements.sectionMarkers}
    </>
  );
});
