import { Activity, useEffect, useMemo } from 'react';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { BasinnChart } from './components/bassin-chart/BasinnChart';

import { VelocityLines } from './components/VelocityLines';
import { SimulationResultTabs } from './modules/simulation/tabs/simulation-result-tabs';
import { CreditsModal } from './components/credits-modal';
import { ChangelogModal } from './components/changelog-modal';
import { Button } from './components/ui/button';
import { HeartIcon, ScrollTextIcon } from 'lucide-react';
import { useClickOutside } from './hooks/useClickOutside';
import {
  setPopoverSkill,
  useSimulationStore,
  ChartStats,
  selectSkill,
} from './store/simulation.store';
import {
  setPacer,
  setUma1,
  setUma2,
  useRunnersStore,
} from './store/runners.store';
import { useSettingsStore } from './store/settings.store';
import {
  getSelectedPacemakerIndices,
  useSelectedPacemakerBooleans,
} from './store/settings/actions';
import {
  setIsPacemakerDropdownOpen,
  setShowChangelogModal,
  setShowCreditsModal,
  toggleShowVirtualPacemakerOnGraph,
  useUIStore,
} from './store/ui.store';
import { Mode } from './utils/settings';
import { cn } from './lib/utils';
import { LeftSidebar } from './layout/left-sidebar';
import { ResultButtonGroups } from './modules/simulation/tabs/summary-tab';
import { ThemeToggle } from './components/ui/theme-toggle';
import {
  getSkillDataById,
  getUniqueSkillForByUmaId,
} from './modules/skills/utils';
import { Separator } from './components/ui/separator';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function ChartStatsDisplay({ stats }: { stats: ChartStats }) {
  if (!stats.startTime || !stats.endTime) return null;

  const duration = stats.endTime - stats.startTime;

  return (
    <div className="text-sm text-muted-foreground mb-2">
      Simulated{' '}
      <span className="font-medium text-foreground">{stats.skillCount}</span>{' '}
      skills with{' '}
      <span className="font-medium text-foreground">
        {stats.totalSamples.toLocaleString()}
      </span>{' '}
      total samples in{' '}
      <span className="font-medium text-foreground">
        {formatDuration(duration)}
      </span>
    </div>
  );
}

