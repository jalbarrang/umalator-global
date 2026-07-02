import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import skills_en from './lang/en/skills';

import { TRACKNAMES_en } from './lang/tracknames';
import { GroundCondition } from '@/lib/uma-domain/course/definitions';

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
        outinshort: 'outer to inner',
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
          [GroundCondition.Firm]: 'Firm',
          [GroundCondition.Good]: 'Good',
          [GroundCondition.Soft]: 'Soft',
          [GroundCondition.Heavy]: 'Heavy'
        },
        short: {
          straight: '→',
          corner: 'C{{n}}',
          uphill: '↗',
          downhill: '↘'
        },
        sprint: 'Sprint',
        mile: 'Mile',
        medium: 'Medium',
        long: 'Long'
      },
      coursedesc: '{{surface}} {{distance}}m ({{distanceCategory}}) {{orientation}} / {{inout}}'
    }
  }
};

const getStrings = (lang: string) => {
  const strings = definitions[lang as keyof typeof definitions];

  return strings ?? definitions.en;
};

i18n.use(initReactI18next).init({
  resources: definitions,
  lng: 'en',
  showSupportNotice: false, // suppress i18next's Locize promo console.info
  interpolation: {
    escapeValue: false // React already escapes values
  }
});

/**
 * Merge skill-id -> display-name translations into the `translation` bundle.
 * Called during data bootstrap (the skill service is not populated at i18n init
 * time), so `t('skillnames.<id>')` resolves once data is ready.
 */
export function applySkillNameTranslations(skillNames: Record<string, string>): void {
  i18n.addResourceBundle('en', 'translation', { skillnames: skillNames }, true, true);
}

export default i18n;
