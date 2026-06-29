import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTutorial } from '@/components/tutorial';
import { caratCalculatorSteps } from '@/modules/tutorial/steps/carat-calculator-steps';
import { AddBannerButton } from '@/modules/carat/components/add-banner-button';
import { IncomeSettings } from '@/modules/carat/components/income-settings';
import { LiveDataStatus } from '@/modules/carat/components/live-data-status';
import { PlanSwitcher } from '@/modules/carat/components/plan-switcher';
import { SummaryStats } from '@/modules/carat/components/summary-stats';
import { TimelinePanel } from '@/modules/carat/components/timeline-panel';
import {
  completeTutorial,
  dismissTutorial,
  markVisited,
  useIsFirstVisit,
  useTutorialStatus
} from '@/store/tutorial.store';

export function CaratCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'selector'>('calculator');
  const { start, isActive, tutorialId } = useTutorial();
  const wasCaratTourActive = useRef(false);
  const isFirstVisit = useIsFirstVisit('carat-calculator');
  const { isCompleted, isDismissed } = useTutorialStatus('carat-calculator');
  const [isFirstVisitNudgeOpen, setIsFirstVisitNudgeOpen] = useState(
    () => isFirstVisit && !isCompleted && !isDismissed
  );
  const showFirstVisitNudge = isFirstVisitNudgeOpen && !isCompleted && !isDismissed;

  useEffect(() => {
    if (isFirstVisitNudgeOpen) {
      markVisited('carat-calculator');
    }
  }, [isFirstVisitNudgeOpen]);

  useEffect(() => {
    if (isActive && tutorialId === 'carat-calculator') {
      wasCaratTourActive.current = true;
      return;
    }

    if (wasCaratTourActive.current) {
      completeTutorial('carat-calculator');
      wasCaratTourActive.current = false;
    }
  }, [isActive, tutorialId]);

  const startTour = () => {
    setActiveTab('calculator');
    setIsFirstVisitNudgeOpen(false);
    start('carat-calculator', caratCalculatorSteps);
  };

  const dismissFirstVisitNudge = () => {
    setIsFirstVisitNudgeOpen(false);
    dismissTutorial('carat-calculator');
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'calculator' | 'selector')}
      className="w-full gap-0 overflow-y-auto px-4 py-4 sm:px-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">Carat Calculator</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan your pulls against the live banner timeline · Global server · v5.3 data
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlanSwitcher />
          <Button size="sm" variant="outline" onClick={startTour}>
            Take a tour
          </Button>
          <TabsList aria-label="Carat calculator sections">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger data-tutorial="carat-selector-tab" value="selector">
              Selector Planner
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {showFirstVisitNudge ? (
        <div className="mb-4 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">New here? Take a 60-second tour.</div>
              <div className="text-xs text-muted-foreground">
                Learn carats, pulls, sparks, odds, and selector planning without auto-launching
                anything.
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={startTour}>
                Start
              </Button>
              <Button size="sm" variant="outline" onClick={dismissFirstVisitNudge}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
        Estimates only. Odds use independent-probability models and are not guarantees — your actual
        results will vary. This is not financial advice; only spend what you can comfortably afford.
      </p>

      <SummaryStats />

      <div className="grid items-start gap-4 lg:grid-cols-[330px_1fr]">
        <IncomeSettings />

        <section data-tutorial="carat-planner" className="rounded-xl border bg-card shadow-sm">
          {activeTab === 'calculator' ? (
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <strong className="text-sm">Banner Plan</strong>
              <div className="flex items-center gap-2">
                <LiveDataStatus />
                <AddBannerButton />
              </div>
            </div>
          ) : null}
          <div className="space-y-4 p-4">
            <TabsContent value="calculator">
              <TimelinePanel mode="calculator" />
            </TabsContent>
            <TabsContent value="selector">
              <TimelinePanel mode="selector" />
            </TabsContent>
          </div>
        </section>
      </div>
    </Tabs>
  );
}
