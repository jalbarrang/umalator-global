import { SkillPlannerLayout } from '@/modules/skill-planner/components/SkillPlannerLayout';
import { WorkInProgress } from '@/components/work-in-progress';
import { useFeature } from '@/lib/feature-flags';

export function SkillPlanner() {
  const isSkillPlannerEnabled = useFeature('SKILL_PLANNER_ENABLED');

  if (!isSkillPlannerEnabled) {
    return <WorkInProgress />;
  }

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
      <SkillPlannerLayout />
    </div>
  );
}
