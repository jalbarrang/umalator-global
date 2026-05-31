import type { ISeason } from 'sunday-tools/course/definitions';
import strings_en from '@/i18n/lang/en/skills';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';

export const SeasonIcon = (props: { season: number } & React.HTMLAttributes<HTMLImageElement>) => {
  const { season, className, ...rest } = props;
  const { racedef } = useSettingsStore();

  return (
    <img
      src={getIconUrl(`global/utx_txt_season_0${season - 1}.png`)}
      alt={strings_en.skilldetails.season[season]}
      title={strings_en.skilldetails.season[season]}
      className={cn(
        'w-8 h-8 grayscale-100 hover:grayscale-0',
        {
          'grayscale-0': season === racedef.season
        },
        className
      )}
      data-season={season}
      {...rest}
    />
  );
};

export function SeasonSelect() {
  const { racedef } = useSettingsStore();

  const handleSelect = (season: ISeason) => {
    setRaceParams({ ...racedef, season });
  };

  return (
    <div className="flex gap-2 items-center" role="radiogroup" aria-label="Season">
      {[1, 2, 3, 4].map((season) => (
        <button
          key={season}
          type="button"
          role="radio"
          aria-checked={season === racedef.season}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => handleSelect(season as ISeason)}
        >
          <SeasonIcon season={season} />
        </button>
      ))}
    </div>
  );
}
