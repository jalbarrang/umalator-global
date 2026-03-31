import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';

import { SimulationLayout } from './_simulation';
import { SimulationHome } from './_simulation/home';
import { SkillBassin } from './_simulation/skill-bassin';
import { UmaBassin } from './_simulation/uma-bassin';
import { SkillPlanner } from './skill-planner';
import { RunnersLayout } from './runners';
import { RunnersHome } from './runners/home';
import { RunnersNew } from './runners/new';
import { RunnersEdit } from './runners/$runnerId.edit';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { FeatureFlagDebugPanel } from '@/components/feature-flag-debug-panel';
import { TutorialProvider, TutorialRoot } from '@/components/tutorial';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { ScrollTextIcon, UsersIcon, MenuIcon } from 'lucide-react';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';
import { cn } from '@/lib/utils';
import { ImportCodeDialog } from '@/modules/runners/share/import-code-dialog';
import { useRoosterImport } from '@/modules/runners/share/use-rooster-import';
import { setRunner } from '@/store/runners.store';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { toast } from 'sonner';

import { RaceSimRoot } from './_race-sim';
import { RaceSimHome } from './race-sim/home';
import { RaceSimRun } from './race-sim/run';
import { RaceSimResults } from './race-sim/results';

import { useCallback, useMemo, useState } from 'react';

export function RootComponent() {
  const location = useLocation();

  const getCurrentTab = useCallback(() => {
    if (location.pathname.startsWith('/runners')) return 'runners';
    if (location.pathname === '/skill-planner') return 'skill-planner';
    if (location.pathname.startsWith('/race-sim')) return 'race-sim';
    return 'simulation';
  }, [location.pathname]);

  const currentTab = useMemo(() => getCurrentTab(), [getCurrentTab]);

  const navItems = useMemo(
    () => [
      { value: 'simulation', label: 'Compare', to: '/' },
      { value: 'skill-planner', label: 'Skill Planner', to: '/skill-planner' },
      { value: 'race-sim', label: 'Race Sim', to: '/race-sim' },
      { value: 'runners', label: 'Veterans', to: '/runners' },
    ],
    [],
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { importCode, dialogOpen, setDialogOpen } = useRoosterImport();

  const handleRoosterImport = useCallback(
    (slot: 'uma1' | 'uma2', partialRunner: Partial<RunnerState>) => {
      const fullRunner = createRunnerState(partialRunner);
      setRunner(slot, fullRunner);
      setDialogOpen(false);
      toast.success(`Runner loaded to ${slot === 'uma1' ? 'Uma 1' : 'Uma 2'}`);
    },
    [setDialogOpen],
  );

  const handleNavClick = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <TutorialProvider>
      <div className="flex flex-col h-dvh">
        <header className="flex py-2 justify-between items-center border-b px-4 shrink-0">
          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="top">
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerTitle className="sr-only">Navigation</DrawerTitle>
                <nav className="flex flex-col p-2 gap-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.value}
                      to={item.to}
                      draggable={false}
                      onClick={handleNavClick}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-medium text-left transition-colors',
                        currentTab === item.value
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.value}
                to={item.to}
                draggable={false}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  currentTab === item.value
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    className="flex h-9 w-9 items-center justify-center"
                    onClick={() => setShowCreditsModal(true)}
                    aria-label="Open credits"
                  />
                }
              >
                <UsersIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Credits</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    className="flex h-9 w-9 items-center justify-center"
                    onClick={() => setShowChangelogModal(true)}
                    aria-label="Open changelog"
                  />
                }
              >
                <ScrollTextIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Changelog</TooltipContent>
            </Tooltip>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden min-h-0">
          <Routes>
            <Route path="/" element={<SimulationLayout />}>
              <Route index element={<SimulationHome />} />
              <Route path="/skill-bassin" element={<SkillBassin />} />
              <Route path="/uma-bassin" element={<UmaBassin />} />
            </Route>

            <Route path="/runners" element={<RunnersLayout />}>
              <Route index element={<RunnersHome />} />
              <Route path="/runners/new" element={<RunnersNew />} />
              <Route path="/runners/:runnerId/edit" element={<RunnersEdit />} />
            </Route>

            <Route path="/race-sim" element={<RaceSimRoot />}>
              <Route index element={<RaceSimHome />} />
              <Route path="/race-sim/run" element={<RaceSimRun />} />
              <Route path="/race-sim/results" element={<RaceSimResults />} />
            </Route>

            <Route path="/skill-planner" element={<SkillPlanner />} />
          </Routes>
        </main>

        <CreditsModal />
        <ChangelogModal />
        <FeatureFlagDebugPanel />
        <ImportCodeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialCode={importCode}
          mode="slot-picker"
          onLoadToSlot={handleRoosterImport}
        />
      </div>
      <Toaster />
      <TutorialRoot />
    </TutorialProvider>
  );
}

export function NotFoundComponent() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="flex gap-2 justify-center pt-4">
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    </div>
  );
}
