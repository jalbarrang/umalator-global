import React, { Activity, memo, useMemo, useRef } from 'react';
import { useDragSkill } from '../hooks/useDragSkill';
import { useRaceTrackTooltip } from '../hooks/useRaceTrackTooltip';
import { useVisualizationData } from '../hooks/useVisualizationData';
import { trackDescription } from '../labels';
import { RegionDisplayType } from '../types';
import { PhaseBar } from './phase-bar';
import { RaceTrackTooltip } from './racetrack-tooltip';
import './RaceTrack.css';
import { SectionBar } from './section-bar';
import { SectionNumbers } from './section-numbers';
import { SlopeLabelBar } from './slope-label-bar';
import { SlopeVisualization } from './slope-visualization';
import type { RegionData } from '../hooks/useVisualizationData';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import type { RaceConditions } from '@/utils/races';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { updateDebuffPosition } from '@/modules/simulation/stores/compare.store';
import {
  setForcedPosition,
  useForcedPositions,
} from '@/modules/simulation/stores/forced-positions.store';
import {
  toggleShowHp,
  toggleShowLanes,
  toggleShowThresholds,
  toggleShowUma1,
  toggleShowUma2,
  useSettingsStore,
} from '@/store/settings.store';
import i18n from '@/i18n';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { WeatherIcon } from '@/components/race-settings/WeatherSelect';
import { SeasonIcon } from '@/components/race-settings/SeasonSelect';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { debuffColors, recoveryColors } from '@/utils/colors';
import { SkillType } from '@/lib/sunday-tools/skills/definitions';

// Helper function for efficient rung collision detection
const findAvailableRung = (
  start: number,
  end: number,
  rungs: Array<Array<{ start: number; end: number }>>,
): number => {
  for (let i = 0; i < rungs.length; i++) {
    const hasOverlap = rungs[i].some((b) => !(end <= b.start || start >= b.end));
    if (!hasOverlap) return i;
  }
  return 0;
};

// Uma skill row layout (absolute pixels in viewBox space)
const UMA_ROW_HEIGHT = 36;
const UMA_ROW_GAP = 4;
const DISTANCE_AXIS_HEIGHT = 22;
const UMA_SECTION_HEIGHT =
  UMA_ROW_GAP + UMA_ROW_HEIGHT + UMA_ROW_GAP + UMA_ROW_HEIGHT + UMA_ROW_GAP + DISTANCE_AXIS_HEIGHT;
const COMPACT_BAR_HEIGHT = 10;
const COMPACT_LANES = 3;
const COMPACT_SYMBOL_SIZE = 3.5;

type CompactSkillMarkerProps = {
  x: number;
  y: number;
  width: number;
  barHeight: number;
  color: { fill: string; stroke: string };
  text: string;
  effectType?: number;
  skillId?: string;
  onDragStart?: (e: React.MouseEvent) => void;
};

const CompactSkillMarker = memo<CompactSkillMarkerProps>(
  ({ x, y, width, barHeight, color, text, effectType, skillId, onDragStart }) => {
    const isDraggable = !!skillId && !!onDragStart;
    return (
      <svg
        className="compact-skill-marker select-none"
        x={`${x}%`}
        y={y}
        width={`${width}%`}
        height={barHeight}
        overflow="visible"
        onMouseDown={onDragStart}
        style={{ cursor: isDraggable ? 'grab' : 'default' }}
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth="0.6"
          rx="2"
          ry="2"
        />
        {effectType != null && (
          <g transform={`translate(${barHeight / 2}, ${barHeight / 2})`}>
            <EffectSymbol
              effectType={effectType}
              color={{ fill: 'rgba(255,255,255,0.9)', stroke: color.stroke }}
              injected={false}
              size={COMPACT_SYMBOL_SIZE}
            />
          </g>
        )}
        <title>{text}</title>
      </svg>
    );
  },
);

type UmaSkillRowProps = {
  regions: Array<RegionData>;
  course: CourseData;
  umaIndex: 0 | 1;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  onDragStart: (
    e: React.MouseEvent,
    skillId: string,
    umaIndex: number,
    start: number,
    end: number,
    markerType?: 'skill' | 'debuff',
    debuffId?: string,
  ) => void;
};

