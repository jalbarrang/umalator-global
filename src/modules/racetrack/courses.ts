import { useMemo } from 'react';
import type { Courses } from '@/lib/sunday-tools/course/definitions';
import { useCourses, useMasterDbStore } from '@/modules/data/master-db.store';

export type CourseByTrack = Record<number, Array<number>>;

const getCoursesMap = () => useMasterDbStore.getState().courses as Courses;

function buildCoursesByTrack(courses: Courses): CourseByTrack {
  const byTrack: CourseByTrack = {};

  for (const [cid, course] of Object.entries(courses)) {
    const tid = course.raceTrackId;
    if (tid in byTrack) {
      byTrack[tid].push(+cid);
    } else {
      byTrack[tid] = [+cid];
    }
  }

  return byTrack;
}

export const getCoursesByTrack = () => {
  return buildCoursesByTrack(getCoursesMap());
};

export function useCoursesByTrack(): CourseByTrack {
  const courses = useCourses() as Courses;
  return useMemo(() => buildCoursesByTrack(courses), [courses]);
}

export const getDefaultTrackIdForCourse = (courseId: number) => {
  return getCourseById(courseId).raceTrackId;
};

export const getCourseByTrackId = (trackId: number) => {
  return getCoursesByTrack()[trackId] ?? [];
};

export const getCourseIdByTrackIdAndIndex = (trackId: number, index: number) => {
  return getCourseByTrackId(trackId)[index];
};

export const getCourseById = (courseId: number): Courses[number] => {
  const course = getCoursesMap()[courseId];
  if (!course) {
    throw new Error(`Course with id ${courseId} not found`);
  }
  return course;
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
