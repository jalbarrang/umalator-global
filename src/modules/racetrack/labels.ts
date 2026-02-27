import { getCourseById, getDistanceCategory, inoutKey } from './courses';
import { Surface } from '@/lib/sunday-tools/course/definitions';
import i18n from '@/i18n';

export const trackDescription = (props: { courseid: number }) => {
  const course = getCourseById(props.courseid);
  const distanceCategory = i18n.t(`racetrack.${getDistanceCategory(course.distance)}`);
  const inout = i18n.t(`racetrack.${inoutKey[course.course]}`);
  const orientation = i18n.t(`racetrack.orientation.${course.turn}`);
  const surface = course.surface == Surface.Turf ? 'Turf' : 'Dirt';

  if (inout === '') {
    return `${surface} ${course.distance}m (${distanceCategory}) ${orientation}`;
  }

  return `${surface} ${course.distance}m (${distanceCategory}) ${orientation} / ${inout}`;
};
