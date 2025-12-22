import React, { Fragment, useMemo } from 'react';
import { SectionText } from './section-text';
import { DistanceMarker } from './distance-marker';

interface Slope {
  readonly start: number;
  readonly length: number;
  readonly slope: number;
}

interface SlopeLabelBarProps {
  slopes: ReadonlyArray<Slope>;
  distance: number;
}

// Colors for uphill sections (alternating)
const UPHILL_COLORS = {
  main: ['rgb(234,207,147)', 'rgb(229,196,120)'],
  accent: ['rgb(191,143,37)', 'rgb(175,132,33)'],
};

// Colors for downhill sections (alternating)
const DOWNHILL_COLORS = {
  main: ['rgb(82,195,184)', 'rgb(116,206,198)'],
  accent: ['rgb(42,123,115)', 'rgb(50,142,134)'],
};

/**
 * Renders the uphill/downhill label bar showing slope sections.
 */
export const SlopeLabelBar = React.memo<SlopeLabelBarProps>(({ slopes, distance }) => {
  const elements = useMemo(() => {
    let uphillIndex = 0;
    let downhillIndex = 0;

    // Slope section boxes
    const slopeBoxes = slopes.map((s, i) => {
      const isUphill = s.slope > 0;
      const colorIndex = isUphill ? uphillIndex++ : downhillIndex++;
      const colors = isUphill ? UPHILL_COLORS : DOWNHILL_COLORS;

      return (
        <svg
          key={`slope-${i}`}
          className="slope"
          x={`${(s.start / distance) * 100}%`}
          y="28%"
          width={`${(s.length / distance) * 100}%`}
          height="18%"
        >
          <rect x="0" y="0" height="90%" width="100%" fill={colors.main[colorIndex % 2]} />
          <rect x="0" y="90%" height="10%" width="100%" fill={colors.accent[colorIndex % 2]} />
          <SectionText id={isUphill ? 'uphill' : 'downhill'} w={s.length / distance} />
        </svg>
      );
    });

    // Distance markers for slopes
    const slopeMarkers = slopes.map((s, i) => {
      const nodes: Array<React.ReactElement> = [];
      let markedStart = false;

      // Show start marker if there's a gap from previous slope
      if (s.start !== 0 && (i === 0 || s.start !== slopes[i - 1].start + slopes[i - 1].length)) {
        markedStart = true;
        nodes.push(
          <DistanceMarker
            key={`slope-marker-${i}-start`}
            d={s.start}
            x={(s.start / distance) * 100}
            y={42}
            up={i > 0 && s.start - (slopes[i - 1].start + slopes[i - 1].length) < distance * 0.05}
          />,
        );
      }

      // Show end marker unless it's at the end of the course
      if (s.start + s.length !== distance) {
        nodes.push(
          <DistanceMarker
            key={`slope-marker-${i}-end`}
            d={s.start + s.length}
            x={((s.start + s.length) / distance) * 100}
            y={42}
            up={markedStart && s.length < distance * 0.05}
          />,
        );
      }

      return <Fragment key={`slope-markers-${i}`}>{nodes}</Fragment>;
    });

    return { slopeBoxes, slopeMarkers };
  }, [slopes, distance]);

  return (
    <>
      {/* Background bar */}
      <svg className="sectionsBg" x="0" y="28%" width="100%" height="18%">
        <rect x="0" y="0" height="90%" width="100%" fill="rgb(239,229,241)" />
        <rect x="0" y="90%" height="10%" width="100%" fill="rgb(163,106,175)" />
      </svg>
      {elements.slopeBoxes}
      {elements.slopeMarkers}
    </>
  );
});
