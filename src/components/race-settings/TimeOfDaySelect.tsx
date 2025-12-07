import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { cn } from '@/lib/utils';

const TimeOfDayIcon = ({
  time,
  icon: iconIndex,
}: {
  time: number;
  icon: number;
}) => {
  const { racedef } = useSettingsStore();

  return (
    <img
      src={`/icons/utx_ico_timezone_0${iconIndex}.png`}
      title={strings_en.skilldetails.time[time]}
      className={cn('w-8 h-8 cursor-pointer grayscale-100 hover:grayscale-0', {
        'grayscale-0': time === racedef.time,
      })}
      data-timeofday={time}
    />
  );
};

export const TimeOfDaySelect = () => {
  const { racedef } = useSettingsStore();

  const handleClick = (e) => {
    e.stopPropagation();

    if (!('timeofday' in e.target.dataset)) {
      return;
    }

    setRaceParams({ ...racedef, time: +e.target.dataset.timeofday });
  };

  // + 2 because for some reason the icons are 00-02 (noon/evening/night) but the enum values are 1-4 (morning(?) noon evening night)
  return (
    <div className="flex gap-2 items-center" onClick={handleClick}>
      <TimeOfDayIcon time={2} icon={0} />
      <TimeOfDayIcon time={3} icon={1} />
      <TimeOfDayIcon time={4} icon={2} />
    </div>
  );
};
