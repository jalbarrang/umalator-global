import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { cn } from '@/lib/utils';

const WeatherIcon = ({ weather }: { weather: number }) => {
  const { racedef } = useSettingsStore();

  return (
    <img
      src={`/icons/utx_ico_weather_0${weather}.png`}
      title={strings_en.skilldetails.weather[weather]}
      className={cn('w-8 h-8 cursor-pointer grayscale-100 hover:grayscale-0', {
        'grayscale-0': weather === racedef.weather,
      })}
      data-weather={weather}
    />
  );
};

export function WeatherSelect() {
  const { racedef } = useSettingsStore();

  const handleClick = (e) => {
    e.stopPropagation();

    if (!('weather' in e.target.dataset)) return;
    setRaceParams({ ...racedef, weather: +e.target.dataset.weather });
  };

  return (
    <div className="weatherSelect" onClick={handleClick}>
      <WeatherIcon weather={0} />
      <WeatherIcon weather={1} />
      <WeatherIcon weather={2} />
      <WeatherIcon weather={3} />
    </div>
  );
}
