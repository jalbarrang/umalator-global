import { SkillPlannerLayout } from '@/modules/skill-planner/components/SkillPlannerLayout';
import { usePlannerImport } from '@/modules/skill-planner/share/use-planner-import';

export default function SkillPlannerRoot() {
  usePlannerImport();

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
      <SkillPlannerLayout />
    </div>
  );
}
