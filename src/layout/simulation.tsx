import { Outlet } from 'react-router';
import { LeftSidebar } from './left-sidebar';
import { SimulationModeToggle } from '@/components/simulation-mode-toggle';

export const SimulationLayout = () => {
  return (
    <>
      <LeftSidebar />

      <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
        <SimulationModeToggle />
        <Outlet />
      </div>
    </>
  );
};
