import { Fragment, useMemo, useRef } from 'react';
import { CourseHelpers, Surface } from '@simulation/lib/CourseData';
import courses from '@data/course_data.json';
import { inoutKey } from '@/modules/racetrack/courses';
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
  setPacer,
  setUma1,
  setUma2,
  useRunnersStore,
} from '@/store/runners.store';

// eslint-disable-next-line react-refresh/only-export-components
export const enum RegionDisplayType {
  Immediate,
  Regions,
  Textbox,
  Marker,
}

type RaceTrackProps = {
  // Course data
  courseid: number;

  // Layout
  xOffset: number;
  yOffset: number;
  xExtra?: number;
  yExtra?: number;
  width?: number;
  height?: number;

  // Events
  onMouseMove: (pos: number) => void;
  onMouseLeave: () => void;
};

// Base dimensions for aspect ratio calculation
const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;
// const ASPECT_RATIO = BASE_HEIGHT / BASE_WIDTH;

export const RaceTrack: React.FC<React.PropsWithChildren<RaceTrackProps>> = (
  props,
) => {
  const { uma1, uma2, pacer } = useRunnersStore();

  // Refs for mouseover elements (replacing querySelector)
  const mouseLineRef = useRef<SVGLineElement>(null);
  const mouseTextRef = useRef<SVGTextElement>(null);

  const course = CourseHelpers.getCourse(props.courseid);

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

  const handleSkillDrag = (skillId, umaIndex, newStart, newEnd) => {
    console.log('handleSkillDrag called:', {
      skillId,
      umaIndex,
      newStart,
      newEnd,
    });

    // Update the forced skill position for the appropriate horse
    if (umaIndex === 0) {
      setUma1({
        ...uma1,
        forcedSkillPositions: {
          ...uma1.forcedSkillPositions,
          [skillId]: newStart,
        },
      });
    } else if (umaIndex === 1) {
      setUma2({
        ...uma2,
        forcedSkillPositions: {
          ...uma2.forcedSkillPositions,
          [skillId]: newStart,
        },
      });
    } else if (umaIndex === 2) {
      setPacer({
        ...pacer,
        forcedSkillPositions: {
          ...pacer.forcedSkillPositions,
          [skillId]: newStart,
        },
      });
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

    props.onMouseMove?.(x / w);

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

    props.onMouseLeave?.();
    handleDragEnd();
  };

  const regions = useMemo(() => {
    return allRegions.reduce(
      (state, desc, descIndex) => {
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
        } else if (desc.type === RegionDisplayType.Textbox) {
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
                onDragStart={
                  desc.skillId && desc.umaIndex !== undefined
                    ? (e) =>
                        handleDragStart(
                          e,
                          desc.skillId!,
                          desc.umaIndex!,
                          start,
                          end,
                        )
                    : undefined
                }
              />
            );
          });
          state.elem.push(
            <Fragment key={`textbox-${descIndex}-${desc.skillId ?? 'none'}`}>
              {markers}
            </Fragment>,
          );
        } else {
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
        }
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
  }, [allRegions, course.distance, uma1, uma2, pacer, width, handleDragStart]);

  return (
    <div className="flex flex-col w-full items-center">
      <div className="text-xl text-foreground font-bold">
        {i18n.t(`tracknames.${course.raceTrackId}`)}{' '}
        {i18n.t('coursedesc', {
          distance: course.distance,
          inout: i18n.t(
            `racetrack.${inoutKey[courses[props.courseid].course]}`,
          ),
          surface: course.surface == Surface.Turf ? 'Turf' : 'Dirt',
        })}{' '}
        {i18n.t(`racetrack.orientation.${course.turn}`)}
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
            posKeepLabels.map((label, index) => (
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
            ))}
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
    </div>
  );
};
