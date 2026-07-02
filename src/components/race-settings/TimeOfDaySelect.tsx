import type { ITimeOfDay } from '@/lib/uma-domain/course/definitions';
import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';

const TimeOfDayIcon = ({ time, icon: iconIndex }: { time: number; icon: number }) => {
  const { racedef } = useSettingsStore();

  return (
    <img
      src={getIconUrl(`utx_ico_timezone_0${iconIndex}.png`)}
      alt={strings_en.skilldetails.time[time]}
      title={strings_en.skilldetails.time[time]}
      className={cn('w-8 h-8 cursor-pointer grayscale-100 hover:grayscale-0', {
        'grayscale-0': time === racedef.time
      })}
      data-timeofday={time}
    />
  );
};

export const TimeOfDaySelect = () => {
  const { racedef } = useSettingsStore();

  const handleSelect = (time: ITimeOfDay) => {
    setRaceParams({ ...racedef, time });
  };

  // + 2 because for some reason the icons are 00-02 (noon/evening/night) but the enum values are 1-4 (morning(?) noon evening night)
  return (
    <div className="flex gap-2 items-center" role="radiogroup" aria-label="Time of day">
      {[
        { time: 2, icon: 0 },
        { time: 3, icon: 1 },
        { time: 4, icon: 2 }
      ].map(({ time, icon }) => (
        <button
          key={time}
          type="button"
          role="radio"
          aria-checked={time === racedef.time}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => handleSelect(time as ITimeOfDay)}
        >
          <TimeOfDayIcon time={time} icon={icon} />
        </button>
      ))}
    </div>
  );
};
