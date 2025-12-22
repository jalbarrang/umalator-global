// using preset store, if the user has no preset selected, use the first preset that is close to the current date

import { dayjs } from './time';
import { usePresetStore } from '@/store/race/preset.store';

const { presets: storedPresets } = usePresetStore.getState();

const presets = Object.values(storedPresets);
const currentDate = dayjs();
const currentPresetIndex =
  presets.findIndex((p) => dayjs(p.date).endOf('month').isBefore(currentDate)) - 1;

const DEFAULT_PRESET = presets[Math.max(currentPresetIndex, 0)];

export const DEFAULT_SAMPLES = 500;
export const DEFAULT_SEED = 2615953739;
export const DEFAULT_COURSE_ID = DEFAULT_PRESET.courseId;

export const hiddenSkills: ReadonlyArray<string> = [
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
];
