import type { ISeason } from '@/lib/sunday-tools/course/definitions';
import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { cn } from '@/lib/utils';

export const SeasonIcon = (props: { season: number } & React.HTMLAttributes<HTMLImageElement>) => {
  const { season, className, ...rest } = props;
  const { racedef } = useSettingsStore();

  return (
    <img
      src={`/icons/global/utx_txt_season_0${season - 1}.png`}
      title={strings_en.skilldetails.season[season]}
      className={cn(
        'w-8 h-8 grayscale-100 hover:grayscale-0',
        {
          'grayscale-0': season === racedef.season,
        },
        className,
      )}
      data-season={season}
      {...rest}
    />
  );
};

export function SeasonSelect() {
  const { racedef } = useSettingsStore();

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();

    const target = e.target as HTMLDivElement;
    const season = target.dataset.season;

    if (!season) return;
    setRaceParams({ ...racedef, season: +season as ISeason });
  };

  return (
    <div className="flex gap-2 items-center" onClick={handleClick}>
      <SeasonIcon season={1} />
      <SeasonIcon season={2} />
      <SeasonIcon season={3} />
      <SeasonIcon season={4} />
    </div>
  );
}
