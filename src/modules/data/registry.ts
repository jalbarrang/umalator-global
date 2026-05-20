import coursesJson from '@/modules/data/json/course_data.json';

import {
  attachSupportCardEventSources,
  attachSupportCardHintSources
} from './loaders/attach-support-sources';
import { loadSkills } from './loaders/skill-loader';
import { loadSupportCards } from './loaders/support-card-loader';
import { loadUmas } from './loaders/uma-loader';
import { CourseService } from './services/CourseService';
import { GameToraSkillService } from './services/GameToraSkillService';
import { SupportCardService } from './services/SupportCardService';
import { UmaService } from './services/UmaService';

const loadedSkills = loadSkills();
const loadedUmas = loadUmas();
const loadedSupportCards = loadSupportCards(loadedSkills.skills);
attachSupportCardHintSources(loadedSkills.skills, loadedSupportCards);
attachSupportCardEventSources(loadedSkills.skills, loadedSupportCards);

export const skillsService = new GameToraSkillService(loadedSkills.skills, {
  releasedSkillIds: loadedSkills.releasedSkillIds,
  activationChecks: loadedSkills.activationChecks
});
export const umasService = new UmaService(loadedUmas.umas, {
  releasedOutfits: loadedUmas.releasedOutfits
});
export const supportCardsService = new SupportCardService(loadedSupportCards);
export const coursesService = new CourseService(coursesJson as any);
