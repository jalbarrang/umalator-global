import type { Courses } from '@/modules/simulation/lib/course/definitions';
import courses from '@/modules/data/course_data.json';

export type CourseByTrack = Record<number, Array<number>>;

export const getCoursesByTrack = () => {
  const newObject: CourseByTrack = {};

  for (const cid in courses as Courses) {
    const tid = (courses as Courses)[cid].raceTrackId;

    if (tid in newObject) {
      newObject[tid].push(+cid);
    } else {
      newObject[tid] = [+cid];
    }
  }

  return newObject;
};

export const coursesByTrack = getCoursesByTrack();

export const getDefaultTrackIdForCourse = (courseId: number) => {
  return (courses as Courses)[courseId].raceTrackId;
};

export const getCourseByTrackId = (trackId: number) => {
  return coursesByTrack[trackId];
};

export const getCourseIdByTrackIdAndIndex = (trackId: number, index: number) => {
  return coursesByTrack[trackId][index];
};

export const getCourseById = (courseId: number): Courses[number] => {
  return (courses as Courses)[courseId];
};

export const inoutKey = ['', 'none', 'inner', 'outer', 'outin'] as const;

export const distanceCategories = ['sprint', 'mile', 'medium', 'long'] as const;

export const isSprint = (distance: number) => {
  return distance >= 1000 && distance < 1500;
};

export const isMile = (distance: number) => {
  return distance >= 1500 && distance < 1900;
};

export const isMedium = (distance: number) => {
  return distance >= 1900 && distance < 2500;
};

export const isLong = (distance: number) => {
  return distance >= 2500;
};

export const getDistanceCategory = (distance: number) => {
  if (isSprint(distance)) return 'sprint';
  if (isMile(distance)) return 'mile';
  if (isMedium(distance)) return 'medium';
  return 'long';
};
