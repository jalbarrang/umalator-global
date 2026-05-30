import { Route, Routes, useNavigate } from 'react-router';

import { Toaster } from '@/components/ui/sonner';
import { PageMetadata } from '@/components/seo/page-metadata';
import { Button } from '@/components/ui/button';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { SuggestionModal } from '@/components/suggestion-modal';
import { TutorialProvider, TutorialRoot } from '@/components/tutorial';
import { Navbar } from '@/modules/app/components/navbar';
import { ImportCodeDialog } from '@/modules/runners/share/import-code-dialog';
import { useRoosterImport } from '@/modules/runners/share/use-rooster-import';
import { setRunner } from '@/store/runners.store';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import { toast } from 'sonner';
import { scan } from 'react-scan';

import { Suspense, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

// Layouts
import { SimulationLayout } from './_simulation';
import { RunnersLayout } from './runners';
import { RaceSimRoot } from './race-sim';

// Pages
// Compare
import SimulationHome from './_simulation/home';
import SkillBassin from './_simulation/skill-bassin';
import UmaBassin from './_simulation/uma-bassin';
// Skill Planner
import SkillPlanner from './skill-planner';
// Roster
import RunnersHome from './runners/home';
import RunnersNew from './runners/new';
import RunnersEdit from './runners/$runnerId.edit';
// Race Simulation
import RaceSimHome from './race-sim/home';
import RaceSimRun from './race-sim/run';
import RaceSimResults from './race-sim/results';
// Tools
import { SkillsPage } from './_tools/skills';
import { SparkOddsPage } from './_tools/spark-odds';

import { SupportCardsPage } from './_tools/support-cards';
import { config } from '@/config';

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
    (slot: 'uma1' | 'uma2', partialRunner: Partial<IRunnerState>) => {
      const fullRunner = createRunnerState(partialRunner);
      setRunner(slot, fullRunner);
      setDialogOpen(false);
      toast.success(`Runner loaded to ${slot === 'uma1' ? 'Uma 1' : 'Uma 2'}`);
    },
    [setDialogOpen]
  );

  // useScan() has a bug where it ignores `enabled` and always calls start(),
  // so we use scan() directly which properly respects the enabled flag
  useEffect(() => {
    scan({ enabled: config.reactScan });
  }, []);

  return (
    <TutorialProvider>
      <div className="flex flex-col h-dvh">
        <Navbar />

        <main className="flex flex-1 overflow-hidden min-h-0">
          <Routes>
            <Route path="/" element={<SimulationLayout />}>
              <Route
                index
                element={
                  <RoutePage title="Compare Builds" description="">
                    <SimulationHome />
                  </RoutePage>
                }
              />
              <Route
                path="/skill-bassin"
                element={
                  <RoutePage title="Compare Skills" description="">
                    <SkillBassin />
                  </RoutePage>
                }
              />
              <Route
                path="/uma-bassin"
                element={
                  <RoutePage title="Compare Uniques" description="">
                    <UmaBassin />
                  </RoutePage>
                }
              />
            </Route>

            <Route path="/runners" element={<RunnersLayout />}>
              <Route
                index
                element={
                  <RoutePage title="Roster" description="">
                    <RunnersHome />
                  </RoutePage>
                }
              />
              <Route
                path="/runners/new"
                element={
                  <RoutePage title="Add Runner" description="" noindex>
                    <RunnersNew />
                  </RoutePage>
                }
              />
              <Route
                path="/runners/:runnerId/edit"
                element={
                  <RoutePage title="Edit Runner" description="" noindex>
                    <RunnersEdit />
                  </RoutePage>
                }
              />
            </Route>

            <Route path="/race-sim" element={<RaceSimRoot />}>
              <Route
                index
                element={
                  <RoutePage title="9-runner race sim" description="">
                    <RaceSimHome />
                  </RoutePage>
                }
              />
              <Route
                path="/race-sim/run"
                element={
                  <RoutePage title="Race Sim - Playback" description="" noindex>
                    <RaceSimRun />
                  </RoutePage>
                }
              />
              <Route
                path="/race-sim/results"
                element={
                  <RoutePage title="Race Sim - Results" description="" noindex>
                    <RaceSimResults />
                  </RoutePage>
                }
              />
            </Route>

            <Route
              path="/skill-planner"
              element={
                <RoutePage title="Skill Planner" description="">
                  <SkillPlanner />
                </RoutePage>
              }
            />

            <Route
              path="/skills"
              element={
                <RoutePage title="Skills" description="Browse all skills">
                  <SkillsPage />
                </RoutePage>
              }
            />

            <Route path="/spark-odds" element={<SparkOddsPage />} />

            <Route
              path="/support-cards"
              element={
                <RoutePage title="Support Cards" description="Browse support card data" noindex>
                  <Suspense fallback={null}>
                    <SupportCardsPage />
                  </Suspense>
                </RoutePage>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<NotFoundComponent />} />
          </Routes>
        </main>

        <CreditsModal />
        <ChangelogModal />
        <SuggestionModal />

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
          <h1 className="text-6xl font-semibold">404</h1>
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