const UmaSkillRow = (props: UmaSkillRowProps) => {
  const { regions, course, label, x, y, width, height, visible, onDragStart } = props;
  const forcedPositions = useForcedPositions();

  if (!visible) return null;

  const rungs: Array<Array<{ start: number; end: number }>> = Array.from(
    { length: COMPACT_LANES },
    () => [],
  );
  const seen = new Set<number>();

  const immediateLines: Array<React.ReactElement> = [];
  const markers: Array<React.ReactElement> = [];

  for (let descIndex = 0; descIndex < regions.length; descIndex++) {
    const desc = regions[descIndex];

    if (desc.type === RegionDisplayType.Immediate && desc.regions.length > 0) {
      let xPct = (desc.regions[0].start / course.distance) * 100;
      const COLLISION_OFFSET = 0.3;
      while (seen.has(xPct)) {
        xPct += COLLISION_OFFSET;
      }
      seen.add(xPct);
      immediateLines.push(
        <line
          key={`imm-${descIndex}`}
          x1={`${xPct}%`}
          y1="0"
          x2={`${xPct}%`}
          y2="100%"
          stroke={desc.color.stroke}
          strokeWidth={xPct === 0 ? 3 : 1.5}
        />,
      );
      continue;
    }

    if (desc.type === RegionDisplayType.Textbox) {
      for (let rIndex = 0; rIndex < desc.regions.length; rIndex++) {
        const r = desc.regions[rIndex];
        let start = r.start;
        let end = r.end;

        if (desc.skillId && desc.umaIndex !== undefined) {
          const positions =
            desc.umaIndex === 0 ? forcedPositions.uma1 : forcedPositions.uma2;
          const forcedPos = positions?.[desc.skillId];
          if (forcedPos !== undefined) {
            start = forcedPos;
            end = forcedPos + (r.end - r.start);
          }
        }

        const xPct = (start / course.distance) * 100;
        const wPct = ((end - start) / course.distance) * 100;

        const rungIndex = findAvailableRung(start, end, rungs);
        rungs[rungIndex % COMPACT_LANES].push({ start, end });

        const markerY = height - COMPACT_BAR_HEIGHT - 2 - (COMPACT_BAR_HEIGHT + 1) * rungIndex;

        const handleOnDragStart = (e: React.MouseEvent) => {
          if (!desc.skillId || desc.umaIndex === undefined) return;
          onDragStart(e, desc.skillId, desc.umaIndex, start, end);
        };

        markers.push(
          <CompactSkillMarker
            key={`c-${descIndex}-${rIndex}-${desc.skillId ?? 'n'}`}
            x={xPct}
            y={markerY}
            width={wPct}
            barHeight={COMPACT_BAR_HEIGHT}
            color={desc.color}
            text={desc.text}
            effectType={desc.effectType}
            skillId={desc.skillId}
            onDragStart={handleOnDragStart}
          />,
        );
      }
    }
  }

  return (
    <svg x={x} y={y} width={width} height={height}>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="var(--card)"
        stroke="color-mix(in srgb, var(--border) 60%, transparent)"
        strokeWidth="0.6"
        rx="3"
        ry="3"
      />
      <text
        x="4"
        y="50%"
        fill="var(--muted-foreground)"
        fontSize="9px"
        fontWeight="600"
        dominantBaseline="central"
        opacity="0.7"
      >
        {label}
      </text>
      {immediateLines}
      {markers}
    </svg>
  );
};

type DistanceAxisProps = {
  x: number;
  y: number;
  width: number;
  distance: number;
};

