export enum RegionDisplayType {
  Immediate,
  Regions,
  Textbox,
  Marker,
}

export namespace RaceTrackDimensions {
  // Viewbox dimensions
  export const ViewWidth = 960;
  export const ViewHeight = 280;

  export const marginTop = 16;
  export const marginBottom = 0;
  export const marginLeft = 20;
  export const marginRight = 20;

  // X Offset to show Y Axis numbers
  export const xOffset = 20;
  export const RenderWidth = ViewWidth - marginLeft - marginRight;

  export const xAxisHeight = 20;
  export const xAxisY = ViewHeight - xAxisHeight - marginBottom;

  export const yAxisHeight = ViewHeight - xAxisHeight - marginBottom - marginTop;

  export const SectionNumbersBarHeight = 80;
  export const SectionNumbersBarY = xAxisY - SectionNumbersBarHeight;

  export const PhaseBarHeight = 40;
  export const PhaseBarY = SectionNumbersBarY - PhaseBarHeight;

  export const SectionTypesBarHeight = 40;
  export const SectionTypesBarY = PhaseBarY - SectionTypesBarHeight;

  export const SlopeLabelBarHeight = 40;
  export const SlopeLabelBarY = SectionTypesBarY - SlopeLabelBarHeight;

  // Slope visualization (background terrain)
  export const SlopeVisualizationHeight = 50;
  export const SlopeVisualizationY = SlopeLabelBarY - SlopeVisualizationHeight;

  // Other

  export const UmaSkillSectionHeight = SectionNumbersBarHeight;
  export const UmaSkillSectionRowHeight = UmaSkillSectionHeight / 2;
}

export const slopeConversionValue = 10000;
export const slopeValueToPercentage = (value: number) => {
  return value / slopeConversionValue;
};

export type DragStartHandler = (
  e: React.PointerEvent,
  skillId: string,
  umaIndex: number,
  start: number,
  end: number,
  markerType?: 'skill' | 'debuff',
  debuffId?: string,
) => void;
