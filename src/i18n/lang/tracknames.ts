import trackNameList from '@/modules/data/tracknames.json';

type TrackIds = keyof typeof trackNameList;

type TrackNameList = {
  [key in TrackIds]: [string, string];
};

const extractTrackNamesForLanguage = () => {
  const result: Record<string, string> = {};
  const entries = Object.entries(trackNameList as TrackNameList);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    result[key] = value[1];
  }

  return result;
};

export const TRACKNAMES_en = extractTrackNamesForLanguage();
export const trackIds = Object.keys(trackNameList);
