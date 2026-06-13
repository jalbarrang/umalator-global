import type { IWeather } from 'sunday-tools/course/definitions';
import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';

export const WeatherIcon = (
  props: { weather: number } & React.HTMLAttributes<HTMLImageElement>
) => {
  const { weather, className, ...rest } = props;
  const { racedef } = useSettingsStore();

  return (
    <img
      src={getIconUrl(`utx_ico_weather_0${weather - 1}.png`)}
      alt={strings_en.skilldetails.weather[weather]}
      title={strings_en.skilldetails.weather[weather]}
      className={cn(
        'w-8 h-8 grayscale-100 hover:grayscale-0',
        {
          'grayscale-0': weather === racedef.weather
        },
        className
      )}
      data-weather={weather}
      {...rest}
    />
  );
};

export function WeatherSelect() {
  const { racedef } = useSettingsStore();

  const handleSelect = (weather: IWeather) => {
    setRaceParams({ ...racedef, weather });
  };

  return (
    <div className="flex gap-2 items-center" role="radiogroup" aria-label="Weather">
      {[1, 2, 3, 4].map((weather) => (
        <button
          key={weather}
          type="button"
          role="radio"
          aria-checked={weather === racedef.weather}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => handleSelect(weather as IWeather)}
        >
          <WeatherIcon weather={weather} />
        </button>
      ))}
    </div>
  );
}
