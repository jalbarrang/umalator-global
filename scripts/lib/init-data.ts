import skillsJson from '@/modules/data/json/skills.json';
import gametoraSkillsJson from '@/modules/data/json/gametora/skills.json';
import masterSupportCardsJson from '@/modules/data/json/support-cards.json';
import gametoraSupportCardsJson from '@/modules/data/json/gametora/support-cards.json';
import masterUmasJson from '@/modules/data/json/umas.json';
import characterCardsJson from '@/modules/data/json/gametora/character-cards.json';
import eventSkillSourcesJson from '@/modules/data/json/gametora/event-skill-sources.json';
import courseDataJson from '@/modules/data/json/course_data.json';
import { initDataFromRaw, type RawData } from '@/modules/data/bootstrap';

let initialized = false;

export function initCliData(): void {
  if (initialized) {
    return;
  }

  initDataFromRaw({
    skills: skillsJson as unknown as RawData['skills'],
    gametoraSkills: gametoraSkillsJson as unknown as RawData['gametoraSkills'],
    masterSupportCards: masterSupportCardsJson as unknown as RawData['masterSupportCards'],
    gametoraSupportCards: gametoraSupportCardsJson as unknown as RawData['gametoraSupportCards'],
    masterUmas: masterUmasJson as unknown as RawData['masterUmas'],
    characterCards: characterCardsJson as unknown as RawData['characterCards'],
    eventSkillSources: eventSkillSourcesJson as unknown as RawData['eventSkillSources'],
    courseData: courseDataJson as unknown as RawData['courseData']
  });

  initialized = true;
}
