import skills_en from './lang/en/skills';
import skills_ja from './lang/ja/skills';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { TRACKNAMES_en, TRACKNAMES_ja } from './lang/tracknames';

const definitions = {
  en: {
    translation: {
      ...skills_en,
      tracknames: TRACKNAMES_en,
      racetrack: {
        none: ' ',
        inner: ' (inner)',
        outer: ' (outer)',
        outin: ' (outer→inner)',
        orientation: [
          '',
          '(clockwise)',
          '(counterclockwise)',
          '',
          '(straight)',
        ],
        turf: 'Turf',
        dirt: 'Dirt',
        straight: 'Straight',
        corner: 'Corner {{n}}',
        uphill: 'Uphill',
        downhill: 'Downhill',
        phase0: 'Opening leg',
        phase1: 'Middle leg',
        phase2: 'Final leg',
        phase3: 'Last spurt',
        short: {
          straight: '→',
          corner: 'C{{n}}',
          uphill: '↗',
          downhill: '↘',
        },
      },
      coursedesc: '{{surface}} {{distance}}m{{inout}}',
    },
  },
  ja: {
    translation: {
      ...skills_ja,
      tracknames: TRACKNAMES_ja,
      racetrack: Object.freeze({
        none: '​',
        inner: ' （内）',
        outer: ' （外）',
        outin: ' （外→内）',
        orientation: Object.freeze(['', '右', '左', '', '直']),
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
        short: Object.freeze({
          straight: '直',
          corner: 'コ{{n}}',
          uphill: '上',
          downhill: '下',
        }),
      }),
      coursedesc: '{{distance}}m{{inout}}',
      coursedesc_one: '{{distance}}m{{inout}}',
      coursedesc_other: '{{surface}} {{distance}}m{{inout}}',
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
