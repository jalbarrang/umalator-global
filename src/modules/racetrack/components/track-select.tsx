import { trackIds } from '@/i18n/lang/tracknames';
import { Surface } from '@simulation/lib/CourseData';

import { useState } from 'react';
import {
  getCourseById,
  getCourseByTrackId,
  getCourseIdByTrackIdAndIndex,
  getDefaultTrackIdForCourse,
  inoutKey,
} from '../courses';
import i18n from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setCourseId, useSettingsStore } from '@/store/settings.store';

const getTrackName = (trackId: number) => {
  return i18n.t(`tracknames.${trackId}`);
};

const getCourseName = (courseId: number) => {
  const course = getCourseById(courseId);

  return i18n.t('coursedesc', {
    distance: course.distance,
    inout: i18n.t(`racetrack.${inoutKey[course.course]}`),
    surface: i18n.t(
      course.surface == Surface.Turf ? 'racetrack.turf' : 'racetrack.dirt',
    ),
  });
};

export function TrackSelect() {
  const { courseId } = useSettingsStore();

  const [trackid, setTrackid] = useState(getDefaultTrackIdForCourse(courseId));

  const handleChangeCourse = (value: string) => {
    setCourseId(+value);
  };

  const handleChangeTrack = (value: string) => {
    const newTrackId = +value;

    setTrackid(newTrackId);
    setCourseId(getCourseIdByTrackIdAndIndex(newTrackId, 0));
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={trackid} onValueChange={handleChangeTrack}>
        <SelectTrigger className="w-full">
          <SelectValue>{getTrackName(trackid)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {trackIds.map((trackId, i) => (
            <SelectItem key={`track-${i}`} value={trackId}>
              {getTrackName(+trackId)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={courseId.toString()} onValueChange={handleChangeCourse}>
        <SelectTrigger className="w-full">
          <SelectValue>{getCourseName(courseId)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {getCourseByTrackId(trackid).map((cid) => (
            <SelectItem value={cid} key={cid}>
              {getCourseName(+cid)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
