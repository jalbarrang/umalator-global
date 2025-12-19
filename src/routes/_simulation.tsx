import { createFileRoute, Outlet } from '@tanstack/react-router';

import { LeftSidebar } from '@/layout/left-sidebar';
import { SimulationModeToggle } from '@/components/simulation-mode-toggle';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';

export const Route = createFileRoute('/_simulation')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <SkillPickerDrawer />
      <LeftSidebar />

      <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
        <SimulationModeToggle />
        <Outlet />
      </div>
    </>
  );
}
