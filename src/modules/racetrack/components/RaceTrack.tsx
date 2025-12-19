import { RacePresets } from '@/components/race-presets';
import { GroundSelect } from '@/components/race-settings/GroundSelect';
import {
  SeasonIcon,
  SeasonSelect,
} from '@/components/race-settings/SeasonSelect';
import { TimeOfDaySelect } from '@/components/race-settings/TimeOfDaySelect';
import {
  WeatherIcon,
  WeatherSelect,
} from '@/components/race-settings/WeatherSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import i18n from '@/i18n';
import { CourseData } from '@/modules/simulation/lib/courses/types';
import {
  updateForcedSkillPosition,
  useRunnersStore,
} from '@/store/runners.store';
import {
  toggleShowHp,
  toggleShowLanes,
  toggleShowThresholds,
  toggleShowUma1,
  toggleShowUma2,
  useSettingsStore,
} from '@/store/settings.store';
import {
  initializeSimulationRun,
  SimulationRun,
} from '@simulation/compare.types';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { Activity, Fragment, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useDragSkill } from '../hooks/useDragSkill';
import { useRaceTrackTooltip } from '../hooks/useRaceTrackTooltip';
import {
  RegionData,
  useVisualizationData,
} from '../hooks/useVisualizationData';
import { trackDescription } from '../labels';
import { RegionDisplayType } from '../types';
import { PhaseBar } from './phase-bar';
import { RaceTrackTooltip } from './racetrack-tooltip';
import './RaceTrack.css';
import { SectionBar } from './section-bar';
import { SectionNumbers } from './section-numbers';
import { SkillMarker } from './skill-marker';
import { SlopeLabelBar } from './slope-label-bar';
import { SlopeVisualization } from './slope-visualization';
import { TrackSelect } from './track-select';

// Helper function for efficient rung collision detection
const findAvailableRung = (
  start: number,
  end: number,
  rungs: Array<Array<{ start: number; end: number }>>,
): number => {
  for (let i = 0; i < 10; i++) {
    const hasOverlap = rungs[i].some(
      (b) => !(end <= b.start || start >= b.end),
    );
    if (!hasOverlap) return i;
  }
  return 0;
};

type RegionSegmentProps = {
  allRegions: RegionData[];
  course: CourseData;
  onDragStart: (
    e: React.MouseEvent,
    skillId: string,
    umaIndex: number,
    start: number,
    end: number,
  ) => void;
};

const RegionSegment = (props: RegionSegmentProps) => {
  const { allRegions, course, onDragStart } = props;

  const { showUma1, showUma2 } = useSettingsStore(
    useShallow((state) => ({
      showUma1: state.showUma1,
      showUma2: state.showUma2,
    })),
  );

  const { uma1, uma2, pacer } = useRunnersStore(
    useShallow((state) => ({
      uma1: state.uma1,
      uma2: state.uma2,
      pacer: state.pacer,
    })),
  );

  // Extract only forcedSkillPositions to prevent recomputation when other runner properties change
  const forcedPositions = useMemo(
    () => ({
      uma1: uma1?.forcedSkillPositions ?? {},
      uma2: uma2?.forcedSkillPositions ?? {},
      pacer: pacer?.forcedSkillPositions ?? {},
    }),
    [
      uma1?.forcedSkillPositions,
      uma2?.forcedSkillPositions,
      pacer?.forcedSkillPositions,
    ],
  );

  return allRegions.reduce(
    (state, desc, descIndex) => {
      if (desc.umaIndex === 0 && !showUma1) return state;
      if (desc.umaIndex === 1 && !showUma2) return state;

      if (
        desc.type === RegionDisplayType.Immediate &&
        desc.regions.length > 0
      ) {
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
          // Check if this skill has a forced position
          let start = r.start;
          let end = r.end;

          if (desc.skillId && desc.umaIndex !== undefined) {
            const positions =
              desc.umaIndex === 0
                ? forcedPositions.uma1
                : desc.umaIndex === 1
                  ? forcedPositions.uma2
                  : desc.umaIndex === 2
                    ? forcedPositions.pacer
                    : null;

            const forcedPos = positions?.[desc.skillId];
            if (forcedPos !== undefined) {
              start = forcedPos;
              end = forcedPos + (r.end - r.start);
            }
          }

          const x = (start / course.distance) * 100;
          const w = ((end - start) / course.distance) * 100;

          const rungIndex = findAvailableRung(start, end, state.rungs);
          state.rungs[rungIndex % 10].push({ start, end });
          const y = 90 - 10 * rungIndex;

          const handleOnDragStart = (e: React.MouseEvent) => {
            if (!desc.skillId) return;
            if (desc.umaIndex === undefined) return;

            onDragStart(e, desc.skillId, desc.umaIndex, start, end);
          };

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
              onDragStart={handleOnDragStart}
            />
          );
        });

        state.elem.push(
          <Fragment key={`textbox-${descIndex}-${desc.skillId ?? 'none'}`}>
            {markers}
          </Fragment>,
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
      rungs: Array.from(
        { length: 10 },
        () => [] as { start: number; end: number }[],
      ),
      elem: [] as React.ReactElement[],
    },
  ).elem;
};

