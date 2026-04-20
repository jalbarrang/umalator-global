import { createRuntimeCatalogProxy, getDataRuntime } from './runtime';

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
// Data
// =======

const getCourseCollection = (): CoursesMap => getDataRuntime().catalog.courses;

export const courseCollection = createRuntimeCatalogProxy(getCourseCollection) as CoursesMap;

// =============
// Query Methods: Courses
// =============

export const getCourses = (): Array<CourseEntry> => Object.values(courseCollection);
export const getCourseById = (id: string): CourseEntry | undefined => courseCollection[id];
export const getCoursesByDistance = (distance: number): Array<CourseEntry> => {
  return Object.values(courseCollection).filter((course) => course.distance === distance);
};
export const getCoursesByDistanceType = (distanceType: number): Array<CourseEntry> => {
  return Object.values(courseCollection).filter((course) => course.distanceType === distanceType);
};
export const getCoursesBySurface = (surface: number): Array<CourseEntry> => {
  return Object.values(courseCollection).filter((course) => course.surface === surface);
};
export const getCoursesByTurn = (turn: number): Array<CourseEntry> => {
  return Object.values(courseCollection).filter((course) => course.turn === turn);
};
export const getCoursesByTrackId = (trackId: number): Array<CourseEntry> => {
  return Object.values(courseCollection).filter((course) => course.raceTrackId === trackId);
};

/**
 * Picks a course on the same track and surface with enough corner data to infer a full oval:
 * prefers exactly 4 corners, otherwise the course with the most corners (still >= 4).
 */
export function findReferenceCourse(raceTrackId: number, surface: number): CourseEntry | null {
  const candidates = Object.values(courseCollection).filter(
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
}

// =============
// Query Methods: Tracks
// =============
