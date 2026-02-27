import { Route, Routes, useLocation, useNavigate } from 'react-router';

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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';
import { FeatureFlagDebugPanel } from '@/components/feature-flag-debug-panel';
import { TutorialProvider, TutorialRoot } from '@/components/tutorial';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollTextIcon, UsersIcon } from 'lucide-react';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';

export function RootComponent() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    if (location.pathname.startsWith('/runners')) return 'runners';
    if (location.pathname === '/skill-planner') return 'skill-planner';
    return 'simulation';
  };

  const currentTab = getCurrentTab();

  return (
    <TutorialProvider>
      <div className="flex flex-col min-h-screen">
        <div className="flex py-2 justify-between items-center border-b px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Tabs
              value={currentTab}
              onValueChange={(value) => {
                if (value === 'simulation') {
                  navigate('/');
                } else if (value === 'runners') {
                  navigate('/runners');
                } else if (value === 'skill-planner') {
                  navigate('/skill-planner');
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="simulation">Umalator</TabsTrigger>
                <TabsTrigger value="runners">Veterans</TabsTrigger>
                <TabsTrigger value="skill-planner">Skill Planner</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" className="flex h-9 w-9 items-center justify-center">
                    <a
                      href="https://github.com/jalbarrang/umalator-global"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open repository"
                    >
                      <img
                        src="/svg/github.svg"
                        alt="GitHub Repository"
                        className="h-4 w-4 dark:invert"
                      />
                    </a>
                  </Button>
                }
              ></TooltipTrigger>
              <TooltipContent>Repository</TooltipContent>
            </Tooltip>
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
        </div>

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

            <Route path="/skill-planner" element={<SkillPlanner />} />
          </Routes>
        </main>

        <CreditsModal />
        <ChangelogModal />
        <FeatureFlagDebugPanel />
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
          <Button onClick={() => navigate('/')}>Go to Umalator</Button>
          <Button variant="outline" onClick={() => navigate('/runners')}>
            Go to Veterans
          </Button>
        </div>
      </div>
    </div>
  );
}
