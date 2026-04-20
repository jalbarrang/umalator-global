import skillsJson from '../modules/data/global/skills.json';
import umasJson from '../modules/data/global/umas.json';
import coursesJson from '../modules/data/global/course_data.json';
import trackNamesJson from '../modules/data/global/tracknames.json';
import {
  initializeDataRuntime,
  type SnapshotCatalog,
} from '@/modules/data/runtime';

initializeDataRuntime({
  snapshot: 'global',
  catalog: {
    skills: skillsJson as SnapshotCatalog['skills'],
    umas: umasJson as SnapshotCatalog['umas'],
    courses: coursesJson as SnapshotCatalog['courses'],
    trackNames: trackNamesJson as unknown as SnapshotCatalog['trackNames'],
    courseGeometryPath: '/data/global/course_geometry.json',
  },
});
