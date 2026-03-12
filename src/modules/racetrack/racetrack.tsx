import { useCallback, useMemo, useRef } from 'react';
import { initializeSimulationRun, SimulationRun } from '../simulation/compare.types';
import { getActiveDragPreview, useDragSkill } from './hooks/useDragSkill';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { useSettingsStore } from '@/store/settings.store';
import { useVisualizationData } from './hooks/useVisualizationData';
import { updateDebuffPosition } from '../simulation/stores/compare.store';
import { setForcedPosition } from '../simulation/stores/forced-positions.store';

import { VelocityPaths } from './overlays/velocity-paths';
import { ThresholdMarkers } from './overlays/threshold-markers';
import { PosKeepLabels } from './overlays/poskeep-labels';
import { RaceTrackTooltip } from './overlays/racetrack-tooltip';
import type { RaceTrackTooltipHandle } from './overlays/racetrack-tooltip';
import { MouseLine } from './overlays/mouse-line';
import { TrackLegend } from './chrome/track-legend';
import { TrackControls } from './chrome/track-controls';
import { YAxis } from './axes/y-axis';
import { XAxis } from './axes/x-axis';
import { SectionNumbersBar } from './layers/section-numbers';
import { SectionTypesBar } from './layers/section-bar';
import { SlopeLabelBar } from './layers/slope-label-bar';
import { SlopeVisualization } from './layers/slope-visualization';
import { PhaseBar } from './layers/phase-bar';
import { RaceTrackDimensions } from './types';
import { UmaSkillSection } from './skills/uma-skill-row';

import './components/RaceTrack.css';

export type RaceTrackProps = {
  courseId: number;
  chartData?: SimulationRun | null;
};

export const RaceTrack = (props: RaceTrackProps) => {
  const { courseId, chartData: incomingChartData } = props;

  const chartData = useMemo(() => {
    return incomingChartData ?? initializeSimulationRun();
  }, [incomingChartData]);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);
  const { showUma1, showUma2 } = useSettingsStore();

  const mouseLineRef = useRef<SVGLineElement>(null);
  const mouseTextRef = useRef<SVGTextElement>(null);
  const tooltipRef = useRef<RaceTrackTooltipHandle>(null);

  const { skillActivations, rushedIndicators, debuffIndicators, posKeepLabels } =
    useVisualizationData({
      chartData,
    });

  const handleSkillDrag = useCallback(
    (
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
    },
    [],
  );

  const { draggedSkill, handleDragStart, handleDragMove, handleDragEnd } = useDragSkill({
    xOffset: RaceTrackDimensions.xOffset,
    courseDistance: course.distance,
    viewBoxWidth: RaceTrackDimensions.RenderWidth,
    onSkillDrag: handleSkillDrag,
  });

  const doPointerMove: React.PointerEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      const svg = e.currentTarget;

      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const point = svg.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const svgPoint = point.matrixTransform(ctm.inverse());

      const cursorX = svgPoint.x - RaceTrackDimensions.xOffset;
      const isWithinRaceBounds = cursorX > 0 && cursorX <= RaceTrackDimensions.RenderWidth;
      if (draggedSkill) {
        handleDragMove(e);
      }
      if (!isWithinRaceBounds && !draggedSkill) return;

      let x = cursorX;
      if (draggedSkill) {
        const preview = getActiveDragPreview();
        x =
          preview != null
            ? (preview.start / course.distance) * RaceTrackDimensions.RenderWidth
            : Math.max(0, Math.min(RaceTrackDimensions.RenderWidth, cursorX));
      }

      const y = svgPoint.y;

      if (mouseLineRef.current) {
        mouseLineRef.current.setAttribute('x1', x.toString());
        mouseLineRef.current.setAttribute('x2', x.toString());
      }

      if (mouseTextRef.current) {
        mouseTextRef.current.setAttribute(
          'x',
          (x > RaceTrackDimensions.RenderWidth - 45 ? x - 45 : x + 5).toString(),
        );
        mouseTextRef.current.setAttribute('y', y.toString());
        mouseTextRef.current.textContent =
          Math.round((x / RaceTrackDimensions.RenderWidth) * course.distance) + 'm';
      }

      tooltipRef.current?.updateFromPositionRatio(x / RaceTrackDimensions.RenderWidth);
    },
    [handleDragMove, draggedSkill, course.distance],
  );

  const doPointerLeave = useCallback(() => {
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', '-5');
      mouseLineRef.current.setAttribute('x2', '-5');
    }

    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute('x', '-5');
      mouseTextRef.current.setAttribute('y', '-5');
      mouseTextRef.current.textContent = '';
    }
    tooltipRef.current?.hide();
    handleDragEnd();
  }, [handleDragEnd]);

  return (
    <div className="flex flex-col gap-2 bg-card rounded-md border px-1 py-2 max-w-[1600px] mx-auto w-full">
      <TrackLegend />
      <div className="overflow-x-auto border-t border-b">
        <div className="min-w-[1200px]">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${RaceTrackDimensions.ViewWidth} ${RaceTrackDimensions.ViewHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="racetrackView w-full flex-1"
            data-courseid={courseId}
            onPointerMove={doPointerMove}
            onPointerLeave={doPointerLeave}
            onPointerUp={handleDragEnd}
          >
            {/* Background for Slope */}
            <SlopeVisualization course={course} />

            {/* Bars */}
            <SlopeLabelBar course={course} />
            <SectionTypesBar course={course} />
            <PhaseBar course={course} />
            <SectionNumbersBar />

            <YAxis chartData={chartData} />
            <XAxis courseDistance={course.distance} />

            <VelocityPaths chartData={chartData} course={course} />
            <ThresholdMarkers courseDistance={course.distance} />
            <PosKeepLabels posKeepLabels={posKeepLabels} />
            <MouseLine mouseLineRef={mouseLineRef} mouseTextRef={mouseTextRef} />
            <RaceTrackTooltip ref={tooltipRef} chartData={chartData} course={course} />

            <svg
              x={RaceTrackDimensions.xOffset}
              y={RaceTrackDimensions.SectionNumbersBarY}
              width={RaceTrackDimensions.RenderWidth}
              height={RaceTrackDimensions.UmaSkillSectionHeight}
              overflow="visible"
            >
              <UmaSkillSection
                course={course}
                showUma1={showUma1}
                showUma2={showUma2}
                skillActivations={skillActivations}
                rushedIndicators={rushedIndicators}
                debuffIndicators={debuffIndicators}
                onDragStart={handleDragStart}
              />
            </svg>
          </svg>
        </div>
      </div>
      <TrackControls />
    </div>
  );
};
