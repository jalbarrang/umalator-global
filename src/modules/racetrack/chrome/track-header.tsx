import i18n from '@/i18n';
import { WeatherIcon } from '@/components/race-settings/WeatherSelect';
import { SeasonIcon } from '@/components/race-settings/SeasonSelect';
import { useRaceTrack } from '../context/RaceTrackContext';
import { useMemo } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Surface } from '@/lib/sunday-tools/course/definitions';
import { getCourseById, inoutKey } from '../courses';

const getRaceTrackUrl = (courseid: number) => {
  const course = getCourseById(courseid);
  const baseUrl = 'https://gametora.com/umamusume/racetracks';
  const trackName = i18n.t(`tracknames.${course.raceTrackId}`).toLowerCase();
  const distance = course.distance;
  const surface = course.surface == Surface.Turf ? 'turf' : 'dirt';
  const inout = i18n.t(`racetrack.${inoutKey[course.course]}short`);

  if (inout === '') {
    return `${baseUrl}/${trackName}#${distance}-${surface}`;
  }

  return `${baseUrl}/${trackName}#${distance}-${surface}-${inout}`;
};

export const TrackHeader = () => {
  const { course, courseid, courseLabel, racedef } = useRaceTrack();

  const raceTrackUrl = useMemo(() => {
    return getRaceTrackUrl(courseid);
  }, [courseid]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="text-xl text-foreground font-bold">
          {i18n.t(`tracknames.${course.raceTrackId}`)} {courseLabel}
        </div>

        <a href={raceTrackUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      </div>

      <div className="flex">
        <div className="flex items-center gap-2">
          <SeasonIcon season={racedef.season} className="w-6 h-6" />
          <WeatherIcon weather={racedef.weather} className="w-6 h-6" />
          <div className="font-bold">{i18n.t(`racetrack.ground.${racedef.ground}`)}</div>
        </div>
      </div>
    </div>
  );
};
