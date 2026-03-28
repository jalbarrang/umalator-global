import { useCallback, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { RaceSimContext } from '@/modules/race-sim/context';
import { usePlaybackStore } from '@/modules/race-sim/stores/playback.store';
import { useRaceSimRunner } from '@/modules/simulation/hooks/race-sim/useRaceSimRunner';
import {
  setIsRunning,
  setResults as setRaceSimResults,
  useRaceSimStore,
} from '@/modules/simulation/stores/race-sim.store';
import { createSkillSorterByGroup, toCreateRunner } from '@/modules/simulation/simulators/shared';
import { useSettingsStore } from '@/store/settings.store';
import type { RaceSimWorkerParams } from '@/workers/race-sim.worker';

const tabs = [
  { label: 'Assemble', to: '/race-sim' },
  { label: 'Run', to: '/race-sim/run' },
  { label: 'Results', to: '/race-sim/results' },
] as const;

export function RaceSimRoot() {
  const location = useLocation();

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
      usePlaybackStore.getState().loadResults(result);
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
    <RaceSimContext value={ctx}>
      <div className="flex flex-col flex-1 min-w-0">
        <nav className="flex items-center gap-1 border-b border-border px-4">
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

        <div className="flex flex-1 min-w-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </RaceSimContext>
  );
}
