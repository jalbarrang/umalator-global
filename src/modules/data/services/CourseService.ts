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
    return Object.values(this.courseCollection).filter((course) => course.distanceType === distanceType);
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
      (c) => c.raceTrackId === raceTrackId && c.surface === surface && c.corners.length >= 4,
    );
    if (candidates.length === 0) return null;
    const withFour = candidates
      .filter((c) => c.corners.length === 4)
      .toSorted((a, b) => a.distance - b.distance);
    if (withFour.length > 0) return withFour[0];
    return candidates.reduce(
      (best, c) => (c.corners.length > best.corners.length ? c : best),
      candidates[0]!,
    );
  };
}