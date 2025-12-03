import { getPresets } from './races';

export type BasinnChartData = {
  id: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  results: any[];
};

const presets = getPresets();

const DEFAULT_PRESET_INDEX = Math.max(
  presets.findIndex(
    (p) =>
      new Date(p.date.getFullYear(), p.date.getUTCMonth() + 1, 0) < new Date(),
  ) - 1,
  0,
);
export const DEFAULT_PRESET = presets[DEFAULT_PRESET_INDEX];

export const DEFAULT_SAMPLES = 500;
export const DEFAULT_SEED = 2615953739;
export const DEFAULT_COURSE_ID = DEFAULT_PRESET.courseId;

export type ResultsState = {
  courseId: number;
  results: any[];
  runData: any;
  chartData: any;
  displaying: string;
  rushedStats: any;
  leadCompetitionStats: any;
  spurtInfo: any;
  staminaStats: any;
  firstUmaStats: any;
};

export const EMPTY_RESULTS_STATE: ResultsState = {
  courseId: DEFAULT_COURSE_ID,
  results: [],
  runData: null,
  chartData: null,
  displaying: '',
  rushedStats: null,
  leadCompetitionStats: null,
  spurtInfo: null,
  staminaStats: null,
  firstUmaStats: null,
};

export const NO_SHOW = Object.freeze([
  '10011',
  '10012',
  '10016',
  '10021',
  '10022',
  '10026',
  '10031',
  '10032',
  '10036',
  '10041',
  '10042',
  '10046',
  '10051',
  '10052',
  '10056',
  '10061',
  '10062',
  '10066',
  '40011',
  '20061',
  '20062',
  '20066',
]);
