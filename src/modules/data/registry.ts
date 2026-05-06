import type { SkillService } from './services/SkillService';
import type { CourseService } from './services/CourseService';
import type { UmaService } from './services/UmaService';

export type DataServices = {
  skills: SkillService;
  courses: CourseService;
  umas: UmaService;
};

let _services: DataServices | null = null;

export const dataRegistry = {
  get isInitialized(): boolean {
    return _services !== null;
  },

  init(services: DataServices) {
    _services = services;
  },

  get skills(): SkillService {
    if (!_services) throw new Error('DataRegistry not initialized — call dataRegistry.init() first');
    return _services.skills;
  },

  get courses(): CourseService {
    if (!_services) throw new Error('DataRegistry not initialized — call dataRegistry.init() first');
    return _services.courses;
  },

  get umas(): UmaService {
    if (!_services) throw new Error('DataRegistry not initialized — call dataRegistry.init() first');
    return _services.umas;
  },
};