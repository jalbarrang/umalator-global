import { describe, expect, it } from 'vitest';
import { analyticalPacerPosition } from './analytical-pacer';

describe('analyticalPacerPosition', () => {
  it('is monotonically increasing over time', () => {
    const courseDistance = 2000;
    const baseSpeed = 20;

    let previous = analyticalPacerPosition(courseDistance, baseSpeed, 0);
    for (let t = 0.5; t <= 120; t += 0.5) {
      const current = analyticalPacerPosition(courseDistance, baseSpeed, t);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('starts at approximately zero position at time zero', () => {
    expect(analyticalPacerPosition(2000, 20, 0)).toBeCloseTo(0, 8);
  });

  it('eventually exceeds course distance for large elapsed time', () => {
    const position = analyticalPacerPosition(2000, 20, 200);
    expect(position).toBeGreaterThan(2000);
  });

  it('reaches phase-1 transition in a reasonable time window', () => {
    const courseDistance = 2000;
    const transitionDistance = courseDistance / 6;
    const baseSpeed = 20;

    let transitionTime: number | null = null;
    for (let t = 0; t <= 60; t += 0.1) {
      const position = analyticalPacerPosition(courseDistance, baseSpeed, t);
      if (position >= transitionDistance) {
        transitionTime = t;
        break;
      }
    }

    expect(transitionTime).not.toBeNull();
    expect(transitionTime!).toBeGreaterThan(10);
    expect(transitionTime!).toBeLessThan(30);
  });
});
