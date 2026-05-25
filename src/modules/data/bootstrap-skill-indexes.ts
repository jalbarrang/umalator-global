import { skillsService } from '@/modules/data/services/SkillService';
import { rebuildTokenizedConditionsCache } from '@/modules/skills/conditions';
import { rebuildSkillFilterLookUp } from '@/modules/skills/skill-filter-lookup';

rebuildTokenizedConditionsCache(skillsService);
rebuildSkillFilterLookUp(skillsService);
