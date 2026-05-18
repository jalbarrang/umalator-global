import coursesJson from '@/modules/data/json/course_data.json';

import { loadGameToraSkills } from './loaders/skill-loader';
import { loadGameToraSupportCards } from './loaders/support-card-loader';
import { loadGameToraUmas } from './loaders/uma-loader';
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

const loadedSkills = loadGameToraSkills();
const loadedUmas = loadGameToraUmas();
const loadedSupportCards = loadGameToraSupportCards(loadedSkills.skills);

export const dataRegistry = new DataRegistry({
  skills: new GameToraSkillService(loadedSkills.skills, {
    releasedSkillIds: loadedSkills.releasedSkillIds,
    activationChecks: loadedSkills.activationChecks
  }),
  courses: new CourseService(coursesJson as any),
  umas: new UmaService(loadedUmas.umas, {
    releasedOutfits: loadedUmas.releasedOutfits
  }),
  supportCards: new SupportCardService(loadedSupportCards)
});
