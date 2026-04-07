import { useMemo } from 'react';
import { trackDescription } from '@/modules/racetrack/labels';
import { getDefaultTrackIdForCourse } from '@/modules/racetrack/courses';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import i18n from '@/i18n';
import strings_en from '@/i18n/lang/en/skills';
import { useSettingsStore } from '@/store/settings.store';
import { useSkillPlannerStore } from '../skill-planner.store';
import { CostModifiersPanel } from './CostModifiersPanel';
import { SkillPlannerResults } from './SkillPlannerResults';
import { Button } from '@/components/ui/button';

const groundConditions: Record<number, string> = {
  1: 'Firm',
  2: 'Good',
  3: 'Soft',
  4: 'Heavy',
};

type SkillPlannerReviewStepProps = {
  onEditRunner: () => void;
  onEditShop: () => void;
};

export function SkillPlannerReviewStep(props: Readonly<SkillPlannerReviewStepProps>) {
  const { onEditRunner, onEditShop } = props;
  const { runner, obtainedSkillIds, candidates, hasFastLearner } = useSkillPlannerStore();
  const { courseId, racedef } = useSettingsStore();

  const candidateCount = useMemo(() => Object.keys(candidates).length, [candidates]);
  const runnerSummary = useMemo(() => {
    if (!runner.outfitId) {
      return 'No runner selected';
    }

    const info = getUmaDisplayInfo(runner.outfitId);
    if (!info) {
      return runner.outfitId;
    }

    return `${info.outfit} · ${info.name}`;
  }, [runner.outfitId]);
  const raceSummary = useMemo(() => {
    const trackId = getDefaultTrackIdForCourse(courseId);
    const trackName = i18n.t(`tracknames.${trackId}`);
    const courseDesc = trackDescription({ courseid: courseId });
    const ground = groundConditions[racedef.ground] ?? '';
    const season = strings_en.skilldetails.season[racedef.season] ?? '';
    const weather = strings_en.skilldetails.weather[racedef.weather] ?? '';

    return `${trackName} · ${courseDesc} · ${ground} · ${season} · ${weather}`;
  }, [courseId, racedef.ground, racedef.season, racedef.weather]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Runner</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>{runnerSummary}</div>
            <div>
              {runner.speed}/{runner.stamina}/{runner.power}/{runner.guts}/{runner.wisdom}
            </div>
            <div>
              {runner.strategy} · {runner.surfaceAptitude}/{runner.distanceAptitude}/
              {runner.strategyAptitude}
            </div>
            <div>{obtainedSkillIds.length} obtained skills</div>
            <div>{hasFastLearner ? 'Fast Learner enabled' : 'Fast Learner disabled'}</div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onEditRunner}>
              Edit runner
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Shop</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>{candidateCount} candidate skills selected</div>
            <div>
              {candidateCount === 0
                ? 'Add one or more skills to test different purchase combinations.'
                : 'Hint levels and candidate pool are ready for optimization.'}
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onEditShop}>
              Edit shop skills
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Race settings</div>
          <div className="text-sm text-muted-foreground">{raceSummary}</div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onEditRunner}>
              Edit runner
            </Button>
          </div>
        </div>
      </div>

      {candidateCount === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">No candidate skills selected yet</div>
              <div className="text-xs opacity-80">
                You can review the runner setup here, but optimization stays disabled until you add
                at least one shop skill.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onEditShop}>
              Go to Shop
            </Button>
          </div>
        </div>
      )}

      <CostModifiersPanel />
      <SkillPlannerResults />
    </div>
  );
}
