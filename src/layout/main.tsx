import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';
import { HeartIcon, ScrollTextIcon } from 'lucide-react';
import { Outlet } from 'react-router';

export const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex py-2 justify-between items-center border-b px-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* Later on this will be a tab list for different screens (Race Simulation, Standalone Stamina Calculator, Skill Builder) */}
          <div className="text-sm sm:text-base font-medium">
            Race Simulation
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangelogModal(true)}
          >
            <ScrollTextIcon className="h-4 w-4 mr-1" />
            <span className="hidden md:inline!">Changelog</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreditsModal(true)}
          >
            <HeartIcon className="h-4 w-4 mr-1" />
            <span className="hidden md:inline!">Credits</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <main className="flex flex-1 overflow-hidden min-h-0">
        <Outlet />
      </main>

      <CreditsModal />
      <ChangelogModal />
    </div>
  );
};
