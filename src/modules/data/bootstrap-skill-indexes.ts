import { skillsService } from '@/modules/data/services/SkillService';
import { rebuildTokenizedConditionsCache } from '@/modules/skills/conditions';
import { rebuildSkillFilterLookUp } from '@/modules/skills/skill-filter-lookup';

/**
 * Rebuild the skill-derived index caches. Must run AFTER the skill service has
 * been populated (during data bootstrap / test setup), not as an import
 * side-effect, so it never reads an empty `skillsService`.
 */
export function bootstrapSkillIndexes(): void {
  rebuildTokenizedConditionsCache(skillsService);
  rebuildSkillFilterLookUp(skillsService);
}
