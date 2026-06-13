// Data bootstrap: turns the 8 raw datasets into populated service singletons.
//
// `initDataFromRaw` is the pure, synchronous core (no fetch) shared by the
// runtime (`bootstrapData`, which fetches via the manifest) and the test setup
// (which imports the JSON directly). It runs the loaders + attach passes in the
// exact dependency order the old eager module-init relied on, then assigns the
// live-binding service singletons and rebuilds the skill index caches.

import { loadSkills } from '@/modules/data/loaders/skill-loader';
import { attachReleaseDates } from '@/modules/data/loaders/attach-release-dates';
import { loadUmas } from '@/modules/data/loaders/uma-loader';
import {
  collectReleasedOutfitIds,
  collectReleasedSupportCardIds
} from '@/modules/data/loaders/global-cutover';
import {
  initEventSkillSources,
  loadChainEventSkillIds,
  loadRandomEventSkillIds
} from '@/modules/data/loaders/chain-event-skills-loader';
import { loadSupportCards } from '@/modules/data/loaders/support-card-loader';
import {
  attachSupportCardEventSources,
  attachSupportCardHintSources
} from '@/modules/data/loaders/attach-support-sources';
import { initSkillService } from '@/modules/data/services/SkillService';
import { initUmaService } from '@/modules/data/services/UmaService';
import { initSupportCardService } from '@/modules/data/services/SupportCardService';
import { initCourseService } from '@/modules/data/services/CourseService';
import { bootstrapSkillIndexes } from '@/modules/data/bootstrap-skill-indexes';
import { fetchDataset } from '@/modules/data/data-fetch';
import { applySkillNameTranslations } from '@/i18n';

/** The 8 raw datasets, typed against the loader/service inputs they feed. */
export type RawData = {
  skills: Parameters<typeof loadSkills>[0];
  gametoraSkills: Parameters<typeof loadSkills>[1];
  masterSupportCards: Parameters<typeof collectReleasedSupportCardIds>[0];
  gametoraSupportCards: Parameters<typeof loadSupportCards>[1] & Parameters<typeof attachReleaseDates>[2];
  masterUmas: Parameters<typeof collectReleasedOutfitIds>[0];
  characterCards: Parameters<typeof loadUmas>[0] & Parameters<typeof attachReleaseDates>[1];
  eventSkillSources: Parameters<typeof initEventSkillSources>[0];
  courseData: Parameters<typeof initCourseService>[0];
};

/** Synchronously build + assign all data services from already-loaded raw data. */
export function initDataFromRaw(raw: RawData): void {
  // Skills (+ release dates) must be ready before the skill service / indexes.
  const loadedSkills = loadSkills(raw.skills, raw.gametoraSkills);
  attachReleaseDates(loadedSkills.skills, raw.characterCards, raw.gametoraSupportCards);
  initSkillService(loadedSkills);

  // Skill display-name translations depend on the loaded skills.
  applySkillNameTranslations(
    Object.fromEntries(Object.values(loadedSkills.skills).map((skill) => [skill.id, skill.name]))
  );

  // Umas.
  const releasedOutfits = collectReleasedOutfitIds(raw.masterUmas);
  initUmaService(loadUmas(raw.characterCards, releasedOutfits));

  // Support cards depend on skills + the event-skill source map.
  initEventSkillSources(raw.eventSkillSources);
  const releasedCardIds = collectReleasedSupportCardIds(raw.masterSupportCards);
  const loadedSupportCards = loadSupportCards(
    loadedSkills.skills,
    raw.gametoraSupportCards,
    releasedCardIds,
    loadChainEventSkillIds(),
    loadRandomEventSkillIds()
  );
  attachSupportCardHintSources(loadedSkills.skills, loadedSupportCards);
  attachSupportCardEventSources(loadedSkills.skills, loadedSupportCards);
  initSupportCardService(loadedSupportCards);

  // Courses (independent).
  initCourseService(raw.courseData);

  // Skill-derived index caches (need the populated skill service).
  bootstrapSkillIndexes();
}

let bootstrapPromise: Promise<void> | null = null;

/** Fetch all datasets via the manifest, then populate the services (memoized). */
export function bootstrapData(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const [
        skills,
        gametoraSkills,
        masterSupportCards,
        gametoraSupportCards,
        masterUmas,
        characterCards,
        eventSkillSources,
        courseData
      ] = await Promise.all([
        fetchDataset<RawData['skills']>('skills'),
        fetchDataset<RawData['gametoraSkills']>('gametora/skills'),
        fetchDataset<RawData['masterSupportCards']>('support-cards'),
        fetchDataset<RawData['gametoraSupportCards']>('gametora/support-cards'),
        fetchDataset<RawData['masterUmas']>('umas'),
        fetchDataset<RawData['characterCards']>('gametora/character-cards'),
        fetchDataset<RawData['eventSkillSources']>('gametora/event-skill-sources'),
        fetchDataset<RawData['courseData']>('course_data')
      ]);

      initDataFromRaw({
        skills,
        gametoraSkills,
        masterSupportCards,
        gametoraSupportCards,
        masterUmas,
        characterCards,
        eventSkillSources,
        courseData
      });
    })();
  }
  return bootstrapPromise;
}
