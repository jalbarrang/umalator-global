import { describe, expect, it } from 'vitest';

import { skillsService } from '@/modules/data/services/SkillService';
import { supportCardsService } from '@/modules/data/services/SupportCardService';

// The data services are populated from the real JSON by the test setup
// (`initDataFromRaw`), which runs the same loader + attach-sources pipeline the
// app uses at bootstrap. This verifies that pipeline leaves skill `supportSources`
// consistent with each support card's hint/event skills.
describe('support card skill sources consistency', () => {
  it('matches hint and event skills on cards to skill supportSources', () => {
    for (const card of supportCardsService.getAll()) {
      for (const hintSkill of card.hintSkills) {
        const skill = skillsService.getById(String(hintSkill.id));
        expect(skill, `missing skill ${hintSkill.id} for card ${card.id} hint`).toBeDefined();
        expect(
          skill?.supportSources?.some(
            (source) =>
              source.supportCardId === card.id &&
              (source.sourceType === 'hint' || source.sourceType === undefined)
          )
        ).toBe(true);
      }

      for (const eventSkill of card.eventSkills) {
        const skill = skillsService.getById(String(eventSkill.id));
        expect(skill, `missing skill ${eventSkill.id} for card ${card.id} event`).toBeDefined();
        expect(
          skill?.supportSources?.some(
            (source) => source.supportCardId === card.id && source.sourceType === 'event'
          )
        ).toBe(true);
      }
    }
  });
});
