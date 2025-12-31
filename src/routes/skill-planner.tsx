import { SkillPlannerLayout } from '@/modules/skill-planner/components/SkillPlannerLayout';

export function SkillPlanner() {
  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
      <SkillPlannerLayout />
    </div>
  );
}
