import skillsJson from '@/modules/data/json/skills.json';
import coursesJson from '@/modules/data/json/course_data.json';
import umasJson from '@/modules/data/json/umas.json';

import { SkillService } from './services/SkillService';
import { CourseService } from './services/CourseService';
import { UmaService } from './services/UmaService';

export type DataServices = {
  skills: SkillService;
  courses: CourseService;
  umas: UmaService;
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
}

export const dataRegistry = new DataRegistry({
  skills: new SkillService(skillsJson as any),
  courses: new CourseService(coursesJson as any),
  umas: new UmaService(umasJson as any)
});
