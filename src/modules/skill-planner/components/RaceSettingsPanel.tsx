import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { GroundSelect } from '@/components/race-settings/GroundSelect';
import { SeasonSelect } from '@/components/race-settings/SeasonSelect';
import { TimeOfDaySelect } from '@/components/race-settings/TimeOfDaySelect';
import { WeatherSelect } from '@/components/race-settings/WeatherSelect';
import { RacePresets } from '@/components/race-presets';
import { SavePresetModal } from '@/components/save-preset-modal';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { TrackSelect } from '@/modules/racetrack/components/track-select';
import { useSettingsStore } from '@/store/settings.store';
import { trackDescription } from '@/modules/racetrack/labels';
import { getDefaultTrackIdForCourse } from '@/modules/racetrack/courses';
import i18n from '@/i18n';
import strings_en from '@/i18n/lang/en/skills';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const groundConditions: Record<number, string> = {
  1: 'Firm',
  2: 'Good',
  3: 'Soft',
  4: 'Heavy',
};

type RaceSettingsPanelProps = {
  open?: boolean;
};

export const RaceSettingsPanel = React.memo(({ open }: RaceSettingsPanelProps) => {
  const { courseId, racedef } = useSettingsStore();

  const summary = useMemo(() => {
    const trackId = getDefaultTrackIdForCourse(courseId);
    const trackName = i18n.t(`tracknames.${trackId}`);
    const courseDesc = trackDescription({ courseid: courseId });
    const ground = groundConditions[racedef.ground] ?? '';
    const season = strings_en.skilldetails.season[racedef.season] ?? '';
    const weather = strings_en.skilldetails.weather[racedef.weather] ?? '';

    return `${trackName} · ${courseDesc} · ${ground} · ${season} · ${weather}`;
  }, [courseId, racedef.ground, racedef.season, racedef.weather]);

  const collapsibleProps = useMemo(() => {
    if (open !== undefined) {
      return { open };
    }

    return { defaultOpen: false };
  }, [open]);

  const isMobile = useIsMobile();

  return (
    <Collapsible {...collapsibleProps}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 bg-card px-4 py-2 text-sm hover:bg-accent/50 cursor-pointer">
        <Settings className="h-4 w-4 shrink-0" />
        <span>{summary}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card py-2 px-4 rounded-b-md border-t border-border">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <RacePresets className="flex flex-col md:flex-row md:items-center gap-2 w-full" />
            {!isMobile && <SavePresetModal />}
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
            <Label className="text-xs font-medium">Track</Label>
            <TrackSelect className="flex flex-col md:flex-row items-center gap-2 w-full" />
          </div>

          <div className="flex items-center gap-2">
            <TimeOfDaySelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex items-center gap-2">
            <SeasonSelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex items-center gap-2">
            <WeatherSelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Ground</Label>
            <GroundSelect />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
