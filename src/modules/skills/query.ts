import { skillFilterLookUp, type Skill } from '@/modules/skills/utils';
import { SkillRarity } from '../simulation/lib/race-solver/types';

// A predicate that takes a skill and returns whether it passes
type SkillPredicate = (skill: Skill) => boolean;

/**
 * Simple fuzzy match - checks if all chars in pattern appear in order in target
 * Returns a score (higher is better match), or -1 for no match
 */
function fuzzyMatch(pattern: string, target: string): number {
  const patternLower = pattern.toLowerCase();
  const targetLower = target.toLowerCase();

  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (
    let i = 0;
    i < targetLower.length && patternIdx < patternLower.length;
    i++
  ) {
    if (targetLower[i] === patternLower[patternIdx]) {
      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) score += 2;
      // Bonus for matching at start or after separator
      if (i === 0 || targetLower[i - 1] === ' ') score += 3;
      score += 1;
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  // All pattern chars must be found
  return patternIdx === patternLower.length ? score : -1;
}

/**
 * SQL-like query builder for filtering skills
 *
 * Usage:
 *   const results = SkillQuery.from(skills)
 *     .whereText(searchText)
 *     .whereAny('rarity', activeRarities, matchRarity)
 *     .whereAny('icontype', activeIcons, matchIconType)
 *     .whereCondition('strategy', activeStrategies, filterOps)
 *     .execute();
 */
export class SkillQuery {
  private skills: Skill[];
  private predicates: SkillPredicate[] = [];
  private textSearchState = { allowConditionSearch: true };

  private constructor(skills: Skill[]) {
    this.skills = skills;
  }

  static from(skills: Skill[]): SkillQuery {
    return new SkillQuery(skills);
  }

  /**
   * WHERE skill has valid meta (null check)
   */
  whereValid(): this {
    this.predicates.push((skill) => skill.meta !== null && skill.data !== null);
    return this;
  }

  /**
   * WHERE text matches name or condition
   * Handles the special "allowConditionSearch" state internally
   */
  whereText(searchText: string): this {
    if (searchText.length === 0) return this;

    this.predicates.push((skill) => {
      // Exact substring match gets priority
      if (skill.name.toUpperCase().includes(searchText.toUpperCase())) {
        return true;
      }

      // Fall back to fuzzy match
      return fuzzyMatch(searchText, skill.name) > 0;
    });

    return this;
  }

  /**
   * WHERE skill matches ANY of the provided values (OR within group)
   * Skips if no values are active (no filter applied)
   */
  whereAny<T>(
    activeValues: T[],
    matchFn: (skill: Skill, value: T) => boolean,
  ): this {
    if (activeValues.length === 0) return this;

    this.predicates.push((skill) =>
      activeValues.some((value) => matchFn(skill, value)),
    );

    return this;
  }

  /**
   * WHERE skill's condition tree matches ANY of the filter operations
   * Used for strategy, distance, surface, location filters
   */
  whereConditionMatch(activeFilters: string[]): this {
    if (activeFilters.length === 0) return this;

    this.predicates.push((skill) =>
      activeFilters.some((filterKey) =>
        skillFilterLookUp[filterKey].has(skill.id),
      ),
    );

    return this;
  }

  /**
   * WHERE custom predicate
   */
  where(predicate: SkillPredicate): this {
    this.predicates.push(predicate);
    return this;
  }

  /**
   * Execute the query and return filtered skills
   * All predicates are ANDed together
   */
  execute(): Skill[] {
    // Reset text search state for each execution
    this.textSearchState.allowConditionSearch = true;

    return this.skills.filter((skill) =>
      this.predicates.every((predicate) => predicate(skill)),
    );
  }
}

// Helper matchers that work with Skill objects directly
export const SkillMatchers = {
  rarity:
    (rarityKey: string) =>
    (skill: Skill): boolean => {
      if (!skill.data) return false;
      const rarity = skill.data.rarity;

      switch (rarityKey) {
        case 'white':
          return rarity === SkillRarity.White && !skill.id.startsWith('9');
        case 'gold':
          return rarity === SkillRarity.Gold;
        case 'pink':
          return rarity === SkillRarity.Evolution;
        case 'unique':
          return rarity > SkillRarity.Gold && rarity < SkillRarity.Evolution;
        case 'inherit':
          return skill.id.startsWith('9');
        default:
          return true;
      }
    },

  iconType:
    (iconPrefixes: Record<string, string[]>) =>
    (iconKey: string) =>
    (skill: Skill): boolean => {
      if (!skill.meta) return false;
      return (
        iconPrefixes[iconKey]?.some((p) => skill.meta.iconId.startsWith(p)) ??
        false
      );
    },
};
