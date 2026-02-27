import { Activity, Fragment, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import type { RegionData } from '@/modules/racetrack/hooks/useVisualizationData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { useVisualizationData } from '@/modules/racetrack/hooks/useVisualizationData';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import {
  toggleShowHp,
  toggleShowLanes,
  toggleShowThresholds,
  useSettingsStore,
} from '@/store/settings.store';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegionDisplayType } from '@/modules/racetrack/types';
import { SkillMarker } from '@/modules/racetrack/components/skill-marker';
import { useRaceTrackTooltip } from '@/modules/racetrack/hooks/useRaceTrackTooltip';
import { trackDescription } from '@/modules/racetrack/labels';
import { SlopeVisualization } from '@/modules/racetrack/components/slope-visualization';
import { SlopeLabelBar } from '@/modules/racetrack/components/slope-label-bar';
import { SectionBar } from '@/modules/racetrack/components/section-bar';
import { PhaseBar } from '@/modules/racetrack/components/phase-bar';
import { SectionNumbers } from '@/modules/racetrack/components/section-numbers';
import { RaceTrackTooltip } from '@/modules/racetrack/components/racetrack-tooltip';
import {
  ThresholdMarker,
  TrackConditions,
  TrackName,
} from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';

// Helper function for efficient rung collision detection
const findAvailableRung = (
  start: number,
  end: number,
  rungs: Array<Array<{ start: number; end: number }>>,
): number => {
  for (let i = 0; i < 10; i++) {
    const hasOverlap = rungs[i].some((b) => !(end <= b.start || start >= b.end));
    if (!hasOverlap) return i;
  }
  return 0;
};

type RegionSegmentProps = {
  allRegions: Array<RegionData>;
  course: CourseData;
};

const RegionSegment = (props: RegionSegmentProps) => {
  const { allRegions, course } = props;

  return allRegions.reduce(
    (state, desc, descIndex) => {
      // Only show uma1 (index 0) - skip uma2 and pacer
      if (desc.umaIndex !== 0) return state;

      if (desc.type === RegionDisplayType.Immediate && desc.regions.length > 0) {
        let x = (desc.regions[0].start / course.distance) * 100;

        // Use percentage-based offset instead of width-dependent calculation
        const COLLISION_OFFSET = 0.3; // 0.3% of track
        while (state.seen.has(x)) {
          x += COLLISION_OFFSET;
        }

        state.seen.add(x);
        state.elem.push(
          <line
            key={`immediate-${descIndex}`}
            x1={`${x}%`}
            y1="0"
            x2={`${x}%`}
            y2="100%"
            stroke={desc.color.stroke}
            strokeWidth={x === 0 ? 4 : 2}
          />,
        );

        return state;
      }

      if (desc.type === RegionDisplayType.Textbox) {
        const markers = desc.regions.map((r, rIndex) => {
          const start = r.start;
          const end = r.end;

          const x = (start / course.distance) * 100;
          const w = ((end - start) / course.distance) * 100;

          const rungIndex = findAvailableRung(start, end, state.rungs);
          state.rungs[rungIndex % 10].push({ start, end });
          const y = 90 - 10 * rungIndex;

          return (
            <SkillMarker
              key={`skill-${descIndex}-${rIndex}-${desc.skillId ?? 'none'}`}
              x={x}
              y={y}
              width={w}
              color={desc.color}
              text={desc.text}
              skillId={desc.skillId}
              umaIndex={desc.umaIndex}
              onDragStart={() => {}} // Disabled for skill planner
            />
          );
        });

        state.elem.push(
          <Fragment key={`textbox-${descIndex}-${desc.skillId ?? 'none'}`}>{markers}</Fragment>,
        );

        return state;
      }

      state.elem.push(
        <Fragment key={`region-${descIndex}`}>
          {desc.regions.map((r, i) => (
            <rect
              key={`rect-${i}`}
              x={`${(r.start / course.distance) * 100}%`}
              y={`${100 - (desc.height ?? 0)}%`}
              width={`${((r.end - r.start) / course.distance) * 100}%`}
              height={`${desc.height}%`}
              fill={desc.color.fill}
              stroke={desc.color.stroke}
            />
          ))}
        </Fragment>,
      );

      return state;
    },
    {
      seen: new Set<number>(),
      rungs: Array.from({ length: 10 }, () => [] as Array<{ start: number; end: number }>),
      elem: [] as Array<React.ReactElement>,
    },
  ).elem;
};

type SkillPlannerRaceTrackProps = {
  chartData: SimulationRun;
};

// Base dimensions for aspect ratio calculation
const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;
const X_OFFSET = 0;
const Y_OFFSET = 0;
const X_EXTRA = 0;
const Y_EXTRA = 0;

