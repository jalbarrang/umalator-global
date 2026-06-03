import React from 'react';
import { useScenarioOverrides } from '@/modules/simulation/stores/scenario-overrides.store';
import { useDragPreviewForUma } from '../hooks/useDragSkill';
import { rankColors } from '@/utils/colors';
import { RaceTrackDimensions } from '../types';
import type { DragStartHandler } from '../types';
import type { ForcedRankRegion } from '@/modules/simulation/types';
import type { CompareRunnerId } from '@/modules/simulation/compare.types';

type ForcedRankBarProps = {
  courseDistance: number;
  onDragStart: DragStartHandler;
};

const ROW_HEIGHT = RaceTrackDimensions.RankBarHeight / 2;
const MIN_TEXT_WIDTH_PCT = 3; // minimum % width to show text

function RankRegion(props: {
  region: ForcedRankRegion;
  index: number;
  umaIndex: 0 | 1;
  runnerId: CompareRunnerId;
  courseDistance: number;
  onDragStart: DragStartHandler;
  isDragging: boolean;
}) {
  const { region, index, umaIndex, courseDistance, onDragStart, isDragging } = props;

  const xPct = (region.start / courseDistance) * 100;
  const wPct = ((region.end - region.start) / courseDistance) * 100;
  const y = umaIndex * ROW_HEIGHT;
  const color = rankColors[umaIndex];

  return (
    <g opacity={isDragging ? 0.4 : 1}>
      <rect
        x={`${xPct}%`}
        y={y}
        width={`${wPct}%`}
        height={ROW_HEIGHT}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth={1}
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={(e) => {
          onDragStart(
            e,
            `__forced_rank_${index}`,
            umaIndex,
            region.start,
            region.end,
            'scenario',
            `rank-${umaIndex}-${index}`
          );
        }}
      />
      {wPct >= MIN_TEXT_WIDTH_PCT && (
        <text
          x={`${xPct + wPct / 2}%`}
          y={y + ROW_HEIGHT / 2}
          fill={color.stroke}
          fontSize="9px"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
        >
          Rk {region.rank}
        </text>
      )}
    </g>
  );
}

function DragPreview(props: { umaIndex: 0 | 1; courseDistance: number }) {
  const { umaIndex, courseDistance } = props;
  const preview = useDragPreviewForUma(umaIndex);

  if (
    !preview ||
    preview.markerType !== 'scenario' ||
    !preview.skillId?.startsWith('__forced_rank_')
  ) {
    return null;
  }

  const xPct = (preview.start / courseDistance) * 100;
  const wPct = ((preview.end - preview.start) / courseDistance) * 100;
  const y = umaIndex * ROW_HEIGHT;
  const color = rankColors[umaIndex];

  return (
    <rect
      x={`${xPct}%`}
      y={y}
      width={`${wPct}%`}
      height={ROW_HEIGHT}
      fill={color.fill}
      stroke={color.stroke}
      strokeWidth={1}
      strokeDasharray="4 2"
      opacity={0.6}
      style={{ pointerEvents: 'none' }}
    />
  );
}

export const ForcedRankBar = React.memo<ForcedRankBarProps>((props) => {
  const { courseDistance, onDragStart } = props;
  const overrides = useScenarioOverrides();
  const previewUma0 = useDragPreviewForUma(0);
  const previewUma1 = useDragPreviewForUma(1);

  const hasAnyRank = overrides.uma1.forcedRank.length > 0 || overrides.uma2.forcedRank.length > 0;

  if (!hasAnyRank && !previewUma0 && !previewUma1) {
    return (
      <g>
        <rect x="0" y="0" width="100%" height="100%" fill="rgb(245,245,245)" rx="2" />
        <text
          x="50%"
          y="50%"
          fill="rgb(180,180,180)"
          fontSize="8px"
          textAnchor="middle"
          dominantBaseline="central"
        >
          Position Rank Overrides
        </text>
      </g>
    );
  }

  const isDragging = (umaIndex: 0 | 1, index: number) => {
    const preview = umaIndex === 0 ? previewUma0 : previewUma1;
    if (!preview || preview.markerType !== 'scenario') return false;
    return preview.debuffId === `rank-${umaIndex}-${index}`;
  };

  return (
    <g>
      {/* Background */}
      <rect x="0" y="0" width="100%" height="100%" fill="rgb(245,245,245)" rx="2" />
      {/* Separator */}
      <line
        x1="0"
        y1={ROW_HEIGHT}
        x2="100%"
        y2={ROW_HEIGHT}
        stroke="rgb(220,220,220)"
        strokeWidth={0.5}
      />

      {/* Uma labels */}
      <text
        x={-14}
        y={ROW_HEIGHT / 2}
        fill="rgb(140,140,140)"
        fontSize="7px"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        U1
      </text>
      <text
        x={-14}
        y={ROW_HEIGHT + ROW_HEIGHT / 2}
        fill="rgb(140,140,140)"
        fontSize="7px"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        U2
      </text>

      {/* Uma 1 regions */}
      {overrides.uma1.forcedRank.map((region, index) => (
        <RankRegion
          key={`uma1-${index}`}
          region={region}
          index={index}
          umaIndex={0}
          runnerId="uma1"
          courseDistance={courseDistance}
          onDragStart={onDragStart}
          isDragging={isDragging(0, index)}
        />
      ))}

      {/* Uma 2 regions */}
      {overrides.uma2.forcedRank.map((region, index) => (
        <RankRegion
          key={`uma2-${index}`}
          region={region}
          index={index}
          umaIndex={1}
          runnerId="uma2"
          courseDistance={courseDistance}
          onDragStart={onDragStart}
          isDragging={isDragging(1, index)}
        />
      ))}

      {/* Drag previews */}
      <DragPreview umaIndex={0} courseDistance={courseDistance} />
      <DragPreview umaIndex={1} courseDistance={courseDistance} />
    </g>
  );
});
