import { describe, expect, it } from 'vitest';
import rawIcons from '@/modules/data/icons.json';
import { getIconById } from '@/modules/data/icons';
import { getIconUrl } from './index';

describe('icon asset manifest', () => {
  it('resolves representative icon paths', () => {
    expect(getIconUrl('status_00.png')).toContain('status_00');
    expect(getIconUrl('global/utx_txt_season_00.png')).toContain('utx_txt_season_00');
    expect(getIconUrl('statusrank/ui_statusrank_00.png')).toContain('ui_statusrank_00');
    expect(getIconUrl('mob/trained_mob_chr_icon_8000_000001_01.png')).toContain(
      'trained_mob_chr_icon_8000_000001_01',
    );
    expect(getIconUrl('chara/chr_icon_1001.png')).toContain('chr_icon_1001');
  });

  it('resolves every legacy icons.json path through the asset manifest', () => {
    for (const path of Object.values(rawIcons)) {
      expect(() => getIconUrl(path)).not.toThrow();
    }
  });

  it('keeps getIconById working for known ids', () => {
    expect(getIconById('1001')).toContain('chr_icon_1001');
    expect(getIconById('100101')).toContain('trained_chr_icon_1001_100101_02');
  });
});
