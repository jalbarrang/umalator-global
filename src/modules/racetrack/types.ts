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

  export const xAxisHeight = 24;
  export const xAxisY = ViewHeight - xAxisHeight - marginBottom;

  export const yAxisHeight = ViewHeight - xAxisHeight - marginBottom - marginTop;

  export const SectionNumbersBarHeight = 40;
  export const SectionNumbersBarY = xAxisY - SectionNumbersBarHeight;

  export const PhaseBarHeight = 50;
  export const PhaseBarY = SectionNumbersBarY - PhaseBarHeight;

  export const SectionTypesBarHeight = 50;
  export const SectionTypesBarY = PhaseBarY - SectionTypesBarHeight;

  export const SlopeLabelBarHeight = 50;
  export const SlopeLabelBarY = SectionTypesBarY - SlopeLabelBarHeight;

  // Other

  export const UmaSkillSectionHeight = SectionNumbersBarHeight;
  export const UmaSkillSectionRowHeight = UmaSkillSectionHeight / 2;
}
