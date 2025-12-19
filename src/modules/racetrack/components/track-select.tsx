import { trackIds } from '@/i18n/lang/tracknames';

import i18n from '@/i18n';
import { useMemo } from 'react';
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

type TrackSelectProps = React.HTMLAttributes<HTMLDivElement>;

export function TrackSelect(props: TrackSelectProps) {
  const { className, ...rest } = props;

  const { courseId } = useSettingsStore();

  // Derive trackid from courseId instead of storing it as state
  const trackid = useMemo(
    () => getDefaultTrackIdForCourse(courseId),
    [courseId],
  );

  const handleChangeCourse = (value: string) => {
    setCourseId(+value);
  };

  const handleChangeTrack = (value: string) => {
    const newTrackId = +value;
    setCourseId(getCourseIdByTrackIdAndIndex(newTrackId, 0));
  };

  return (
    <div className={className} {...rest}>
      <Select value={trackid.toString()} onValueChange={handleChangeTrack}>
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
            <SelectItem value={cid.toString()} key={cid}>
              {trackDescription({ courseid: +cid })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
