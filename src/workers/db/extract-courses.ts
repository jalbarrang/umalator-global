import type {
  IDistanceType,
  IOrientation,
  ISurface,
  IThresholdStat,
} from '@/lib/sunday-tools/course/definitions';
import type { CoursesMap } from './storage';

type SqlRow = Record<string, SqlValue>;
type SqlValue = number | string | Uint8Array | null;

interface SqlStatement {
  bind: (params: Array<SqlValue>) => void;
  step: () => boolean;
  getAsObject: () => Record<string, SqlValue>;
  free: () => void;
}

interface SqlDatabase {
  prepare: (sql: string) => SqlStatement;
}

interface CourseEvent {
  _paramType: number;
  _distance: number;
  _values: Array<number>;
}

interface CourseEventParams {
  courseParams: Array<CourseEvent>;
}

const bundledCourseEventParams = import.meta.glob('/courseeventparams/*.json', {
  import: 'default',
}) as Record<string, () => Promise<CourseEventParams>>;
const bundledCourseEventParamsCache = new Map<number, CourseEventParams | null>();

function queryAll(db: SqlDatabase, sql: string, params: Array<SqlValue> = []): Array<SqlRow> {
  const statement = db.prepare(sql);
  try {
    if (params.length > 0) {
      statement.bind(params);
    }

    const rows: Array<SqlRow> = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as SqlRow);
    }
    return rows;
  } finally {
    statement.free();
  }
}

function numberFromSql(value: SqlValue, field: string, fallback = 0): number {
  if (value === null) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new Error(`Invalid numeric value for ${field}`);
}

function sortByNumericKey<T>(input: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => Number.parseFloat(a) - Number.parseFloat(b)),
  );
}

function distanceType(distance: number): number {
  if (distance <= 1400) return 1;
  if (distance <= 1800) return 2;
  if (distance < 2500) return 3;
  return 4;
}

async function getBundledCourseEventParams(courseId: number): Promise<CourseEventParams | null> {
  const cached = bundledCourseEventParamsCache.get(courseId);
  if (cached !== undefined) {
    return cached;
  }

  const key = `/courseeventparams/${courseId}.json`;
  const loadEventParams = bundledCourseEventParams[key];
  if (!loadEventParams) {
    bundledCourseEventParamsCache.set(courseId, null);
    return null;
  }

  const eventParams = await loadEventParams();
  const normalizedEventParams = eventParams?.courseParams ? eventParams : null;
  bundledCourseEventParamsCache.set(courseId, normalizedEventParams);
  return normalizedEventParams;
}

export async function extractCourses(db: SqlDatabase): Promise<CoursesMap> {
  const statusRows = queryAll(
    db,
    `SELECT course_set_status_id, target_status_1, target_status_2
     FROM race_course_set_status`,
  );

  const courseSetStatusById: Record<number, Array<number>> = {};
  for (const row of statusRows) {
    const statusId = numberFromSql(row.course_set_status_id, 'course_set_status_id');
    const targetStatus1 = numberFromSql(row.target_status_1, 'target_status_1');
    const targetStatus2 = numberFromSql(row.target_status_2, 'target_status_2');
    const statuses = [targetStatus1];

    if (targetStatus2 !== 0) {
      statuses.push(targetStatus2);
    }
    courseSetStatusById[statusId] = statuses;
  }

  const courseRows = queryAll(
    db,
    `SELECT id, race_track_id, distance, ground, inout, turn, float_lane_max, course_set_status_id,
            finish_time_min, finish_time_max
     FROM race_course_set`,
  );

  const courses: CoursesMap = {};

  for (const row of courseRows) {
    const courseId = numberFromSql(row.id, 'id');

    if (courseId === 11201 || courseId === 11202) {
      continue;
    }

    const eventParams = await getBundledCourseEventParams(courseId);
    if (!eventParams) {
      continue;
    }

    const corners: Array<{ start: number; length: number }> = [];
    const straights: Array<{ start: number; end: number; frontType: number }> = [];
    const slopes: Array<{ start: number; length: number; slope: number }> = [];

    let pendingStraight: { start: number; frontType: number } | null = null;
    let straightState = 0;

    for (const event of eventParams.courseParams) {
      if (event._paramType === 0) {
        corners.push({
          start: event._distance,
          length: event._values[1] ?? 0,
        });
      } else if (event._paramType === 2) {
        if (straightState === 0) {
          if ((event._values[0] ?? 0) !== 1) {
            throw new Error(
              `Confused about course event params: straight ended before it started? (course id ${courseId})`,
            );
          }
          pendingStraight = {
            start: event._distance,
            frontType: event._values[1] ?? 0,
          };
          straightState = 1;
        } else {
          if ((event._values[0] ?? 0) !== 2) {
            throw new Error(
              `Confused about course event params: new straight started before previous straight ended (course id ${courseId})`,
            );
          }
          if (pendingStraight) {
            straights.push({
              start: pendingStraight.start,
              end: event._distance,
              frontType: pendingStraight.frontType,
            });
          }
          pendingStraight = null;
          straightState = 0;
        }
      } else if (event._paramType === 11) {
        slopes.push({
          start: event._distance,
          length: event._values[1] ?? 0,
          slope: event._values[0] ?? 0,
        });
      }
    }

    corners.sort((a, b) => a.start - b.start);
    straights.sort((a, b) => a.start - b.start);
    slopes.sort((a, b) => a.start - b.start);

    const raceTrackId = numberFromSql(row.race_track_id, 'race_track_id');
    const distance = numberFromSql(row.distance, 'distance');
    const ground = numberFromSql(row.ground, 'ground');
    const inout = numberFromSql(row.inout, 'inout');
    const turn = numberFromSql(row.turn, 'turn');
    const laneMax = numberFromSql(row.float_lane_max, 'float_lane_max');
    const courseSetStatusId = numberFromSql(row.course_set_status_id, 'course_set_status_id');
    const finishTimeMin = numberFromSql(row.finish_time_min, 'finish_time_min');
    const finishTimeMax = numberFromSql(row.finish_time_max, 'finish_time_max');

    courses[courseId] = {
      raceTrackId,
      distance,
      distanceType: distanceType(distance) as IDistanceType,
      surface: ground as ISurface,
      turn: turn as IOrientation,
      course: inout,
      laneMax,
      finishTimeMin,
      finishTimeMax,
      courseSetStatus: (courseSetStatusById[courseSetStatusId] ?? []) as Array<IThresholdStat>,
      corners,
      straights,
      slopes,
    };
  }

  return sortByNumericKey(courses) as CoursesMap;
}
