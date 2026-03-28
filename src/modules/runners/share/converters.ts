import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SingleExportData } from './types';

const APTITUDE_GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export function aptitudeToEncoding(grade: string): number {
  const index = APTITUDE_GRADES.indexOf(grade as (typeof APTITUDE_GRADES)[number]);
  if (index === -1) return 1;
  return 8 - index;
}

export function encodingToAptitude(value: number): string {
  const index = Math.max(0, Math.min(7, 8 - value));
  return APTITUDE_GRADES[index];
}

function formatUtcTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

export function runnerStateToSingleExport(
  runner: RunnerState,
  createdAt?: number,
): SingleExportData {
  const cardId = parseInt(runner.outfitId, 10);
  const aptDistance = aptitudeToEncoding(runner.distanceAptitude);
  const aptSurface = aptitudeToEncoding(runner.surfaceAptitude);
  const aptStrategy = aptitudeToEncoding(runner.strategyAptitude);
  const ts = createdAt ?? Date.now();

  return {
    card_id: isNaN(cardId) ? 0 : cardId,
    speed: runner.speed,
    stamina: runner.stamina,
    power: runner.power,
    guts: runner.guts,
    wiz: runner.wisdom,
    proper_distance_short: aptDistance,
    proper_distance_mile: aptDistance,
    proper_distance_middle: aptDistance,
    proper_distance_long: aptDistance,
    proper_ground_turf: aptSurface,
    proper_ground_dirt: aptSurface,
    proper_running_style_nige: aptStrategy,
    proper_running_style_senko: aptStrategy,
    proper_running_style_sashi: aptStrategy,
    proper_running_style_oikomi: aptStrategy,
    create_time: formatUtcTimestamp(ts),
    skill_array: runner.skills.map((id) => ({
      skill_id: parseInt(id, 10),
      skill_level: 1,
    })),
  };
}

export function singleExportToRunnerState(
  data: SingleExportData,
): Partial<RunnerState> {
  const distanceMax = Math.max(
    data.proper_distance_short,
    data.proper_distance_mile,
    data.proper_distance_middle,
    data.proper_distance_long,
  );
  const surfaceMax = Math.max(
    data.proper_ground_turf,
    data.proper_ground_dirt,
  );
  const strategyMax = Math.max(
    data.proper_running_style_nige,
    data.proper_running_style_senko,
    data.proper_running_style_sashi,
    data.proper_running_style_oikomi,
  );

  return {
    outfitId: String(data.card_id),
    speed: data.speed,
    stamina: data.stamina,
    power: data.power,
    guts: data.guts,
    wisdom: data.wiz,
    distanceAptitude: encodingToAptitude(distanceMax),
    surfaceAptitude: encodingToAptitude(surfaceMax),
    strategyAptitude: encodingToAptitude(strategyMax),
    skills: data.skill_array.map((s) => String(s.skill_id)),
  };
}
