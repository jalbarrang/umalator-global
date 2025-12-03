import courses from '@data/course_data.json';

export const getCoursesByTrack = () => {
  const newObject = {};

  for (const cid in courses) {
    const tid = courses[cid].raceTrackId;

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
  return courses[courseId].raceTrackId;
};

export const getCourseByTrackId = (trackId: number) => {
  return coursesByTrack[trackId];
};

export const getCourseIdByTrackIdAndIndex = (
  trackId: number,
  index: number,
) => {
  return coursesByTrack[trackId][index];
};

export const getCourseById = (courseId: number) => {
  return courses[courseId];
};

export const inoutKey = ['', 'none', 'inner', 'outer', 'outin'] as const;
