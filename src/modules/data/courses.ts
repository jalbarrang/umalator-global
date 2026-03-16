import coursesJson from './course_data.json';

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

export const courses = coursesJson as CoursesMap;

// =============
// Query Methods: Courses
// =============

export const getCourses = (): Array<CourseEntry> => Object.values(courses);
export const getCourseById = (id: string): CourseEntry | undefined => courses[id];
export const getCoursesByDistance = (distance: number): Array<CourseEntry> => {
  return Object.values(courses).filter((course) => course.distance === distance);
};
export const getCoursesByDistanceType = (distanceType: number): Array<CourseEntry> => {
  return Object.values(courses).filter((course) => course.distanceType === distanceType);
};
export const getCoursesBySurface = (surface: number): Array<CourseEntry> => {
  return Object.values(courses).filter((course) => course.surface === surface);
};
export const getCoursesByTurn = (turn: number): Array<CourseEntry> => {
  return Object.values(courses).filter((course) => course.turn === turn);
};
export const getCoursesByTrackId = (trackId: number): Array<CourseEntry> => {
  return Object.values(courses).filter((course) => course.raceTrackId === trackId);
};

// =============
// Query Methods: Tracks
// =============
