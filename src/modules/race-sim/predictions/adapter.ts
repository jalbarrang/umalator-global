import { Strategy, StrategyName } from 'sunday-tools/runner/definitions';
import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import { aptitudeToEncoding } from '@/modules/runners/share/converters';
import { estimateRunnerRankScore } from '@/modules/race-sim/eval/rank-score';

const STRATEGY_NAME_TO_ID = new Map<string, number>(
  Object.entries(StrategyName).map(([id, name]) => [name, Number(id)])
);

/**
 * Build the `raceHorseInfo[]` shape the prediction feature builder consumes
 * from the race-sim field. Single aptitude grades are expanded into the
 * per-bucket `proper_*` fields (all equal) since the model only reads the
 * bucket matching the course.
 */
export function runnersToRaceHorseInfo(runners: IRunnerState[]): Array<Record<string, unknown>> {
  return runners.map((runner, index) => {
    const full = runner.aptitudes;
    const distance = aptitudeToEncoding(runner.distanceAptitude);
    const ground = aptitudeToEncoding(runner.surfaceAptitude);
    const style = aptitudeToEncoding(runner.strategyAptitude);
    const apt = (grade: string | undefined, fallback: number) =>
      grade !== undefined ? aptitudeToEncoding(grade) : fallback;
    const runningStyle = STRATEGY_NAME_TO_ID.get(runner.strategy) ?? Strategy.FrontRunner;

    return {
      team_id: typeof runner.team === 'number' ? runner.team : 0,
      // frame_order is 1-based; fall back to field order when no gate is set.
      frame_order: typeof runner.gate === 'number' ? runner.gate : index + 1,
      running_style: runningStyle,
      motivation: runner.mood + 3, // Mood -2..2 -> motivation 1..5
      single_mode_win_count: 0,
      speed: runner.speed,
      stamina: runner.stamina,
      pow: runner.power,
      guts: runner.guts,
      wiz: runner.wisdom,
      proper_distance_short: apt(full?.distanceShort, distance),
      proper_distance_mile: apt(full?.distanceMile, distance),
      proper_distance_middle: apt(full?.distanceMiddle, distance),
      proper_distance_long: apt(full?.distanceLong, distance),
      proper_ground_turf: apt(full?.turf, ground),
      proper_ground_dirt: apt(full?.dirt, ground),
      proper_running_style_nige: apt(full?.nige, style),
      proper_running_style_senko: apt(full?.senko, style),
      proper_running_style_sashi: apt(full?.sashi, style),
      proper_running_style_oikomi: apt(full?.oikomi, style),
      skill_array: runner.skills.map((skillId) => ({
        skillId: Number((skillId.split('-')[0] ?? skillId).trim())
      })),
      card_id: Number(runner.outfitId) || 0,
      chara_id: runner.outfitId ? Number(runner.outfitId.slice(0, 4)) || 0 : 0,
      // Use the imported rank score when present, else our native estimate.
      rank_score: estimateRunnerRankScore(runner)
    };
  });
}
