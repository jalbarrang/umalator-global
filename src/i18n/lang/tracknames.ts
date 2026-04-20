import { getDataRuntime } from '@/modules/data/runtime';

const extractTrackNamesForLanguage = () => {
  const result: Record<string, string> = {};
  const entries = Object.entries(getDataRuntime().catalog.trackNames);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    result[key] = value[1];
  }

  return result;
};

export const TRACKNAMES_en = extractTrackNamesForLanguage();
export const getTrackIds = (): Array<string> => Object.keys(getDataRuntime().catalog.trackNames);
