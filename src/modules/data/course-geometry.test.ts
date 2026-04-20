import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCourseGeometry } from './course-geometry';
import { getDataRuntime, initializeDataRuntime } from './runtime';

const initialRuntime = getDataRuntime();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  initializeDataRuntime(initialRuntime);
});

describe('getCourseGeometry', () => {
  it('fetches geometry from the active snapshot path and memoizes per path', async () => {
    initializeDataRuntime({
      snapshot: 'jp',
      catalog: {
        ...initialRuntime.catalog,
        courseGeometryPath: '/data/jp/course_geometry.json',
      },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      expect(input.toString()).toBe('/data/jp/course_geometry.json');

      return new Response(
        JSON.stringify({
          '101': {
            courseId: 101,
            assetName: 'course_101',
            raceTrackId: 10001,
            distance: 1200,
            surface: 1,
            course: 1,
            trackVariant: 0,
            variant: 0,
            durationSeconds: 60,
            sampleCount: 2,
            valueX: [0, 1],
            valueY: [0, 0],
            valueZ: [0, 1],
            rotation: [{ x: 0, y: 0, z: 0, w: 1 }],
          },
        }),
        { status: 200 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    expect(await getCourseGeometry(101)).toMatchObject({ courseId: 101, assetName: 'course_101' });
    expect(await getCourseGeometry(101)).toMatchObject({ courseId: 101, assetName: 'course_101' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
