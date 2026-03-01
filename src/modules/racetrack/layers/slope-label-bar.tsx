import React, { Fragment, useMemo } from 'react';
import { SectionText } from '../primitives/section-text';
import { DistanceMarker } from '../primitives/distance-marker';
import { useRaceTrack } from '../context/RaceTrackContext';

interface Slope {
  readonly start: number;
  readonly length: number;
  readonly slope: number;
}

const UPHILL_COLORS = {
  main: ['rgb(234,207,147)', 'rgb(229,196,120)'],
  accent: ['rgb(191,143,37)', 'rgb(175,132,33)'],
};

const DOWNHILL_COLORS = {
  main: ['rgb(82,195,184)', 'rgb(116,206,198)'],
  accent: ['rgb(42,123,115)', 'rgb(50,142,134)'],
};

type SlopeLabelBarProps = {
  readonly yOffset: number;
};

const slopeBarHeightPx = 50;

export const SlopeLabelBar = React.memo<SlopeLabelBarProps>(({ yOffset }) => {
  const { course } = useRaceTrack();
  const slopes = course.slopes as ReadonlyArray<Slope>;
  const distance = course.distance;
  const elements = useMemo(() => {
    let uphillIndex = 0;
    let downhillIndex = 0;

    // Slope section boxes
    const slopeBoxes = slopes.map((s, i) => {
      const isUphill = s.slope > 0;
      const colorIndex = isUphill ? uphillIndex++ : downhillIndex++;
      const colors = isUphill ? UPHILL_COLORS : DOWNHILL_COLORS;

      const x = (s.start / distance) * 100;
      const width = (s.length / distance) * 100;

      return (
        <svg
          id={`slope-box-${i}`}
          key={`slope-${i}`}
          className="slope"
          x={`${x}%`}
          y="0"
          width={`${width}%`}
          height="100%"
        >
          <rect x="0" y="0" height="100%" width="100%" fill={colors.main[colorIndex % 2]} />
          <rect x="0" y="45" height="5" width="100%" fill={colors.accent[colorIndex % 2]} />

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
    <svg id="racetrack-slope-label-bar" x="0" y={yOffset} width="100%" height={slopeBarHeightPx}>
      {/* Background bar */}
      <svg id="slope-label-bar-background" x="0" y="0" width="100%" height="100%">
        <rect x="0" y="0" height="100%" width="100%" fill="rgb(239,229,241)" />
        <rect x="0" y="45" height="5" width="100%" fill="rgb(163,106,175)" />
      </svg>

      <g id="slope-label-bar-boxes">{elements.slopeBoxes}</g>
      <g id="slope-label-bar-markers">{elements.slopeMarkers}</g>
    </svg>
  );
});