export function App() {
  const { comparison, skillChart } = useSimulationStore();
  const { posKeepMode, showLanes, showHp, courseId } = useSettingsStore();

  const selectedPacemakerIndices = getSelectedPacemakerIndices();
  const selectedPacemakers = useSelectedPacemakerBooleans();

  const results = comparison?.results ?? [];
  const chartData = comparison?.chartData ?? null;
  const tableData = skillChart?.tableData ?? new Map();
  const chartStats = skillChart?.chartStats ?? {
    startTime: null,
    endTime: null,
    skillCount: 0,
    totalSamples: 0,
  };

  const {
    mode,
    isPacemakerDropdownOpen,
    showVirtualPacemakerOnGraph,
    chartTargetUma,
  } = useUIStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const { uma1, uma2, pacer } = useRunnersStore();

  useEffect(() => {
    const shouldShow =
      posKeepMode === PosKeepMode.Virtual &&
      selectedPacemakerIndices.length > 0;

    if (shouldShow !== showVirtualPacemakerOnGraph) {
      if (shouldShow && !showVirtualPacemakerOnGraph) {
        toggleShowVirtualPacemakerOnGraph();
      } else if (!shouldShow && showVirtualPacemakerOnGraph) {
        toggleShowVirtualPacemakerOnGraph();
      }
    }
  }, [
    posKeepMode,
    selectedPacemakerIndices.length,
    showVirtualPacemakerOnGraph,
  ]);

  const handleSkillSelection = (skillId: string) => {
    selectSkill(skillId);
  };

  const addSkillFromTable = (skillId: string) => {
    // Add skill to the selected target uma
    const targetUma =
      chartTargetUma === 'uma2'
        ? uma2
        : chartTargetUma === 'pacer'
          ? pacer
          : uma1;
    const setTargetUma =
      chartTargetUma === 'uma2'
        ? setUma2
        : chartTargetUma === 'pacer'
          ? setPacer
          : setUma1;
    setTargetUma({ ...targetUma, skills: [...targetUma.skills, skillId] });
  };

  const changeUmaFromTable = (umaId: string) => {
    // Change the selected target uma
    const targetUma =
      chartTargetUma === 'uma2'
        ? uma2
        : chartTargetUma === 'pacer'
          ? pacer
          : uma1;
    const setTargetUma =
      chartTargetUma === 'uma2'
        ? setUma2
        : chartTargetUma === 'pacer'
          ? setPacer
          : setUma1;
    const outfitId = umaId;

    const newSkills = targetUma.skills.filter(
      (skillId) => getSkillDataById(skillId).rarity < 3,
    );

    if (outfitId) {
      newSkills.push(getUniqueSkillForByUmaId(outfitId));
    }

    setTargetUma({ ...targetUma, outfitId: outfitId, skills: newSkills });
  };

  const showPopover = (skillId: string) => {
    setPopoverSkill(skillId);
  };

  useClickOutside(document.body, (_) => setPopoverSkill(''));
  useClickOutside(
    document.body,
    (event) => {
      if (
        isPacemakerDropdownOpen &&
        !(event.target as HTMLElement).closest('.pacemaker-combobox')
      ) {
        setIsPacemakerDropdownOpen(false);
      }
    },
    [isPacemakerDropdownOpen],
  );

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
        <LeftSidebar />

        <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
          <div
            id="topPane"
            className={cn('flex flex-col gap-4 w-full relative')}
          >
            <RaceTrack
              courseid={courseId}
              xOffset={20}
              yOffset={15}
              yExtra={20}
              chartData={chartData}
            >
              <VelocityLines
                data={chartData}
                courseDistance={course.distance}
                xOffset={20}
                showHp={showHp}
                showLanes={showLanes}
                horseLane={course.horseLane}
                showVirtualPacemaker={
                  showVirtualPacemakerOnGraph &&
                  posKeepMode === PosKeepMode.Virtual
                }
                selectedPacemakers={selectedPacemakers}
              />
            </RaceTrack>
          </div>

          <Separator />

          {/* Compare Results between two runners */}
          {mode === Mode.Compare && results.length > 0 && (
            <ResultButtonGroups />
          )}

          <Activity mode={mode === Mode.Compare ? 'visible' : 'hidden'}>
            <SimulationResultTabs />
          </Activity>

          {/* Skills Chart (includes Uniques)*/}
          {mode == Mode.Chart && tableData.size > 0 && (
            <div className="grid grid-cols-1 gap-4">
              <ChartStatsDisplay stats={chartStats} />
              <BasinnChart
                data={Array.from(tableData.values())}
                hiddenSkills={
                  chartTargetUma === 'uma2'
                    ? uma2.skills
                    : chartTargetUma === 'pacer'
                      ? pacer.skills
                      : uma1.skills
                }
                onSelectionChange={handleSkillSelection}
                onAddSkill={addSkillFromTable}
                onChangeUma={changeUmaFromTable}
                onInfoClick={showPopover}
              />
            </div>
          )}

          {/* Unique Skills Chart */}
          {mode == Mode.UniquesChart && tableData.size > 0 && (
            <div className="grid grid-cols-1 gap-4">
              <ChartStatsDisplay stats={chartStats} />
              <BasinnChart
                data={Array.from(tableData.values())}
                hiddenSkills={[]}
                onSelectionChange={handleSkillSelection}
                onAddSkill={addSkillFromTable}
                onChangeUma={changeUmaFromTable}
                onInfoClick={showPopover}
                showUmaIcons
              />
            </div>
          )}
        </div>
      </main>

      <CreditsModal />
      <ChangelogModal />
    </div>
  );
}
