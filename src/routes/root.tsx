import { Route, Routes, useNavigate } from 'react-router';

import { Toaster } from '@/components/ui/sonner';
import { PageMetadata } from '@/components/seo/page-metadata';
import { Button } from '@/components/ui/button';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { FeatureFlagDebugPanel } from '@/components/feature-flag-debug-panel';
import { TutorialProvider, TutorialRoot } from '@/components/tutorial';
import { Navbar } from '@/modules/app/components/navbar';
import { ImportCodeDialog } from '@/modules/runners/share/import-code-dialog';
import { useRoosterImport } from '@/modules/runners/share/use-rooster-import';
import { setRunner } from '@/store/runners.store';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { toast } from 'sonner';

import { lazy, Suspense, useCallback } from 'react';
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

  return (
    <TutorialProvider>
      <div className="flex flex-col h-dvh">
        <Navbar />

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
