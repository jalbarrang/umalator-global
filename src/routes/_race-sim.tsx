import { useCallback, useMemo } from 'react';
import { XIcon } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RaceSimContext } from '@/modules/race-sim/context';
import { loadResults } from '@/modules/race-sim/stores/playback.store';
import { useRaceSimRunner } from '@/modules/simulation/hooks/race-sim/useRaceSimRunner';
import {
  setIsRunning,
  setResults as setRaceSimResults,
  useRaceSimStore,
} from '@/modules/simulation/stores/race-sim.store';
import { createSkillSorterByGroup, toCreateRunner } from '@/modules/simulation/simulators/shared';
import { useSettingsStore } from '@/store/settings.store';
import { setDismissal, useUIStore } from '@/store/ui.store';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-picker/drawer';
import { useSkillModalStore } from '@/modules/skills/store';
import type { RaceSimWorkerParams } from '@/workers/race-sim.worker';

function RaceSimSkillPicker() {
  const { open, umaId, options, currentSkills, onSelect } = useSkillModalStore();

  const handleOpenChange = useCallback((value: boolean) => {
    useSkillModalStore.setState({ open: value });
  }, []);

  return (
    <SkillPickerDrawer
      open={open}
      umaId={umaId}
      options={options}
      currentSkills={currentSkills}
      onSelect={onSelect}
      onOpenChange={handleOpenChange}
    />
  );
}

const tabs = [
  { label: 'Configure', to: '/race-sim' },
  { label: 'Run', to: '/race-sim/run' },
  { label: 'Results', to: '/race-sim/results' },
] as const;

export function RaceSimRoot() {
  const location = useLocation();
  const dismissed = useUIStore((state) => state.dismissals['race-sim-notice']);

  const { courseId, racedef } = useSettingsStore(
    useShallow((state) => ({
      courseId: state.courseId,
      racedef: state.racedef,
    })),
  );

  const { runners, nsamples, focusRunnerIndices } = useRaceSimStore(
    useShallow((state) => ({
      runners: state.runners,
      nsamples: state.nsamples,
      focusRunnerIndices: state.focusRunnerIndices,
    })),
  );

  const { runSimulation, cancelSimulation, isRunning, error } = useRaceSimRunner({
    onResult: (result) => {
      setRaceSimResults(result);
      loadResults(result);
    },
    onRunningChange: setIsRunning,
  });

  const runWithSeed = useCallback(
    (seed: number) => {
      const allSkillIds = runners.flatMap((r) => r.skills);
      const sorter = createSkillSorterByGroup(allSkillIds);
      const raceRunners = runners.map((runner) =>
        toCreateRunner(runner, runner.skills.toSorted(sorter)),
      );
      const params: RaceSimWorkerParams = {
        course: CourseHelpers.getCourse(courseId),
        parameters: racedefToParams(racedef),
        runners: raceRunners,
        nsamples,
        masterSeed: seed,
        focusRunnerIds: focusRunnerIndices.length > 0 ? focusRunnerIndices : undefined,
      };
      runSimulation(params);
    },
    [courseId, focusRunnerIndices, nsamples, racedef, runSimulation, runners],
  );

  const ctx = useMemo(
    () => ({ runWithSeed, cancelSimulation, isRunning, error }),
    [runWithSeed, cancelSimulation, isRunning, error],
  );

  return (
    <RaceSimContext.Provider value={ctx}>
      <RaceSimSkillPicker />
      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="flex shrink-0 items-center gap-1 border-b border-border px-4">
          {tabs.map((tab) => {
            const active =
              tab.to === '/race-sim'
                ? location.pathname === '/race-sim'
                : location.pathname.startsWith(tab.to);

            return (
              <Link
                key={tab.to}
                to={tab.to}
                draggable={false}
                className={cn(
                  'relative px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:transition-opacity',
                  active ? 'after:bg-primary after:opacity-100' : 'after:opacity-0',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto md:overflow-hidden">
          {!dismissed && (
            <div className="px-4 pt-3">
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTitle className="text-amber-700 dark:text-amber-300">
                  Work in progress
                </AlertTitle>
                <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
                  Race Sim is still being actively developed. Expect bugs and occasional
                  inconsistencies in results while we stabilize the feature.
                </AlertDescription>
                <AlertAction>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss race sim disclaimer"
                    onClick={() => {
                      setDismissal('race-sim-notice', true);
                    }}
                  >
                    <XIcon />
                  </Button>
                </AlertAction>
              </Alert>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </RaceSimContext.Provider>
  );
}