type RaceTrackProps = {
  // Course data
  courseid: number;
  chartData: SimulationRun;

  // Layout
  xOffset: number;
  yOffset: number;
  xExtra?: number;
  yExtra?: number;
  width?: number;
  height?: number;
};

// Base dimensions for aspect ratio calculation
const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;

export const RaceTrack: React.FC<React.PropsWithChildren<RaceTrackProps>> = (
  props,
) => {
  const { chartData } = props;

  const course = useMemo(
    () => CourseHelpers.getCourse(props.courseid),
    [props.courseid],
  );

  const { showHp, showLanes, showUma1, showUma2, showThresholds, racedef } =
    useSettingsStore();

  const { tooltipData, tooltipVisible, rtMouseMove, rtMouseLeave } =
    useRaceTrackTooltip({
      chartData: chartData ?? initializeSimulationRun(),
      course,
    });

  // Refs for mouseover elements (replacing querySelector)
  const mouseLineRef = useRef<SVGLineElement>(null);
  const mouseTextRef = useRef<SVGTextElement>(null);

  const xOffset = props.xOffset ?? 0;
  const yOffset = props.yOffset ?? 0;
  const xExtra = props.xExtra ?? 0;
  const yExtra = props.yExtra ?? 0;

  const width = props.width ?? BASE_WIDTH;
  const height = props.height ?? BASE_HEIGHT;

  const { skillActivations, rushedIndicators, posKeepLabels } =
    useVisualizationData({ chartData });

  const allRegions = useMemo(() => {
    return [...skillActivations, ...rushedIndicators];
  }, [skillActivations, rushedIndicators]);

  const handleSkillDrag = (
    skillId: number,
    umaIndex: number,
    newStart: number,
    _newEnd: number,
  ) => {
    if (umaIndex === 0) {
      updateForcedSkillPosition('uma1', skillId, newStart);
    } else if (umaIndex === 1) {
      updateForcedSkillPosition('uma2', skillId, newStart);
    } else if (umaIndex === 2) {
      updateForcedSkillPosition('pacer', skillId, newStart);
    }
  };

  // Use custom hook for drag functionality
  const { draggedSkill, handleDragStart, handleDragMove, handleDragEnd } =
    useDragSkill({
      xOffset,
      courseDistance: course.distance,
      viewBoxWidth: width + xOffset + xExtra,
      onSkillDrag: handleSkillDrag,
    });

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
    if (svgPoint.x < xOffset) return;

    const x = svgPoint.x - xOffset;
    const y = svgPoint.y - yOffset;

    // Use refs instead of querySelector
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', x.toString());
      mouseLineRef.current.setAttribute('x2', x.toString());
    }
    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute(
        'x',
        (x > width - 45 ? x - 45 : x + 5).toString(),
      );
      mouseTextRef.current.setAttribute('y', y.toString());
      mouseTextRef.current.textContent =
        Math.round((x / width) * course.distance) + 'm';
    }

    rtMouseMove(x / width);

    // Handle drag via custom hook
    if (draggedSkill) {
      handleDragMove(e);
    }
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
    handleDragEnd();
  };

  const courseLabel = trackDescription({ courseid: props.courseid });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="text-xl text-foreground font-bold">
            {i18n.t(`tracknames.${course.raceTrackId}`)} {courseLabel}
          </div>
        </div>

        <div className="flex">
          <div className="flex items-center gap-2">
            <SeasonIcon season={racedef.season} className="w-6 h-6" />
            <WeatherIcon weather={racedef.weather} className="w-6 h-6" />
            <div className="font-bold">
              {i18n.t(`racetrack.ground.${racedef.ground}`)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width + xOffset + xExtra} ${height + yOffset + yExtra}`}
          preserveAspectRatio="xMidYMid meet"
          className="racetrackView w-full"
          style={{ maxWidth: `1200px` }} // Optional: cap max size
          data-courseid={props.courseid}
          onMouseMove={doMouseMove}
          onMouseLeave={doMouseLeave}
          onMouseUp={handleDragEnd}
        >
          <svg x={xOffset} y={yOffset} width={width} height={height}>
            <SlopeVisualization
              slopes={course.slopes}
              distance={course.distance}
            />

            <SlopeLabelBar slopes={course.slopes} distance={course.distance} />

            <SectionBar
              straights={course.straights}
              corners={course.corners}
              distance={course.distance}
            />

            <PhaseBar distance={course.distance} />
            <SectionNumbers />

            <RegionSegment
              allRegions={allRegions}
              course={course}
              onDragStart={handleDragStart}
            />

            {posKeepLabels &&
              posKeepLabels.map((label, index) => {
                if (label.umaIndex === 0 && !showUma1) return null;
                if (label.umaIndex === 1 && !showUma2) return null;

                if (
                  label.x == null ||
                  label.width == null ||
                  label.yOffset == null
                )
                  return null;

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
            position={{ xOffset, yOffset }}
          />

          <Activity mode={showThresholds ? 'visible' : 'hidden'}>
            <ThresholdMarker
              threshold={course.distance / 2}
              text={`Halfway (${course.distance / 2}m)`}
              distance={course.distance}
              xOffset={xOffset}
              yOffset={yOffset}
              yExtra={-10}
              width={width}
              height={height}
              strokeColor="var(--color-green-400)"
            />

            <ThresholdMarker
              threshold={777}
              distance={course.distance}
              xOffset={xOffset}
              yOffset={yOffset}
              width={width}
              height={height}
              strokeColor="var(--color-amber-400)"
            />

            <ThresholdMarker
              threshold={200}
              distance={course.distance}
              xOffset={xOffset}
              yOffset={yOffset}
              width={width}
              height={height}
              strokeColor="var(--color-amber-400)"
            />
          </Activity>

          {props.children}
        </svg>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 bg-secondary px-4 py-2 rounded-md">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <RacePresets />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Track</Label>
            <TrackSelect />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Time of Day</Label>
            <TimeOfDaySelect />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Season</Label>
            <SeasonSelect />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Weather</Label>
            <WeatherSelect />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Ground</Label>
            <GroundSelect />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-secondary px-4 py-2 rounded-md">
        <div className="flex items-center gap-2">
          <Checkbox
            id="showhp"
            checked={showHp}
            onCheckedChange={toggleShowHp}
          />
          <Label
            htmlFor="showhp"
            className="text-sm font-normal cursor-pointer"
          >
            Show HP
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="showlanes"
            checked={showLanes}
            onCheckedChange={toggleShowLanes}
          />
          <Label
            htmlFor="showlanes"
            className="text-sm font-normal cursor-pointer"
          >
            Show Lanes
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="showthresholds"
            checked={showThresholds}
            onCheckedChange={toggleShowThresholds}
          />
          <Label
            htmlFor="showthresholds"
            className="text-sm font-normal cursor-pointer"
          >
            Show thresholds
          </Label>
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-uma1"
            checked={showUma1}
            onCheckedChange={toggleShowUma1}
          />
          <Label
            htmlFor="show-uma1"
            className="text-sm font-normal cursor-pointer"
          >
            Show Uma 1
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-uma2"
            checked={showUma2}
            onCheckedChange={toggleShowUma2}
          />
          <Label
            htmlFor="show-uma2"
            className="text-sm font-normal cursor-pointer"
          >
            Show Uma 2
          </Label>
        </div>
      </div>
    </div>
  );
};

type ThresholdMarkerProps = {
  threshold: number;
  text?: string;
  distance: number;
  xOffset: number;
  yOffset: number;
  yExtra?: number;
  width: number;
  height: number;
  strokeColor?: string;
};

const ThresholdMarker = (props: ThresholdMarkerProps) => {
  const {
    threshold,
    text,
    distance,
    xOffset,
    yOffset,
    yExtra = 0,
    width,
    height,
    strokeColor = 'rgb(239, 68, 68)',
  } = props;
  return (
    <g className="threshold-marker">
      {/* Dashed vertical line */}
      <line
        x1={xOffset + ((distance - threshold) / distance) * width}
        y1={yOffset - 20 - yExtra}
        x2={xOffset + ((distance - threshold) / distance) * width}
        y2={yOffset + height}
        stroke={strokeColor}
        strokeWidth="1"
        strokeDasharray="5,5"
      />

      {/* Label text */}
      <text
        x={xOffset + ((distance - threshold) / distance) * width}
        y={yOffset - 25 - yExtra}
        fontSize="10px"
        textAnchor="middle"
        fill="white"
        fontWeight="bold"
      >
        {text ?? `${threshold}m left`}
      </text>
    </g>
  );
};
