import { Fragment, useMemo, useRef } from 'react';
import { CourseHelpers } from '@simulation/lib/CourseData';
import './RaceTrack.css';
import i18n from '@/i18n';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { useDragSkill } from '../hooks/useDragSkill';
import { SlopeVisualization } from './slope-visualization';
import { SlopeLabelBar } from './slope-label-bar';
import { SectionBar } from './section-bar';
import { PhaseBar } from './phase-bar';
import { SectionNumbers } from './section-numbers';
import { SkillMarker } from './skill-marker';
import { useVisualizationData } from '../hooks/useVisualizationData';
import {
  updateForcedSkillPosition,
  useRunnersStore,
} from '@/store/runners.store';
import { SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { setLeftSidebar } from '@/store/ui.store';
import { RegionDisplayType } from '../types';
import { trackDescription } from '../labels';
import { SeasonIcon } from '@/components/race-settings/SeasonSelect';
import { WeatherIcon } from '@/components/race-settings/WeatherSelect';
import {
  toggleShowHp,
  toggleShowLanes,
  toggleShowUma1,
  toggleShowUma2,
  useSettingsStore,
} from '@/store/settings.store';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RaceTrackTooltip } from './racetrack-tooltip';
import { useRaceTrackTooltip } from '../hooks/useRaceTrackTooltip';
import { SimulationRun } from '@/store/race/compare.types';
import { Separator } from '@/components/ui/separator';

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

  const { uma1, uma2, pacer } = useRunnersStore();
  const { racedef } = useSettingsStore();
  const { showHp, showLanes, showUma1, showUma2 } = useSettingsStore();

  const { tooltipData, tooltipVisible, rtMouseMove, rtMouseLeave } =
    useRaceTrackTooltip({
      chartData,
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
    useVisualizationData();

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
      onSkillDrag: handleSkillDrag,
    });

  const doMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const svg = e.currentTarget;
    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    if (offsetX < xOffset) return;

    const w = svg.getBoundingClientRect().width - xOffset;
    const x = offsetX - xOffset;
    const y = offsetY - yOffset;

    // Use refs instead of querySelector
    if (mouseLineRef.current) {
      mouseLineRef.current.setAttribute('x1', x.toString());
      mouseLineRef.current.setAttribute('x2', x.toString());
    }
    if (mouseTextRef.current) {
      mouseTextRef.current.setAttribute(
        'x',
        (x > w - 45 ? x - 45 : x + 5).toString(),
      );
      mouseTextRef.current.setAttribute('y', y.toString());
      mouseTextRef.current.textContent =
        Math.round((x / w) * course.distance) + 'm';
    }

    rtMouseMove(x / w);

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

  const regions = useMemo(() => {
    return allRegions.reduce(
      (state, desc, descIndex) => {
        if (desc.umaIndex === 0 && !showUma1) return state;
        if (desc.umaIndex === 1 && !showUma2) return state;

        if (
          desc.type === RegionDisplayType.Immediate &&
          desc.regions.length > 0
        ) {
          let x = (desc.regions[0].start / course.distance) * 100;

          while (state.seen.has(x)) {
            x += ((3 + +(x === 0)) / width) * 100;
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
              let horseState: RunnerState | null = null;

              if (desc.umaIndex === 0 && uma1) {
                horseState = uma1;
              } else if (desc.umaIndex === 1 && uma2) {
                horseState = uma2;
              } else if (desc.umaIndex === 2 && pacer) {
                horseState = pacer;
              }

              if (horseState && horseState.forcedSkillPositions[desc.skillId]) {
                const forcedPos = horseState.forcedSkillPositions[desc.skillId];
                start = forcedPos;
                end = forcedPos + (r.end - r.start);
              }
            }

            const x = (start / course.distance) * 100;
            const w = ((end - start) / course.distance) * 100;

            let rungIndex = 0;
            while (rungIndex < 10) {
              if (
                state.rungs[rungIndex].some(
                  (b) =>
                    (start >= b.start && start < b.end) ||
                    (end > b.start && end <= b.end) ||
                    (b.start >= start && b.start < end) ||
                    (b.end > start && b.end <= end),
                )
              ) {
                ++rungIndex;
              } else {
                break;
              }
            }

            state.rungs[rungIndex % 10].push({ start, end });
            const y = 90 - 10 * rungIndex;

            const handleOnDragStart = (e: React.MouseEvent<SVGSVGElement>) => {
              if (!desc.skillId) return;
              if (!desc.umaIndex) return;

              handleDragStart(e, desc.skillId, desc.umaIndex, start, end);
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
                y={`${100 - desc.height}%`}
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
  }, [
    allRegions,
    course.distance,
    uma1,
    uma2,
    pacer,
    width,
    handleDragStart,
    showUma1,
    showUma2,
  ]);

  const courseLabel = trackDescription({ courseid: props.courseid });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="text-xl text-foreground font-bold">
            {i18n.t(`tracknames.${course.raceTrackId}`)} {courseLabel}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLeftSidebar({
                    activePanel: 'racetrack-settings',
                    hidden: false,
                  })
                }
              >
                <SettingsIcon className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Race Settings</p>
            </TooltipContent>
          </Tooltip>
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

      <div className="flex">
        <RaceTrackTooltip data={tooltipData} visible={tooltipVisible} />
      </div>

      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        // viewBox={`0 0 ${width + xOffset + xExtra} ${height + yOffset + yExtra}`}
        // preserveAspectRatio="xMidYMid meet"
        width={width + xOffset + xExtra}
        height={height + yOffset + yExtra}
        className="racetrackView"
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

          {regions}

          {posKeepLabels &&
            posKeepLabels.map((label, index) => {
              if (label.umaIndex === 0 && !showUma1) return null;
              if (label.umaIndex === 1 && !showUma2) return null;

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
          />

          <text
            ref={mouseTextRef}
            className="mouseoverText"
            x="-5"
            y="-5"
            fill="rgb(121,64,22)"
          ></text>
        </svg>

        {props.children}
      </svg>

      <div className="flex items-center gap-4 bg-secondary px-4 py-2 rounded-md">
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

        <Separator orientation="vertical" />

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
