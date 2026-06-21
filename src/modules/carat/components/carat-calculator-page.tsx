import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTutorial } from '@/components/tutorial';
import { caratCalculatorSteps } from '@/modules/tutorial/steps/carat-calculator-steps';
import { AddBannerDialog } from '@/modules/carat/components/add-banner-dialog';
import { BannerPlanTable } from '@/modules/carat/components/banner-plan-table';
import { IncomeSettings } from '@/modules/carat/components/income-settings';
import { SelectorPlanner } from '@/modules/carat/components/selector-planner';
import { SummaryStats } from '@/modules/carat/components/summary-stats';
import { fetchTimeline } from '@/modules/carat/data/timeline-client';
import {
  completeTutorial,
  dismissTutorial,
  markVisited,
  useIsFirstVisit,
  useTutorialStatus
} from '@/store/tutorial.store';

type TimelinePanelProps = {
  mode: 'calculator' | 'selector';
};

function TimelinePanel(props: TimelinePanelProps) {
  const { mode } = props;
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (timelineQuery.isPending) {
    return <div className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">Loading timeline…</div>;
  }

  if (timelineQuery.isError) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-destructive">Couldn’t load the banner timeline.</div>
          <p className="mt-0.5 text-muted-foreground">Check your connection and try again — your income settings are saved.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching}>
          {timelineQuery.isFetching ? 'Retrying…' : 'Retry'}
        </Button>
      </div>
    );
  }

  return mode === 'calculator' ? <BannerPlanTable timeline={timelineQuery.data} /> : <SelectorPlanner timeline={timelineQuery.data} />;
}

function LiveDataStatus() {
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (!timelineQuery.data) return null;

  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex" title={`${timelineQuery.data.events.length.toLocaleString()} timeline events loaded`}>
      <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
      Live timeline
    </span>
  );
}

function AddBannerButton() {
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (!timelineQuery.data) {
    return (
      <Button data-tutorial="carat-add-banner" disabled>
        + Add banner from timeline
      </Button>
    );
  }

  return <AddBannerDialog timeline={timelineQuery.data} />;
}

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
      className="mx-auto w-full max-w-[1320px] gap-0 overflow-y-auto px-4 py-4 sm:px-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">Carat Calculator</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan your pulls against the live banner timeline · Global server · v5.3 data
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={startTour}>
            Take a tour
          </Button>
          <TabsList aria-label="Carat calculator sections">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger data-tutorial="carat-selector-tab" value="selector">Selector Planner</TabsTrigger>
          </TabsList>
        </div>
      </div>

      {showFirstVisitNudge ? (
        <div className="mb-4 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">New here? Take a 60-second tour.</div>
              <div className="text-xs text-muted-foreground">Learn carats, pulls, sparks, odds, and selector planning without auto-launching anything.</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={startTour}>Start</Button>
              <Button size="sm" variant="outline" onClick={dismissFirstVisitNudge}>Dismiss</Button>
            </div>
          </div>
        </div>
      ) : null}

      <SummaryStats />

      <div className="grid items-start gap-4 lg:grid-cols-[330px_1fr]">
        <IncomeSettings />

        <section data-tutorial="carat-planner" className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <strong className="text-sm">{activeTab === 'calculator' ? 'Banner Plan' : 'Selector Planner'}</strong>
            <div className="flex items-center gap-2">
              <LiveDataStatus />
              {activeTab === 'calculator' ? <AddBannerButton /> : null}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <TabsContent value="calculator"><TimelinePanel mode="calculator" /></TabsContent>
            <TabsContent value="selector"><TimelinePanel mode="selector" /></TabsContent>
          </div>
        </section>
      </div>
    </Tabs>
  );
}
