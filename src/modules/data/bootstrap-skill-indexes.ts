import { skillsService } from '@/modules/data/registry';
import { rebuildTokenizedConditionsCache } from '@/modules/skills/conditions';
import { rebuildSkillFilterLookUp } from '@/modules/skills/skill-filter-lookup';

rebuildTokenizedConditionsCache(skillsService);
rebuildSkillFilterLookUp(skillsService);
