import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { cn } from '@/lib/utils';

const SeasonIcon = ({ season }: { season: number }) => {
  const { racedef } = useSettingsStore();

  return (
    <img
      src={`/icons/global/utx_txt_season_0${season}.png`}
      title={strings_en.skilldetails.season[season]}
      className={cn('w-8 h-8 cursor-pointer grayscale-100 hover:grayscale-0', {
        'grayscale-0': season === racedef.season,
      })}
      data-season={season}
    />
  );
};

export function SeasonSelect() {
  const { racedef } = useSettingsStore();

  const handleClick = (e) => {
    e.stopPropagation();

    if (!('season' in e.target.dataset)) return;
    setRaceParams({ ...racedef, season: +e.target.dataset.season });
  };

  return (
    <div className="flex gap-1 items-center" onClick={handleClick}>
      <SeasonIcon season={0} />
      <SeasonIcon season={1} />
      <SeasonIcon season={2} />
      <SeasonIcon season={3} />
    </div>
  );
}
