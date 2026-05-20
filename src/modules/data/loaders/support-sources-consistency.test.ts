import { describe, expect, it } from 'vitest';

import {
  attachSupportCardEventSources,
  attachSupportCardHintSources
} from '@/modules/data/loaders/attach-support-sources';
import { loadSkills } from '@/modules/data/loaders/skill-loader';
import { loadSupportCards } from '@/modules/data/loaders/support-card-loader';

describe('support card skill sources consistency', () => {
  it('matches hint and event skills on cards to skill supportSources', () => {
    const { skills } = loadSkills();
    const supportCards = loadSupportCards(skills);

    attachSupportCardHintSources(skills, supportCards);
    attachSupportCardEventSources(skills, supportCards);

    for (const card of Object.values(supportCards)) {
      for (const hintSkill of card.hintSkills) {
        const skill = skills[String(hintSkill.id)];
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
        const skill = skills[String(eventSkill.id)];
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
