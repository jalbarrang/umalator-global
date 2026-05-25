import { getIconUrl } from '@/assets/icons';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { iconIdPrefixes } from './icons';
import { isSelfDebuffSkill } from './skill-relationships';

export const groups_filters = {
  rarity: ['white', 'gold', 'pink', 'unique', 'inherit'],
  icontype: [
    '1001',
    '1002',
    '1003',
    '1004',
    '1005',
    '1006',
    '4001',
    '2002',
    '2001',
    '2004',
    '2005',
    '2006',
    '2009',
    '3001',
    '3002',
    '3004',
    '3005',
    '3007',
    'selfdebuff'
  ],
  strategy: ['nige', 'senkou', 'sasi', 'oikomi'],
  distance: ['short', 'mile', 'medium', 'long'],
  surface: ['turf', 'dirt'],
  location: ['phase0', 'phase1', 'phase2', 'phase3', 'finalcorner', 'finalstraight']
};

/** Icon shown on the self-debuff filter chip (e.g. Corner Recovery ×). */
export const SELF_DEBUFF_FILTER_ICON_ID = '20024';

export const SELF_DEBUFF_ICON_FILTER_KEY = 'selfdebuff';

/**
 * Icon id for filter chips. Filter keys (e.g. "2002") are not skill iconIds;
 * chips use the category sample id "{key}1" (e.g. 20021.png), except self-debuff.
 */
export function getSkillIconFilterDisplayId(filterKey: string): string {
  if (filterKey === SELF_DEBUFF_ICON_FILTER_KEY) {
    return SELF_DEBUFF_FILTER_ICON_ID;
  }

  return `${filterKey}1`;
}

export function getSkillIconFilterImageUrl(filterKey: string): string {
  return getIconUrl(`${getSkillIconFilterDisplayId(filterKey)}.png`);
}

export function skillMatchesIconTypeFilter(skill: SkillEntry, filterKey: string): boolean {
  if (filterKey === SELF_DEBUFF_ICON_FILTER_KEY) {
    return isSelfDebuffSkill(skill);
  }

  const prefixes = iconIdPrefixes[filterKey as keyof typeof iconIdPrefixes];
  if (!prefixes) return false;

  return prefixes.some((prefix) => skill.iconId.startsWith(prefix));
}
