import trackNameList from '@/modules/data/tracknames.json';

type TrackIds = keyof typeof trackNameList;

type TrackNameList = {
  [key in TrackIds]: [string, string];
};

const extractTrackNamesForLanguage = (language: 'ja' | 'en') => {
  return Object.fromEntries(
    Object.entries(trackNameList as TrackNameList).map(([key, value]) => [
      key,
      value[language === 'ja' ? 0 : 1],
    ]),
  );
};

export const TRACKNAMES_ja = extractTrackNamesForLanguage('ja');
export const TRACKNAMES_en = extractTrackNamesForLanguage('en');

export const trackIds = Object.keys(trackNameList);
