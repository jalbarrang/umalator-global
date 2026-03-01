import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import type { RaceConditions } from '@/utils/races';
import type { PosKeepLabel } from '@/utils/races';
import type { DraggedSkill } from '../hooks/useDragSkill';
import type { RegionData } from '../hooks/useVisualizationData';
import { TooltipData } from '../overlays/racetrack-tooltip';

export type RaceTrackContextValue = {
  course: CourseData;
  courseid: number;
  chartData: SimulationRun;
  courseDistance: number;

  width: number;
  height: number;

  showHp: boolean;
  showLanes: boolean;
  showUma1: boolean;
  showUma2: boolean;
  showThresholds: boolean;
  racedef: RaceConditions;

  draggedSkill: DraggedSkill | null;
  handleDragStart: (
    e: React.MouseEvent,
    skillId: string,
    umaIndex: number,
    start: number,
    end: number,
    markerType?: 'skill' | 'debuff',
    debuffId?: string,
  ) => void;
  handleDragMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleDragEnd: () => void;

  mouseLineRef: RefObject<SVGLineElement | null>;
  mouseTextRef: RefObject<SVGTextElement | null>;
  tooltipData: TooltipData | null;
  tooltipVisible: boolean;
  rtMouseMove: (pos: number) => void;
  rtMouseLeave: () => void;

  skillActivations: Array<RegionData>;
  rushedIndicators: Array<RegionData>;
  posKeepLabels: Array<PosKeepLabel>;

  courseLabel: string;

  xOffset: number;
  yOffset: number;
};

export const RaceTrackContext = createContext<RaceTrackContextValue | null>(null);

export function useRaceTrack(): RaceTrackContextValue {
  const ctx = useContext(RaceTrackContext);
  if (!ctx) {
    throw new Error('useRaceTrack must be used within a RaceTrack.Root');
  }
  return ctx;
}
