import { useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { useSettingsStore } from '@/store/settings.store';
import { updateDebuffPosition } from '@/modules/simulation/stores/compare.store';
import { setForcedPosition } from '@/modules/simulation/stores/forced-positions.store';
import { useDragSkill } from '../hooks/useDragSkill';
import { useRaceTrackTooltip } from '../hooks/useRaceTrackTooltip';
import { useVisualizationData } from '../hooks/useVisualizationData';
import { trackDescription } from '../labels';
import { RaceTrackContext } from '../context/RaceTrackContext';
import '../components/RaceTrack.css';

const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;

type RaceTrackRootProps = PropsWithChildren<{
  courseid: number;
  chartData: SimulationRun;
  width?: number;
  height?: number;
  xOffset?: number;
  yOffset?: number;
}>;

export const RaceTrackRoot = (props: RaceTrackRootProps) => {
  const {
    courseid,
    children,
    width = BASE_WIDTH,
    height = BASE_HEIGHT,
    xOffset = 0,
    yOffset = 0,
  } = props;

  const chartData = props.chartData ?? initializeSimulationRun();

  const course = useMemo(() => CourseHelpers.getCourse(courseid), [courseid]);
  const { showHp, showLanes, showUma1, showUma2, showThresholds, racedef } = useSettingsStore();

  const { tooltipData, tooltipVisible, rtMouseMove, rtMouseLeave } = useRaceTrackTooltip({
    chartData,
    course,
  });

  const mouseLineRef = useRef<SVGLineElement>(null);
  const mouseTextRef = useRef<SVGTextElement>(null);

  const { skillActivations, rushedIndicators, posKeepLabels } = useVisualizationData({
    chartData,
  });

  const handleSkillDrag = (
    skillId: string,
    umaIndex: number,
    newStart: number,
    _newEnd: number,
    markerType: 'skill' | 'debuff' = 'skill',
    debuffId?: string,
  ) => {
    if (markerType === 'debuff' && debuffId) {
      updateDebuffPosition(umaIndex === 0 ? 'uma1' : 'uma2', debuffId, newStart);
      return;
    }
    if (umaIndex === 0) {
      setForcedPosition('uma1', skillId, newStart);
    } else if (umaIndex === 1) {
      setForcedPosition('uma2', skillId, newStart);
    }
  };

  const { draggedSkill, handleDragStart, handleDragMove, handleDragEnd } = useDragSkill({
    xOffset: 0,
    courseDistance: course.distance,
    viewBoxWidth: width,
    onSkillDrag: handleSkillDrag,
  });

  const courseLabel = trackDescription({ courseid });

  const value = useMemo(
    () => ({
      course,
      courseid,
      chartData,
      courseDistance: course.distance,
      width,
      height,
      showHp,
      showLanes,
      showUma1,
      showUma2,
      showThresholds,
      racedef,
      draggedSkill,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      mouseLineRef,
      mouseTextRef,
      tooltipData,
      tooltipVisible,
      rtMouseMove,
      rtMouseLeave,
      skillActivations,
      rushedIndicators,
      posKeepLabels,
      courseLabel,
      xOffset,
      yOffset,
    }),
    [
      course,
      courseid,
      chartData,
      width,
      height,
      showHp,
      showLanes,
      showUma1,
      showUma2,
      showThresholds,
      racedef,
      draggedSkill,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      tooltipData,
      tooltipVisible,
      rtMouseMove,
      rtMouseLeave,
      skillActivations,
      rushedIndicators,
      posKeepLabels,
      courseLabel,
      xOffset,
      yOffset,
    ],
  );

  return (
    <RaceTrackContext.Provider value={value}>
      <div className="flex flex-col gap-2">{children}</div>
    </RaceTrackContext.Provider>
  );
};
