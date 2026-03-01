import React, { useMemo } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';

interface Slope {
  readonly start: number;
  readonly length: number;
  readonly slope: number;
}

export const baseSlopeYPx = 12;
export const baseSlopeHeightPx = 30;
export const baseSlopeHeightFloat = 0.3;
export const baseSlopeHeightPercentage = '30%';

export const SlopeVisualization = React.memo(() => {
  const { course } = useRaceTrack();

  const slopes = course.slopes as ReadonlyArray<Slope>;
  const distance = course.distance;

  const elements = useMemo(() => {
    // Calculate the elevation range
    const [, highestPoint, lowestPoint] = slopes.reduce(
      (acc, s) => {
        const [last, highest, lowest] = acc;
        const current = last + (s.slope / 10000) * s.length;

        if (current > highest) {
          return [current, current, lowest];
        } else if (current < lowest) {
          return [current, highest, current];
        } else {
          return [current, highest, lowest];
        }
      },
      [0, 1, 0],
    );

    const range = highestPoint - (lowestPoint + highestPoint > -30 ? 0 : lowestPoint);

    // Fill in flat sections between slopes
    const full: Array<Slope> = slopes.slice();

    let lastEnd = 0;

    slopes.forEach((s) => {
      if (s.start !== lastEnd) {
        full.push({ start: lastEnd, length: s.start - lastEnd, slope: 0 });
      }
      lastEnd = s.start + s.length;
    });

    if (lastEnd < distance) {
      full.push({
        start: lastEnd,
        length: distance - lastEnd,
        slope: 0,
      });
    }

    full.sort((a, b) => a.start - b.start);

    // Calculate terrain elements
    const slopeEndHeights = [50];

    const terrainElements = full.reduce<Array<React.ReactElement>>((elems, s, i) => {
      const lastEndHeight = slopeEndHeights[slopeEndHeights.length - 1];

      const thisEndHeight = lastEndHeight - (((s.slope / 10000) * s.length) / range) * 40;

      slopeEndHeights.push(thisEndHeight);

      if (s.slope === 0) {
        elems.push(
          <rect
            id={`terrain-flat-${i}`}
            key={`terrain-${i}`}
            x={`${(s.start / distance) * 100}%`}
            y={`${lastEndHeight * baseSlopeHeightFloat}%`}
            width={`${(s.length / distance) * 100}%`}
            height={baseSlopeHeightPercentage}
            fill="rgb(211,243,68)"
          />,
        );
      } else {
        elems.push(
          <svg
            id={`terrain-hill-${i}`}
            key={`terrain-${i}`}
            className={`hillArea ${s.slope < 0 ? 'downhill' : 'uphill'}`}
            x={`${(s.start / distance) * 100}%`}
            y="0"
            width={`${(s.length / distance) * 100}%`}
            height={baseSlopeHeightPercentage}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points={`0,${lastEndHeight} 0,100 100,100 100,${thisEndHeight}`}
              fill="rgb(211,243,68)"
            />
          </svg>,
        );
      }
      return elems;
    }, []);

    return terrainElements;
  }, [slopes, distance]);

  return (
    <g id="racetrack-slope-visualization">
      {elements}

      {/* Grass divider line */}
      <rect x="0" y="28%" width="100%" height="2%" fill="rgb(140,170,10)" />
    </g>
  );
});
