import { trackIds } from '@/i18n/lang/tracknames';

import i18n from '@/i18n';
import { useState } from 'react';
import {
  getCourseByTrackId,
  getCourseIdByTrackIdAndIndex,
  getDefaultTrackIdForCourse,
} from '../courses';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setCourseId, useSettingsStore } from '@/store/settings.store';
import { trackDescription } from '../labels';

const getTrackName = (trackId: number) => {
  return i18n.t(`tracknames.${trackId}`);
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
          <SelectValue>{trackDescription({ courseid: courseId })}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {getCourseByTrackId(trackid).map((cid) => (
            <SelectItem value={cid} key={cid}>
              {trackDescription({ courseid: +cid })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
