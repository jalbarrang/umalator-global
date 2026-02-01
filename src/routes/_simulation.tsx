import { Outlet } from 'react-router';

import { LeftSidebar } from '@/layout/left-sidebar';
import { SimulationModeToggle } from '@/components/simulation-mode-toggle';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { useSkillModalStore } from '@/modules/skills/store';

export function SimulationLayout() {
  const { open, umaId, options, currentSkills, onSelect } = useSkillModalStore();

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
  };

  return (
    <>
      <SkillPickerDrawer
        open={open}
        umaId={umaId}
        options={options}
        currentSkills={currentSkills}
        onSelect={onSelect}
        onOpenChange={handleOpenChange}
      />
      <LeftSidebar />

      <div className="flex flex-col flex-1 p-4 gap-4">
        <SimulationModeToggle />
        <Outlet />
      </div>
    </>
  );
}
