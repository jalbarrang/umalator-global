import React, { useMemo } from 'react';
import { SectionText } from '../primitives/section-text';
import { DistanceMarker } from '../primitives/distance-marker';
import { useRaceTrack } from '../context/RaceTrackContext';

interface Straight {
  readonly start: number;
  readonly end: number;
  readonly frontType: number;
}

interface Corner {
  readonly start: number;
  readonly length: number;
}

const STRAIGHT_COLORS = {
  main: ['rgb(209,235,255)', 'rgb(185,224,255)'],
  accent: ['rgb(23,154,255)', 'rgb(9,146,254)'],
};

const CORNER_COLORS = {
  main: ['rgb(255,216,185)', 'rgb(254,228,209)'],
  accent: ['rgb(254,117,9)', 'rgb(250,121,27)'],
};

type SectionTypesBarProps = {
  readonly yOffset: number;
};

const sectionBarHeightPx = 50;

export const SectionTypesBar = React.memo<SectionTypesBarProps>(({ yOffset }) => {
  const { course } = useRaceTrack();
  const straights = course.straights as ReadonlyArray<Straight>;
  const corners = course.corners as ReadonlyArray<Corner>;
  const distance = course.distance;
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
    const straightBoxes = straights.map((s, i) => {
      const x = (s.start / distance) * 100;
      const width = ((s.end - s.start) / distance) * 100;

      return (
        <svg
          key={`straight-${i}`}
          className="straight"
          x={`${x}%`}
          y="0"
          width={`${width}%`}
          height={sectionBarHeightPx}
        >
          <rect x="0" y="0" height="100%" width="100%" fill={STRAIGHT_COLORS.main[i % 2]} />
          <rect x="0" y="90%" height="10%" width="100%" fill={STRAIGHT_COLORS.accent[i % 2]} />

          <SectionText id="straight" w={width} />
        </svg>
      );
    });

    // Corner section boxes
    const cornerBoxes = corners.map((c, i) => {
      const x = (c.start / distance) * 100;
      const width = (c.length / distance) * 100;
      const fields = { n: 4 - ((corners.length - i - 1) % 4) };

      return (
        <svg
          key={`corner-${i}`}
          className="corner"
          x={`${x}%`}
          y="0"
          width={`${width}%`}
          height={sectionBarHeightPx}
        >
          <rect x="0" y="0" height="100%" width="100%" fill={CORNER_COLORS.main[i % 2]} />
          <rect x="0" y="90%" height="10%" width="100%" fill={CORNER_COLORS.accent[i % 2]} />

          <SectionText id="corner" w={width} fields={fields} />
        </svg>
      );
    });

    // Distance markers for section boundaries
    const sectionMarkers = allSections.flatMap((s, i) => {
      const nodes: Array<React.ReactElement> = [];
      let markedStart = false;

      if (s.start !== 0 && (i === 0 || s.start !== allSections[i - 1].end)) {
        markedStart = true;
        const x = (s.start / distance) * 100;
        const up = i > 0 && s.start - allSections[i - 1].end < distance * 0.05;

        nodes.push(
          <DistanceMarker
            key={`section-marker-${i}-start`}
            d={s.start}
            x={x}
            y={sectionBarHeightPx}
            up={up}
          />,
        );
      }

      if (s.end !== distance) {
        const x = (s.end / distance) * 100;
        const up = markedStart && s.end - s.start < distance * 0.05;

        nodes.push(
          <DistanceMarker key={`section-marker-${i}-end`} d={s.end} x={x} y={2} up={up} />,
        );
      }

      return nodes;
    });

    return { straightBoxes, cornerBoxes, sectionMarkers };
  }, [straights, corners, distance]);

  return (
    <svg id="race-sections" x="0" y={yOffset} width="100%" height={sectionBarHeightPx}>
      {/* Background bar */}
      <svg id="section-bar-background" x="0" y="0" width="100%" height="100%">
        <rect x="0" y="0" height="100%" width="100%" fill="rgb(232,232,232)" />
        <rect x="0" y="45" height="5" width="100%" fill="rgb(139,139,139)" />
      </svg>

      <g id="section-bar-straight-boxes">{elements.straightBoxes}</g>
      <g id="section-bar-corner-boxes">{elements.cornerBoxes}</g>
      <g id="section-bar-section-markers">{elements.sectionMarkers}</g>
    </svg>
  );
});
