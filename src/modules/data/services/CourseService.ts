import coursesJson from '@/modules/data/json/course_data.json';
import { distances, orientations, phases, surfaces } from 'sunday-tools/course/definitions';
import type {
  CourseData,
  IDistanceType,
  IOrientation,
  IPhase,
  ISurface
} from 'sunday-tools/course/definitions';

// =======
// Types
// =======
export type Corner = {
  start: number;
  length: number;
};

export type Straight = {
  start: number;
  end: number;
  frontType?: number;
};

export type Slope = {
  start: number;
  length: number;
  slope: number;
};

export type CourseEntry = {
  raceTrackId: number;
  distance: number;
  distanceType: number;
  surface: number;
  turn: number;
  course: number;
  laneMax: number;
  finishTimeMin: number;
  finishTimeMax: number;
  courseSetStatus: Array<number>;
  corners: Array<Corner>;
  straights: Array<Straight>;
  slopes: Array<Slope>;
};

export type CoursesMap = Record<string, CourseEntry>;

// =======
// Service
// =======

export class CourseService {
  private readonly courseCollection: CoursesMap;

  constructor(coursesData: CoursesMap) {
    this.courseCollection = coursesData;
  }

  // =============
  // Query Methods: Courses
  // =============

  getAll = (): Array<CourseEntry> => Object.values(this.courseCollection);

  getAllEntries = (): Array<[string, CourseEntry]> => Object.entries(this.courseCollection);

  getById = (id: string): CourseEntry | undefined => this.courseCollection[id];

  getByDistance = (distance: number): Array<CourseEntry> => {
    return Object.values(this.courseCollection).filter((course) => course.distance === distance);
  };

  getByDistanceType = (distanceType: number): Array<CourseEntry> => {
    return Object.values(this.courseCollection).filter(
      (course) => course.distanceType === distanceType
    );
  };

  getBySurface = (surface: number): Array<CourseEntry> => {
    return Object.values(this.courseCollection).filter((course) => course.surface === surface);
  };

  getByTurn = (turn: number): Array<CourseEntry> => {
    return Object.values(this.courseCollection).filter((course) => course.turn === turn);
  };

  getByTrackId = (trackId: number): Array<CourseEntry> => {
    return Object.values(this.courseCollection).filter((course) => course.raceTrackId === trackId);
  };

  /**
   * Picks a course on the same track and surface with enough corner data to infer a full oval:
   * prefers exactly 4 corners, otherwise the course with the most corners (still >= 4).
   */
  findReferenceCourse = (raceTrackId: number, surface: number): CourseEntry | null => {
    const candidates = Object.values(this.courseCollection).filter(
      (c) => c.raceTrackId === raceTrackId && c.surface === surface && c.corners.length >= 4
    );
    if (candidates.length === 0) return null;
    const withFour = candidates
      .filter((c) => c.corners.length === 4)
      .toSorted((a, b) => a.distance - b.distance);
    if (withFour.length > 0) return withFour[0];
    return candidates.reduce(
      (best, c) => (c.corners.length > best.corners.length ? c : best),
      candidates[0]!
    );
  };

  getSimCourse(courseId: number): CourseData {
    const course = this.getById(courseId.toString());
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    let slopes = course.slopes;
    if (!CourseService.isSortedByStart(slopes)) {
      slopes = slopes.toSorted((a: { start: number }, b: { start: number }) => a.start - b.start);
    }

    const courseWidth = 11.25;
    const horseLane = courseWidth / 18.0;
    const laneChangeAcceleration = 0.02 * 1.5;
    const laneChangeAccelerationPerFrame = laneChangeAcceleration / 15.0;
    const maxLaneDistance = (courseWidth * course.laneMax) / 10000.0;
    const moveLanePoint = course.corners.length > 0 ? course.corners[0].start : 30.0;

    const course2 = {
      courseId,
      ...course,
      slopes,
      courseWidth,
      horseLane,
      laneChangeAcceleration,
      laneChangeAccelerationPerFrame,
      maxLaneDistance,
      moveLanePoint
    };

    return course2 as CourseData;
  }

  static assertIsPhase(phase: number): asserts phase is IPhase {
    if (!phases.includes(phase as IPhase)) {
      throw new Error(`Phase ${phase} is not a valid Phase`);
    }
  }

  static assertIsSurface(surface: number): asserts surface is ISurface {
    if (!surfaces.includes(surface as ISurface)) {
      throw new Error(`Surface ${surface} is not a valid Surface`);
    }
  }

  static assertIsDistanceType(distanceType: number): asserts distanceType is IDistanceType {
    if (!distances.includes(distanceType as IDistanceType)) {
      throw new Error(`DistanceType ${distanceType} is not a valid DistanceType`);
    }
  }

  static assertIsOrientation(orientation: number): asserts orientation is IOrientation {
    if (!orientations.includes(orientation as IOrientation)) {
      throw new Error(`Orientation ${orientation} is not a valid Orientation`);
    }
  }

  static isSortedByStart(arr: ReadonlyArray<{ readonly start: number }>) {
    const init: [boolean, number] = [true, -1];

    function isSorted(a: [boolean, number], b: { start: number }): [boolean, number] {
      return [a[0] && b.start > a[1], b.start];
    }

    return arr.reduce(isSorted, init)[0];
  }

  static phaseStart(distance: number, phase: IPhase) {
    switch (phase) {
      case 0:
        return 0;
      case 1:
        return (distance * 1) / 6;
      case 2:
        return (distance * 2) / 3;
      case 3:
        return (distance * 5) / 6;
      default:
        throw new Error(`Invalid phase: ${phase}`);
    }
  }

  static phaseEnd(distance: number, phase: IPhase) {
    switch (phase) {
      case 0:
        return (distance * 1) / 6;
      case 1:
        return (distance * 2) / 3;
      case 2:
        return (distance * 5) / 6;
      case 3:
        return distance;
      default:
        throw new Error(`Invalid phase: ${phase}`);
    }
  }

  static courseSpeedModifier(
    course: CourseData,
    stats: Readonly<{
      speed: number;
      stamina: number;
      power: number;
      guts: number;
      wisdom: number;
    }>
  ) {
    const statvalues = [0, stats.speed, stats.stamina, stats.power, stats.guts, stats.wisdom].map(
      (x) => Math.min(x, 901)
    );

    return (
      1 +
      course.courseSetStatus
        .map((stat) => (1 + Math.floor(statvalues[stat] / 300.01)) * 0.05)
        .reduce((a, b) => a + b, 0) /
        Math.max(course.courseSetStatus.length, 1)
    );
  }
}

export const coursesService = new CourseService(coursesJson as CoursesMap);