const DistanceAxis = ({ x, y, width, distance }: DistanceAxisProps) => {
  const step = distance <= 1400 ? 200 : 500;
  const ticks: Array<number> = [];
  for (let t = 0; t <= distance; t += step) {
    ticks.push(t);
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1={0} x2={width} y1={0} y2={0} stroke="var(--foreground)" strokeOpacity="0.4" />
      {ticks.map((tick) => {
        const tx = (tick / distance) * width;
        return (
          <g key={tick} transform={`translate(${tx}, 0)`}>
            <line y2={4} stroke="var(--foreground)" strokeOpacity="0.4" />
            <text
              y={14}
              textAnchor="middle"
              fontSize="9"
              fill="var(--muted-foreground)"
            >
              {tick}
            </text>
          </g>
        );
      })}
    </g>
  );
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

export const RaceTrack: React.FC<React.PropsWithChildren<RaceTrackProps>> = (props) => {
  const { chartData } = props;

  const course = useMemo(() => CourseHelpers.getCourse(props.courseid), [props.courseid]);

  const { showHp, showLanes, showUma1, showUma2, showThresholds, racedef } = useSettingsStore();

  const { tooltipData, tooltipVisible, rtMouseMove, rtMouseLeave } = useRaceTrackTooltip({
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
  const { skillActivations, rushedIndicators, posKeepLabels } = useVisualizationData({
    chartData,
  });

  const uma1Regions = useMemo(
    () => [
      ...skillActivations.filter((region) => region.umaIndex === 0),
      ...rushedIndicators.filter((region) => region.umaIndex === 0),
    ],
    [skillActivations, rushedIndicators],
  );
  const uma2Regions = useMemo(
    () => [
      ...skillActivations.filter((region) => region.umaIndex === 1),
      ...rushedIndicators.filter((region) => region.umaIndex === 1),
    ],
    [skillActivations, rushedIndicators],
  );

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

  // Use custom hook for drag functionality
  const { draggedSkill, handleDragStart, handleDragMove, handleDragEnd } = useDragSkill({
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
      mouseTextRef.current.setAttribute('x', (x > width - 45 ? x - 45 : x + 5).toString());
      mouseTextRef.current.setAttribute('y', y.toString());
      mouseTextRef.current.textContent = Math.round((x / width) * course.distance) + 'm';
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-4">
        <TrackName course={course} courseLabel={courseLabel} />
        <TrackConditions racedef={racedef} />
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col w-full" style={{ maxWidth: '1200px' }}>
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${width + xOffset + xExtra} ${height + yOffset + yExtra}`}
            preserveAspectRatio="xMidYMid meet"
            className="racetrackView w-full"
            data-courseid={props.courseid}
            onMouseMove={doMouseMove}
            onMouseLeave={doMouseLeave}
            onMouseUp={handleDragEnd}
          >
            <svg x={xOffset} y={yOffset} width={width} height={height}>
              <SlopeVisualization slopes={course.slopes} distance={course.distance} />

              <SlopeLabelBar slopes={course.slopes} distance={course.distance} />

              <SectionBar
                straights={course.straights}
                corners={course.corners}
                distance={course.distance}
              />

              <PhaseBar distance={course.distance} />
              <SectionNumbers />

              {posKeepLabels &&
                posKeepLabels.map((label, index) => {
                  if (label.umaIndex === 0 && !showUma1) return null;
                  if (label.umaIndex === 1 && !showUma2) return null;

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

            {React.Children.map(props.children, (child) =>
              React.isValidElement(child)
                ? React.cloneElement(child as React.ReactElement<{ hideXAxis?: boolean }>, {
                    hideXAxis: true,
                  })
                : child,
            )}
          </svg>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${width + xOffset + xExtra} ${UMA_SECTION_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="racetrackView w-full"
            onMouseMove={(e) => {
              if (draggedSkill) handleDragMove(e);
            }}
            onMouseLeave={handleDragEnd}
            onMouseUp={handleDragEnd}
          >
            <UmaSkillRow
              regions={uma1Regions}
              course={course}
              umaIndex={0}
              label="Uma 1"
              x={xOffset}
              y={UMA_ROW_GAP}
              width={width}
              height={UMA_ROW_HEIGHT}
              visible={showUma1}
              onDragStart={handleDragStart}
            />

            <UmaSkillRow
              regions={uma2Regions}
              course={course}
              umaIndex={1}
              label="Uma 2"
              x={xOffset}
              y={UMA_ROW_GAP + UMA_ROW_HEIGHT + UMA_ROW_GAP}
              width={width}
              height={UMA_ROW_HEIGHT}
              visible={showUma2}
              onDragStart={handleDragStart}
            />

            <DistanceAxis
              x={xOffset}
              y={UMA_ROW_GAP + UMA_ROW_HEIGHT + UMA_ROW_GAP + UMA_ROW_HEIGHT + UMA_ROW_GAP}
              width={width}
              distance={course.distance}
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-card px-4 py-2 rounded-md">
        <span className="font-semibold tracking-wide">Legend</span>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <g transform="translate(8 8)">
              <EffectSymbol
                effectType={SkillType.TargetSpeed}
                color={recoveryColors[0]}
                injected={false}
              />
            </g>
          </svg>
          <span>Speed</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <g transform="translate(8 8)">
              <EffectSymbol
                effectType={SkillType.Accel}
                color={recoveryColors[0]}
                injected={false}
              />
            </g>
          </svg>
          <span>Accel</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <g transform="translate(8 8)">
              <EffectSymbol
                effectType={SkillType.Recovery}
                color={recoveryColors[0]}
                injected={false}
              />
            </g>
          </svg>
          <span>Recovery / drain</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <g transform="translate(8 8)">
              <EffectSymbol
                effectType={SkillType.LaneMovementSpeed}
                color={recoveryColors[0]}
                injected={false}
              />
            </g>
          </svg>
          <span>Lane</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true">
            <rect
              x="1"
              y="5"
              width="16"
              height="6"
              fill={recoveryColors[0].fill}
              stroke={recoveryColors[0].stroke}
              strokeWidth="1"
              rx="1"
              ry="1"
            />
          </svg>
          <span>Self clip</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true">
            <rect
              x="1"
              y="5"
              width="16"
              height="6"
              fill={debuffColors[0].fill}
              stroke={debuffColors[0].stroke}
              strokeDasharray="2,2"
              strokeWidth="1"
              rx="1"
              ry="1"
              opacity="0.75"
            />
          </svg>
          <span>Injected clip</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card text-xs px-4 py-2 rounded-md">
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

        <Separator orientation="vertical" className="hidden md:block" />

        <div className="flex items-center gap-2">
          <Checkbox id="show-uma1" checked={showUma1} onCheckedChange={toggleShowUma1} />
          <Label htmlFor="show-uma1" className="text-sm font-normal cursor-pointer">
            Show Uma 1
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="show-uma2" checked={showUma2} onCheckedChange={toggleShowUma2} />
          <Label htmlFor="show-uma2" className="text-sm font-normal cursor-pointer">
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

export const ThresholdMarker = (props: ThresholdMarkerProps) => {
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
        fill="var(--foreground)"
        fontWeight="bold"
      >
        {text ?? `${threshold}m left`}
      </text>
    </g>
  );
};

type EffectSymbolProps = {
  effectType: number;
  color: { fill: string; stroke: string };
  injected: boolean;
  size?: number;
};

const EffectSymbol = (props: EffectSymbolProps) => {
  const { effectType, color, injected, size = 4 } = props;
  const strokeDasharray = injected ? '2,1' : undefined;

  if (effectType === SkillType.Recovery) {
    return (
      <polygon
        points={`0,-${size} ${size},0 0,${size} -${size},0`}
        fill={color.fill}
        stroke={color.stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth="1.2"
      />
    );
  }

  if (effectType === SkillType.Accel) {
    return (
      <polygon
        points={`0,-${size} ${size},${size} -${size},${size}`}
        fill={color.fill}
        stroke={color.stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth="1.2"
      />
    );
  }

  if (effectType === SkillType.LaneMovementSpeed || effectType === SkillType.ChangeLane) {
    return (
      <>
        <rect
          x={-size}
          y={-size + 1}
          width={size * 2}
          height={(size - 1) * 2}
          fill={color.fill}
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.1"
          rx="1"
          ry="1"
        />
        <line
          x1={-size + 1}
          y1={size - 1}
          x2={size - 1}
          y2={-size + 1}
          stroke={color.stroke}
          strokeWidth="1"
          strokeDasharray={strokeDasharray}
        />
      </>
    );
  }

  if (
    effectType === SkillType.TargetSpeed ||
    effectType === SkillType.CurrentSpeed ||
    effectType === SkillType.CurrentSpeedWithNaturalDeceleration
  ) {
    return (
      <>
        <polyline
          points={`${-size},-${size - 1} 0,0 ${-size},${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`0,-${size - 1} ${size},0 0,${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  return (
    <circle
      cx="0"
      cy="0"
      r={size - 1}
      fill={color.fill}
      stroke={color.stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth="1.2"
    />
  );
};

type TrackNameProps = {
  course: CourseData;
  courseLabel: string;
};

export const TrackName = (props: TrackNameProps) => {
  const { course, courseLabel } = props;

  return (
    <div className="flex items-center gap-2">
      <div className="text-xl text-foreground font-bold">
        {i18n.t(`tracknames.${course.raceTrackId}`)} {courseLabel}
      </div>
    </div>
  );
};

type TrackConditionsProps = {
  racedef: RaceConditions;
};

export const TrackConditions = (props: TrackConditionsProps) => {
  const { racedef } = props;

  return (
    <div className="flex">
      <div className="flex items-center gap-2">
        <SeasonIcon season={racedef.season} className="w-6 h-6" />
        <WeatherIcon weather={racedef.weather} className="w-6 h-6" />
        <div className="font-bold">{i18n.t(`racetrack.ground.${racedef.ground}`)}</div>
      </div>
    </div>
  );
};
