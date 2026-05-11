import { IAptitudeFilterRow } from './types';

export const APTITUDE_ROWS: IAptitudeFilterRow[] = [
  {
    label: 'Track',
    slots: [
      { key: 'proper_ground_turf', name: 'Turf' },
      { key: 'proper_ground_dirt', name: 'Dirt' },
    ],
  },
  {
    label: 'Distance',
    slots: [
      { key: 'proper_distance_short', name: 'Sprint' },
      { key: 'proper_distance_mile', name: 'Mile' },
      { key: 'proper_distance_middle', name: 'Medium' },
      { key: 'proper_distance_long', name: 'Long' },
    ],
  },
  {
    label: 'Style',
    slots: [
      { key: 'proper_running_style_nige', name: 'Front' },
      { key: 'proper_running_style_senko', name: 'Pace' },
      { key: 'proper_running_style_sashi', name: 'Late' },
      { key: 'proper_running_style_oikomi', name: 'End' },
    ],
  },
];

export const MIN_GRADES = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export const GRADE_COLORS: Record<number, string> = {
  8: 'text-yellow-500', // S
  7: 'text-orange-500', // A
  6: 'text-orange-400', // B
  5: 'text-green-500', // C
  4: 'text-purple-500', // D to G
};

export const MOBILE_ROW_HEIGHT = 130;
export const DESKTOP_ROW_HEIGHT = 90;
