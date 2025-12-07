import React, { useMemo } from 'react';

interface Slope {
  readonly start: number;
  readonly length: number;
  readonly slope: number;
}

interface SlopeVisualizationProps {
  slopes: readonly Slope[];
  distance: number;
}

/**
 * Renders the hill terrain visualization at the top of the race track.
 * Shows the elevation profile with green grass coloring.
 */
export const SlopeVisualization = React.memo<SlopeVisualizationProps>(
  ({ slopes, distance }) => {
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

      const range =
        highestPoint - (lowestPoint + highestPoint > -30 ? 0 : lowestPoint);

      // Fill in flat sections between slopes
      const full: Slope[] = slopes.slice();
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
      const terrainElements = full.reduce<React.ReactElement[]>(
        (elems, s, i) => {
          const lastEndHeight = slopeEndHeights[slopeEndHeights.length - 1];
          const thisEndHeight =
            lastEndHeight - (((s.slope / 10000) * s.length) / range) * 40;
          slopeEndHeights.push(thisEndHeight);

          if (s.slope === 0) {
            elems.push(
              <rect
                key={`terrain-${i}`}
                x={`${(s.start / distance) * 100}%`}
                y={`${lastEndHeight * 0.262}%`}
                width={`${(s.length / distance) * 100}%`}
                height="26.2%"
                fill="rgb(211,243,68)"
              />,
            );
          } else {
            elems.push(
              <svg
                key={`terrain-${i}`}
                className={`hillArea ${s.slope < 0 ? 'downhill' : 'uphill'}`}
                x={`${(s.start / distance) * 100}%`}
                y="0"
                width={`${(s.length / distance) * 100}%`}
                height="26.2%"
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
        },
        [],
      );

      return terrainElements;
    }, [slopes, distance]);

    return (
      <>
        {elements}
        {/* Grass divider line */}
        <rect
          x="0"
          y="26.2%"
          width="100%"
          height="1.8%"
          fill="rgb(140,170,10)"
        />
      </>
    );
  },
);
