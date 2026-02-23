import type { IWeather } from '@/lib/sunday-tools/course/definitions';
import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { cn } from '@/lib/utils';

export const WeatherIcon = (
  props: { weather: number } & React.HTMLAttributes<HTMLImageElement>,
) => {
  const { weather, className, ...rest } = props;
  const { racedef } = useSettingsStore();

  return (
    <img
      src={`/icons/utx_ico_weather_0${weather - 1}.png`}
      title={strings_en.skilldetails.weather[weather]}
      className={cn(
        'w-8 h-8 grayscale-100 hover:grayscale-0',
        {
          'grayscale-0': weather === racedef.weather,
        },
        className,
      )}
      data-weather={weather}
      {...rest}
    />
  );
};

export function WeatherSelect() {
  const { racedef } = useSettingsStore();

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();

    const target = e.target as HTMLDivElement;
    const weather = target.dataset.weather;

    if (!weather) {
      return;
    }
    setRaceParams({ ...racedef, weather: +weather as IWeather });
  };

  return (
    <div className="flex gap-2 items-center" onClick={handleClick}>
      <WeatherIcon weather={1} />
      <WeatherIcon weather={2} />
      <WeatherIcon weather={3} />
      <WeatherIcon weather={4} />
    </div>
  );
}
