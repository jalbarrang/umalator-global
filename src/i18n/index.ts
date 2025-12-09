import skills_en from './lang/en/skills';
import skills_ja from './lang/ja/skills';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { TRACKNAMES_en, TRACKNAMES_ja } from './lang/tracknames';
import { GroundCondition } from '@/modules/simulation/lib/RaceParameters';

const definitions = {
  en: {
    translation: {
      ...skills_en,
      tracknames: TRACKNAMES_en,
      racetrack: {
        none: '',
        inner: 'Inner',
        outer: 'Outer',
        outin: 'Outer → Inner',
        orientation: ['', 'Right', 'Left', '', 'Stretch'],
        turf: 'Turf',
        dirt: 'Dirt',
        straight: 'Straight',
        corner: 'Corner {{n}}',
        uphill: 'Uphill',
        downhill: 'Downhill',
        phase0: 'Early-race',
        phase1: 'Mid-race',
        phase2: 'Late-race',
        phase3: 'Last spurt',
        ground: {
          [GroundCondition.Good]: 'Firm',
          [GroundCondition.Yielding]: 'Good',
          [GroundCondition.Soft]: 'Soft',
          [GroundCondition.Heavy]: 'Heavy',
        },
        short: {
          straight: '→',
          corner: 'C{{n}}',
          uphill: '↗',
          downhill: '↘',
        },
        sprint: 'Sprint',
        mile: 'Mile',
        medium: 'Medium',
        long: 'Long',
      },
      coursedesc:
        '{{surface}} {{distance}}m ({{distanceCategory}}) {{orientation}} / {{inout}}',
    },
  },
  ja: {
    translation: {
      ...skills_ja,
      tracknames: TRACKNAMES_ja,
      racetrack: {
        none: '',
        inner: ' （内）',
        outer: ' （外）',
        outin: ' （外→内）',
        orientation: ['', '右', '左', '', '直'],
        turf: '芝',
        dirt: 'ダート',
        straight: '直線',
        corner: 'コーナー{{n}}',
        uphill: '上り坂',
        downhill: '下り坂',
        phase0: '序盤',
        phase1: '中盤',
        phase2: '終盤',
        phase3: 'ラストスパート',
        short: {
          straight: '直',
          corner: 'コ{{n}}',
          uphill: '上',
          downhill: '下',
        },
        sprint: 'スプリント',
        mile: 'マイル',
        medium: '中距離',
        long: '長距離',
      },
      coursedesc:
        '{{surface}} {{distance}}m ({{distanceCategory}}) {{orientation}} / {{inout}}',
    },
  },
};

export const getStrings = (lang: string) => {
  const strings = definitions[lang];
  return strings ?? definitions.en;
};

i18n.use(initReactI18next).init({
  resources: definitions,
  lng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
