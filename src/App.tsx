import { useEffect, useMemo } from 'react';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { BasinnChart } from './components/bassin-chart/BasinnChart';

import { VelocityLines } from './components/VelocityLines';
import { SimulationResultTabs } from './modules/simulation/tabs/simulation-result-tabs';
import { WitVarianceModal } from './components/wit-variance/settings-modal';
import { useClickOutside } from './hooks/useClickOutside';
import { useRaceTrackTooltip } from './modules/racetrack/hooks/useRaceTrackTooltip';
import { setPopoverSkill, useChartStore } from './store/chart.store';
import { useRaceStore } from './store/race/store';
import { setUma1, useRunnersStore } from './store/runners.store';
import { useSettingsStore } from './store/settings.store';
import {
  getSelectedPacemakerIndices,
  useSelectedPacemakerBooleans,
} from './store/settings/actions';
import {
  setIsPacemakerDropdownOpen,
  toggleShowVirtualPacemakerOnGraph,
  useUIStore,
} from './store/ui.store';
import { Mode } from './utils/settings';
import { cn } from './lib/utils';
import { LeftSidebar } from './layout/left-sidebar';
import { RunButtonRow } from './components/run-pane';
import { ResultButtonGroups } from './modules/simulation/tabs/summary-tab';
import { ThemeToggle } from './components/ui/theme-toggle';

export function App() {
  const { tableData } = useChartStore();
  const { posKeepMode, showLanes, showHp, courseId } = useSettingsStore();

  const selectedPacemakerIndices = getSelectedPacemakerIndices();

  const selectedPacemakers = useSelectedPacemakerBooleans();

  const { results, chartData } = useRaceStore();
  const { mode, isPacemakerDropdownOpen, showVirtualPacemakerOnGraph } =
    useUIStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const { uma1 } = useRunnersStore();

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

  const basinnChartSelection = (skillId: string) => {
    const results = tableData.get(skillId);

    if (results.runData) {
      useRaceStore.setState({ results: results.results });
    }
  };

  const addSkillFromTable = (skillId: string) => {
    window.dispatchEvent(
      new CustomEvent('addSkillFromTable', { detail: { skillId } }),
    );
    setUma1({ ...uma1, skills: [...uma1.skills, skillId] });
  };

  const showPopover = (skillId: string) => {
    window.dispatchEvent(
      new CustomEvent('showPopover', { detail: { skillId } }),
    );
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

  const { rtMouseMove, rtMouseLeave } = useRaceTrackTooltip({
    chartData,
    course,
  });

  return (
    <div className="flex flex-col flex-1">
      <div className="flex py-2 justify-between items-center border-b px-4">
        <div></div>
        <RunButtonRow />
        <div>
          <ThemeToggle />
        </div>
      </div>

      <main className="flex">
        <LeftSidebar />

        <div className="flex flex-col flex-1 p-4 gap-4">
          <div id="topPane" className={cn('flex flex-col gap-4 w-full')}>
            <RaceTrack
              courseid={courseId}
              xOffset={20}
              yOffset={15}
              yExtra={20}
              onMouseMove={rtMouseMove}
              onMouseLeave={rtMouseLeave}
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

              <g id="rtMouseOverBox" style={{ display: 'none' }}>
                <text
                  id="rtV1"
                  x="25"
                  y="10"
                  fill="#2a77c5"
                  fontSize="10px"
                ></text>
                <text
                  id="rtV2"
                  x="25"
                  y="20"
                  fill="#c52a2a"
                  fontSize="10px"
                ></text>
                <text
                  id="rtVp"
                  x="25"
                  y="30"
                  fill="#22c55e"
                  fontSize="10px"
                ></text>
                <text
                  id="pd1"
                  x="25"
                  y="10"
                  fill="#2a77c5"
                  fontSize="10px"
                ></text>
                <text
                  id="pd2"
                  x="25"
                  y="20"
                  fill="#c52a2a"
                  fontSize="10px"
                ></text>
              </g>
            </RaceTrack>
          </div>

          {/* Compare Results between two runners */}
          {mode === Mode.Compare && results.length > 0 && (
            <>
              <ResultButtonGroups />
              <SimulationResultTabs />
            </>
          )}

          {/* Skills Chart (includes Uniques)*/}
          {mode == Mode.Chart && tableData.size > 0 && (
            <div className="grid grid-cols-1 gap-4">
              <BasinnChart
                data={Array.from(tableData.values())}
                hiddenSkills={uma1.skills}
                onSelectionChange={basinnChartSelection}
                onDblClickRow={addSkillFromTable}
                onInfoClick={showPopover}
              />
            </div>
          )}

          {/* Unique Skills Chart */}
          {mode == Mode.UniquesChart && tableData.size > 0 && (
            <div className="grid grid-cols-1 gap-4">
              <BasinnChart
                data={Array.from(tableData.values())}
                hiddenSkills={[]}
                onSelectionChange={basinnChartSelection}
                onDblClickRow={addSkillFromTable}
                onInfoClick={showPopover}
                showUmaIcons
              />
            </div>
          )}
        </div>
      </main>

      <WitVarianceModal />
    </div>
  );
}
