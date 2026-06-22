import { useMemo } from 'react';
import { coursesService } from '@/modules/data/services/CourseService';
import type { CourseEntry } from '@/modules/data/services/CourseService';

export type CourseByTrack = Record<number, Array<number>>;

function buildCoursesByTrack(): CourseByTrack {
  const byTrack: CourseByTrack = {};

  for (const [cid, course] of coursesService.getAllEntries()) {
    const tid = course.raceTrackId;
    if (tid in byTrack) {
      byTrack[tid].push(+cid);
    } else {
      byTrack[tid] = [+cid];
    }
  }

  return byTrack;
}

const getCoursesByTrack = () => {
  return buildCoursesByTrack();
};

export function useCoursesByTrack(): CourseByTrack {
  return useMemo(() => buildCoursesByTrack(), []);
}

export const getDefaultTrackIdForCourse = (courseId: number) => {
  return getCourseById(courseId).raceTrackId;
};

const getCourseByTrackId = (trackId: number) => {
  return getCoursesByTrack()[trackId] ?? [];
};

export const getCourseIdByTrackIdAndIndex = (trackId: number, index: number) => {
  return getCourseByTrackId(trackId)[index];
};

export const getCourseById = (courseId: number): CourseEntry => {
  const course = coursesService.getById(courseId.toString());

  if (!course) {
    throw new Error(`Course with id ${courseId} not found`);
  }

  return course;
};

export const inoutKey = ['', 'none', 'inner', 'outer', 'outin'] as const;

const distanceCategories = ['sprint', 'mile', 'medium', 'long'] as const;

const isSprint = (distance: number) => {
  return distance >= 1000 && distance < 1500;
};

const isMile = (distance: number) => {
  return distance >= 1500 && distance < 1900;
};

const isMedium = (distance: number) => {
  return distance >= 1900 && distance < 2500;
};

const isLong = (distance: number) => {
  return distance >= 2500;
};

export const getDistanceCategory = (distance: number) => {
  if (isSprint(distance)) return 'sprint';
  if (isMile(distance)) return 'mile';
  if (isMedium(distance)) return 'medium';
  return 'long';
};
