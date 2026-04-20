import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';

import { Toaster } from '@/components/ui/sonner';
import { PageMetadata } from '@/components/seo/page-metadata';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { FeatureFlagDebugPanel } from '@/components/feature-flag-debug-panel';
import { TutorialProvider, TutorialRoot } from '@/components/tutorial';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { SnapshotSwitcher } from '@/components/snapshot-switcher';
import { ScrollTextIcon, UsersIcon, MenuIcon } from 'lucide-react';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';
import { cn } from '@/lib/utils';
import { ImportCodeDialog } from '@/modules/runners/share/import-code-dialog';
import { useRoosterImport } from '@/modules/runners/share/use-rooster-import';
import { setRunner } from '@/store/runners.store';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { toast } from 'sonner';

import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const SimulationLayout = lazy(async () => ({
  default: (await import('./_simulation')).SimulationLayout,
}));
const SimulationHome = lazy(async () => ({
  default: (await import('./_simulation/home')).SimulationHome,
}));
const SkillBassin = lazy(async () => ({
  default: (await import('./_simulation/skill-bassin')).SkillBassin,
}));
const UmaBassin = lazy(async () => ({
  default: (await import('./_simulation/uma-bassin')).UmaBassin,
}));
const SkillPlanner = lazy(async () => ({
  default: (await import('./skill-planner')).SkillPlanner,
}));
const RunnersLayout = lazy(async () => ({ default: (await import('./runners')).RunnersLayout }));
const RunnersHome = lazy(async () => ({ default: (await import('./runners/home')).RunnersHome }));
const RunnersNew = lazy(async () => ({ default: (await import('./runners/new')).RunnersNew }));
const RunnersEdit = lazy(async () => ({
  default: (await import('./runners/$runnerId.edit')).RunnersEdit,
}));
const RaceSimRoot = lazy(async () => ({ default: (await import('./_race-sim')).RaceSimRoot }));
const RaceSimHome = lazy(async () => ({ default: (await import('./race-sim/home')).RaceSimHome }));
const RaceSimRun = lazy(async () => ({ default: (await import('./race-sim/run')).RaceSimRun }));
const RaceSimResults = lazy(async () => ({
  default: (await import('./race-sim/results')).RaceSimResults,
}));

type RoutePageProps = {
  title: string;
  description: string;
  noindex?: boolean;
  children: ReactNode;
};

function RoutePage({ title, description, noindex = false, children }: RoutePageProps) {
  return (
    <>
      <PageMetadata title={title} description={description} noindex={noindex} />
      {children}
    </>
  );
}

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
                <div className="border-t px-3 py-2">
                  <SnapshotSwitcher />
                </div>
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
            <div className="hidden md:block">
              <SnapshotSwitcher />
            </div>
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
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
                Loading route…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<SimulationLayout />}>
                <Route
                  index
                  element={
                    <RoutePage
                      title="Uma Musume Build Compare Tool"
                      description="Compare two Uma Musume Global configurations with repeatable seeded simulations, bassin gain charts, and race setting controls."
                    >
                      <SimulationHome />
                    </RoutePage>
                  }
                />
                <Route
                  path="/skill-bassin"
                  element={
                    <RoutePage
                      title="Skill Bassin Compare"
                      description="Measure bassin gain from skill changes using isolated seeded comparisons for Uma Musume Global builds."
                    >
                      <SkillBassin />
                    </RoutePage>
                  }
                />
                <Route
                  path="/uma-bassin"
                  element={
                    <RoutePage
                      title="Runner Bassin Compare"
                      description="Compare full runner configurations and see position gain in bassin across repeatable Uma Musume Global simulations."
                    >
                      <UmaBassin />
                    </RoutePage>
                  }
                />
              </Route>

              <Route path="/runners" element={<RunnersLayout />}>
                <Route
                  index
                  element={
                    <RoutePage
                      title="Veteran Library"
                      description="Save, search, filter, and reuse runner builds for Uma Musume Global simulations and race planning."
                    >
                      <RunnersHome />
                    </RoutePage>
                  }
                />
                <Route
                  path="/runners/new"
                  element={
                    <RoutePage
                      title="Add Runner"
                      description="Create a new runner build for Yet Another Umalator."
                      noindex
                    >
                      <RunnersNew />
                    </RoutePage>
                  }
                />
                <Route
                  path="/runners/:runnerId/edit"
                  element={
                    <RoutePage
                      title="Edit Runner"
                      description="Edit a saved runner build for Yet Another Umalator."
                      noindex
                    >
                      <RunnersEdit />
                    </RoutePage>
                  }
                />
              </Route>

              <Route path="/race-sim" element={<RaceSimRoot />}>
                <Route
                  index
                  element={
                    <RoutePage
                      title="Uma Musume Race Simulator"
                      description="Inspect race simulation setup, runner details, and playback tools for a full-field Uma Musume Global race sim."
                    >
                      <RaceSimHome />
                    </RoutePage>
                  }
                />
                <Route
                  path="/race-sim/run"
                  element={
                    <RoutePage
                      title="Race Sim Playback"
                      description="Run-by-run playback for the Uma Musume race simulator."
                      noindex
                    >
                      <RaceSimRun />
                    </RoutePage>
                  }
                />
                <Route
                  path="/race-sim/results"
                  element={
                    <RoutePage
                      title="Race Sim Results"
                      description="Detailed results and finish-order output for the Uma Musume race simulator."
                      noindex
                    >
                      <RaceSimResults />
                    </RoutePage>
                  }
                />
              </Route>

              <Route
                path="/skill-planner"
                element={
                  <RoutePage
                    title="Uma Musume Global Skill Planner"
                    description="Plan skill purchases for Uma Musume Global with costs, dependencies, discounts, and build iteration tools."
                  >
                    <SkillPlanner />
                  </RoutePage>
                }
              />
            </Routes>
          </Suspense>
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
    <>
      <PageMetadata
        title="Page Not Found"
        description="The requested page could not be found."
        noindex
      />
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
    </>
  );
}