export const SkillPlannerRaceTrack: React.FC<SkillPlannerRaceTrackProps> = (props) => {
  const { chartData } = props;

  const { courseId, showHp, showLanes, showThresholds, racedef } = useSettingsStore(
    useShallow((state) => ({
      courseId: state.courseId,
      showHp: state.showHp,
      showLanes: state.showLanes,
      showThresholds: state.showThresholds,
      racedef: state.racedef,
    })),
  );

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const { tooltipData, tooltipVisible, rtMouseMove, rtMouseLeave } = useRaceTrackTooltip({
    chartData: chartData ?? initializeSimulationRun(),
    course,
  });

  // Refs for mouseover elements
  const mouseLineRef = useRef<SVGLineElement>(null);
  const mouseTextRef = useRef<SVGTextElement>(null);

  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;

  const { skillActivations, rushedIndicators, posKeepLabels } = useVisualizationData({ chartData });

  const allRegions = useMemo(() => {
    return [...skillActivations, ...rushedIndicators];
  }, [skillActivations, rushedIndicators]);

  const doMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const svg = e.currentTarget;

    // Convert client coordinates to SVG coordinate space
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(ctm.inverse());

    // svgPoint is now in viewBox coordinate space
    if (svgPoint.x < X_OFFSET) return;

    const x = svgPoint.x - X_OFFSET;
    const y = svgPoint.y - Y_OFFSET;

    // Use refs instead of querySelector
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', x.toString());
      mouseLineRef.current.setAttribute('x2', x.toString());
    }
    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute('x', (x > width - 45 ? x - 45 : x + 5).toString());
      mouseTextRef.current.setAttribute('y', y.toString());
      mouseTextRef.current.textContent = Math.round((x / width) * course.distance) + 'm';
    }

    rtMouseMove(x / width);
  };

  const doMouseLeave = () => {
    // Use refs instead of querySelector
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', '-5');
      mouseLineRef.current.setAttribute('x2', '-5');
    }

    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute('x', '-5');
      mouseTextRef.current.setAttribute('y', '-5');
      mouseTextRef.current.textContent = '';
    }

    rtMouseLeave();
  };

  const courseLabel = trackDescription({ courseid: courseId });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <TrackName course={course} courseLabel={courseLabel} />
        <TrackConditions racedef={racedef} />
      </div>

      <div className="flex justify-center">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width + X_OFFSET + X_EXTRA} ${height + Y_OFFSET + Y_EXTRA}`}
          preserveAspectRatio="xMidYMid meet"
          className="racetrackView w-full"
          style={{ maxWidth: `1200px` }}
          data-courseid={courseId}
          onMouseMove={doMouseMove}
          onMouseLeave={doMouseLeave}
        >
          <svg x={X_OFFSET} y={Y_OFFSET} width={width} height={height}>
            <SlopeVisualization slopes={course.slopes} distance={course.distance} />

            <SlopeLabelBar slopes={course.slopes} distance={course.distance} />

            <SectionBar
              straights={course.straights}
              corners={course.corners}
              distance={course.distance}
            />

            <PhaseBar distance={course.distance} />
            <SectionNumbers />

            <RegionSegment allRegions={allRegions} course={course} />

            {posKeepLabels &&
              posKeepLabels.map((label, index) => {
                // Only show uma1 (index 0)
                if (label.umaIndex !== 0) return null;

                if (label.x == null || label.width == null || label.yOffset == null) return null;

                return (
                  <g key={index} className="poskeep-label">
                    <text
                      x={label.x + label.width / 2}
                      y={5 + label.yOffset}
                      fill={label.color.stroke}
                      fontSize="10px"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="hanging"
                    >
                      {label.text}
                    </text>

                    <line
                      x1={label.x}
                      y1={5 + label.yOffset + 12}
                      x2={label.x + label.width}
                      y2={5 + label.yOffset + 12}
                      stroke={label.color.stroke}
                      strokeWidth="2"
                    />
                  </g>
                );
              })}

            <line
              ref={mouseLineRef}
              className="mouseoverLine"
              x1="-5"
              y1="0"
              x2="-5"
              y2="100%"
              stroke="rgb(121,64,22)"
              strokeWidth="2"
              pointerEvents="none"
            />

            <text
              ref={mouseTextRef}
              className="mouseoverText"
              x="-5"
              y="-5"
              fill="rgb(121,64,22)"
              pointerEvents="none"
            ></text>
          </svg>

          <RaceTrackTooltip
            data={tooltipData}
            visible={tooltipVisible}
            position={{ xOffset: X_OFFSET, yOffset: Y_OFFSET }}
          />

          <Activity mode={showThresholds ? 'visible' : 'hidden'}>
            <ThresholdMarker
              threshold={course.distance / 2}
              text={`Halfway (${course.distance / 2}m)`}
              distance={course.distance}
              xOffset={X_OFFSET}
              yOffset={Y_OFFSET}
              yExtra={-10}
              width={width}
              height={height}
              strokeColor="var(--color-green-400)"
            />

            <ThresholdMarker
              threshold={777}
              distance={course.distance}
              xOffset={X_OFFSET}
              yOffset={Y_OFFSET}
              width={width}
              height={height}
              strokeColor="var(--color-amber-400)"
            />

            <ThresholdMarker
              threshold={200}
              distance={course.distance}
              xOffset={X_OFFSET}
              yOffset={Y_OFFSET}
              width={width}
              height={height}
              strokeColor="var(--color-amber-400)"
            />
          </Activity>
        </svg>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-secondary px-4 py-2 rounded-md">
        <div className="flex items-center gap-2">
          <Checkbox id="showhp" checked={showHp} onCheckedChange={toggleShowHp} />
          <Label htmlFor="showhp" className="text-sm font-normal cursor-pointer">
            Show HP
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="showlanes" checked={showLanes} onCheckedChange={toggleShowLanes} />
          <Label htmlFor="showlanes" className="text-sm font-normal cursor-pointer">
            Show Lanes
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="showthresholds"
            checked={showThresholds}
            onCheckedChange={toggleShowThresholds}
          />
          <Label htmlFor="showthresholds" className="text-sm font-normal cursor-pointer">
            Show thresholds
          </Label>
        </div>
      </div>
    </div>
  );
};
