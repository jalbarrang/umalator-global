import { dataRegistry } from './registry';
import { SkillService } from './services/SkillService';
import { CourseService } from './services/CourseService';
import { UmaService } from './services/UmaService';
import skillsJson from './json/skills.json';
import coursesJson from './json/course_data.json';
import umasJson from './json/umas.json';

export function bootstrapDataServices() {
  if (dataRegistry.isInitialized) return;
  dataRegistry.init({
    skills: new SkillService(skillsJson as any),
    courses: new CourseService(coursesJson as any),
    umas: new UmaService(umasJson as any),
  });
}

// Self-executing: ensures data services are available before any other module
// accesses them. ESM hoists static imports, so the function-call pattern in
// main.tsx doesn't guarantee ordering. This side-effect import does.
bootstrapDataServices();