import coursesJson from '@/modules/data/json/course_data.json';

import { loadSkills } from './loaders/skill-loader';
import { loadSupportCards } from './loaders/support-card-loader';
import { loadUmas } from './loaders/uma-loader';
import { CourseService } from './services/CourseService';
import { GameToraSkillService } from './services/GameToraSkillService';
import { SkillService } from './services/SkillService';
import { SupportCardService } from './services/SupportCardService';
import { UmaService } from './services/UmaService';

export type DataServices = {
  skills: SkillService;
  courses: CourseService;
  umas: UmaService;
  supportCards: SupportCardService;
};

export class DataRegistry {
  private services: DataServices;

  constructor(services: DataServices) {
    this.services = services;
  }

  get skills(): SkillService {
    return this.services.skills;
  }

  get courses(): CourseService {
    return this.services.courses;
  }

  get umas(): UmaService {
    return this.services.umas;
  }

  get supportCards(): SupportCardService {
    return this.services.supportCards;
  }
}

const loadedSkills = loadSkills();
const loadedUmas = loadUmas();
const loadedSupportCards = loadSupportCards(loadedSkills.skills);

export const skillsService = new GameToraSkillService(loadedSkills.skills, {
  releasedSkillIds: loadedSkills.releasedSkillIds,
  activationChecks: loadedSkills.activationChecks
});
export const umasService = new UmaService(loadedUmas.umas, {
  releasedOutfits: loadedUmas.releasedOutfits
});
export const supportCardsService = new SupportCardService(loadedSupportCards);
export const coursesService = new CourseService(coursesJson as any);

export const dataRegistry = new DataRegistry({
  skills: skillsService,
  courses: coursesService,
  umas: umasService,
  supportCards: supportCardsService
});
