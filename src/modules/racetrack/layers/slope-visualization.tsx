import { CourseData } from '@/lib/sunday-tools/course/definitions';
import React, { useMemo } from 'react';
import { RaceTrackDimensions, slopeValueToPercentage } from '../types';

interface Slope {
  readonly start: number;
  readonly length: number;
  readonly slope: number;
}

type SlopeVisualizationProps = {
  course: CourseData;
};

const vizHeight = RaceTrackDimensions.SlopeVisualizationHeight;
const renderWidth = RaceTrackDimensions.RenderWidth;
const groundY = vizHeight;
const baselineY = vizHeight - 5;

export const SlopeVisualization = React.memo<SlopeVisualizationProps>((props) => {
  const { course } = props;

  const slopes = course.slopes as ReadonlyArray<Slope>;
  const distance = course.distance;

  const elements = useMemo(() => {
    // Elevation range from slope sections only
    let elevation = 0;
    let highestPoint = 1;
    let lowestPoint = 0;

    for (let i = 0; i < slopes.length; i++) {
      const slopePercentage = slopeValueToPercentage(slopes[i].slope);
      elevation += slopePercentage * slopes[i].length;
      if (elevation > highestPoint) highestPoint = elevation;
      if (elevation < lowestPoint) lowestPoint = elevation;
    }

    const range = highestPoint - (lowestPoint + highestPoint > -30 ? 0 : lowestPoint);

    // Fill in flat sections between slopes
    const full: Array<Slope> = slopes.slice();
    let lastEnd = 0;

    for (let i = 0; i < slopes.length; i++) {
      const s = slopes[i];
      if (s.start !== lastEnd) {
        full.push({ start: lastEnd, length: s.start - lastEnd, slope: 0 });
      }
      lastEnd = s.start + s.length;
    }

    if (lastEnd < distance) {
      full.push({ start: lastEnd, length: distance - lastEnd, slope: 0 });
    }

    full.sort((a, b) => a.start - b.start);

    // Pass 1: cumulative heights + min/max
    const heights = new Float64Array(full.length + 1);
    let maxH = 0;
    let minH = 0;

    for (let i = 0; i < full.length; i++) {
      const slopePercentage = slopeValueToPercentage(full[i].slope);
      const slopeHeight = slopePercentage * full[i].length;
      heights[i + 1] = heights[i] - (slopeHeight / range) * 20;
      if (heights[i + 1] > maxH) maxH = heights[i + 1];
      if (heights[i + 1] < minH) minH = heights[i + 1];
    }

    const heightRange = maxH - minH;
    const scaleFactor = heightRange > 0 ? (baselineY * 0.6) / heightRange : 0;

    // Pass 2: build polygons with stable normalization
    const terrainElements: Array<React.ReactElement> = [];

    for (let i = 0; i < full.length; i++) {
      const s = full[i];
      const xStart = (s.start / distance) * renderWidth;
      const xEnd = ((s.start + s.length) / distance) * renderWidth;
      const yLeft = baselineY + (heights[i] - maxH) * scaleFactor;
      const yRight = baselineY + (heights[i + 1] - maxH) * scaleFactor;

      terrainElements.push(
        <polygon
          id={`terrain-${i}`}
          key={`terrain-${i}`}
          points={`${xStart},${yLeft} ${xStart},${groundY} ${xEnd},${groundY} ${xEnd},${yRight}`}
          fill="rgb(211,243,68)"
        />,
      );
    }

    return terrainElements;
  }, [slopes, distance]);

  return (
    <>
      <svg
        id="racetrack-slope-visualization"
        x={RaceTrackDimensions.xOffset}
        y={RaceTrackDimensions.SlopeVisualizationY - 5}
        width={RaceTrackDimensions.RenderWidth}
        height={RaceTrackDimensions.SlopeVisualizationHeight}
        viewBox={`0 0 ${renderWidth} ${vizHeight}`}
        preserveAspectRatio="none"
      >
        {elements}
      </svg>

      {/* Grass divider line */}
      <rect
        x={RaceTrackDimensions.xOffset}
        y={RaceTrackDimensions.SlopeLabelBarY - 5}
        width={RaceTrackDimensions.RenderWidth}
        height={5}
        fill="rgb(140,170,10)"
      />
    </>
  );
});
