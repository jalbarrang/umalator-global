import { describe, expect, it } from 'vitest';
import { extractCourses } from './extract-courses';

type SqlValue = number | string | Uint8Array | null;
type SqlRow = Record<string, SqlValue>;

interface TestStatement {
  bind: (params: Array<SqlValue>) => void;
  step: () => boolean;
  getAsObject: () => SqlRow;
  free: () => void;
}

interface TestDb {
  prepare: (sql: string) => TestStatement;
}

function createStatement(rows: Array<SqlRow>): TestStatement {
  let index = -1;

  return {
    bind: () => {
      // No-op for these query shapes.
    },
    step: () => {
      index += 1;
      return index < rows.length;
    },
    getAsObject: () => rows[index],
    free: () => {
      // No-op for in-memory test statement.
    },
  };
}

function createMockDb(options: {
  statusRows: Array<SqlRow>;
  courseRows: Array<SqlRow>;
}): TestDb {
  return {
    prepare: (sql: string) => {
      if (sql.includes('FROM race_course_set_status')) {
        return createStatement(options.statusRows);
      }
      if (sql.includes('FROM race_course_set')) {
        return createStatement(options.courseRows);
      }
      throw new Error(`Unexpected SQL in test DB: ${sql}`);
    },
  };
}

describe('extractCourses', () => {
  it('loads bundled courseeventparams and extracts known geometry for a course', async () => {
    const db = createMockDb({
      statusRows: [
        {
          course_set_status_id: 1,
          target_status_1: 1,
          target_status_2: 5,
        },
      ],
      courseRows: [
        {
          id: 10101,
          race_track_id: 101,
          distance: 1200,
          ground: 1,
          inout: 1,
          turn: 1,
          float_lane_max: 1200,
          course_set_status_id: 1,
          finish_time_min: 70,
          finish_time_max: 80,
        },
      ],
    });

    const courses = await extractCourses(db as never);
    const course = courses[10101];

    expect(course).toBeDefined();
    expect(course.distanceType).toBe(1);
    expect(course.courseSetStatus).toEqual([1, 5]);
    expect(course.corners.slice(0, 2)).toEqual([
      { start: 400, length: 275 },
      { start: 675, length: 275 },
    ]);
    expect(course.straights.slice(0, 2)).toEqual([
      { start: 0, end: 400, frontType: 2 },
      { start: 950, end: 1200, frontType: 1 },
    ]);
  });

  it('skips rows when no bundled courseeventparams file exists', async () => {
    const db = createMockDb({
      statusRows: [
        {
          course_set_status_id: 1,
          target_status_1: 1,
          target_status_2: 0,
        },
      ],
      courseRows: [
        {
          id: 99999,
          race_track_id: 999,
          distance: 1600,
          ground: 1,
          inout: 1,
          turn: 1,
          float_lane_max: 1200,
          course_set_status_id: 1,
          finish_time_min: 90,
          finish_time_max: 100,
        },
      ],
    });

    const courses = await extractCourses(db as never);
    expect(courses[99999]).toBeUndefined();
    expect(Object.keys(courses)).toHaveLength(0);
  });

  it('skips known incomplete Longchamp IDs even if params file exists', async () => {
    const db = createMockDb({
      statusRows: [
        {
          course_set_status_id: 1,
          target_status_1: 1,
          target_status_2: 0,
        },
      ],
      courseRows: [
        {
          id: 11201,
          race_track_id: 112,
          distance: 2000,
          ground: 1,
          inout: 1,
          turn: 1,
          float_lane_max: 1200,
          course_set_status_id: 1,
          finish_time_min: 120,
          finish_time_max: 130,
        },
        {
          id: 10101,
          race_track_id: 101,
          distance: 1200,
          ground: 1,
          inout: 1,
          turn: 1,
          float_lane_max: 1200,
          course_set_status_id: 1,
          finish_time_min: 70,
          finish_time_max: 80,
        },
      ],
    });

    const courses = await extractCourses(db as never);

    expect(courses[11201]).toBeUndefined();
    expect(courses[10101]).toBeDefined();
  });
});
