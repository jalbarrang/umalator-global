import type { ISkill } from './types';
import GametoraSkills from '@/modules/data/gametora/skills.json';

/**
 * Skill Relationship Parser
 *
 * Parses the `versions` field from GameTora skills data to build skill family maps.
 * Supports detection of:
 * - Stackable skills (○/◎ tiers)
 * - Gold/White skill relationships
 * - Tier ordering based on cost
 *
 * ## Skill Family Patterns
 *
 * Skills in the same family are grouped by consecutive IDs. The position in the sequence
 * determines the skill type. Debuffs (×) have negative effects and are filtered out when
 * identifying stackable skills.
 *
 * ### Pattern 1: Three White + One Gold (4 skills)
 * Position: Upgrade (◎), Base (○), SelfDebuff (×), Gold
 * - Example: `200011-14` → Right-Handed ◎, Right-Handed ○, Right-Handed ×, Right-Handed Demon
 * - Stackable: Yes (has both ◎ and ○ with positive effects)
 *
 * ### Pattern 2: Three White Only (3 skills)
 * Position: Upgrade (◎), Base (○), SelfDebuff (×)
 * - Example: `200281-83` → Competitive Spirit ◎, Competitive Spirit ○, Wallflower
 * - Stackable: Yes (has both ◎ and ○ with positive effects)
 *
 * ### Pattern 3a: Two White + One Gold (3 skills, Upgrade variant)
 * Position: Upgrade (◎), Base (○), Gold
 * - Example: `201111-13` → Medium Corners ◎, Medium Corners ○, Refraction Arc
 * - Stackable: Yes (has both ◎ and ○ with positive effects)
 *
 * ### Pattern 3b: Two White + One Gold (3 skills, Debuff variant)
 * Position: Gold, Base (○), SelfDebuff (×)
 * - Example: `200331-33` → Professor of Curvature, Corner Adept ○, Corner Adept ×
 * - Stackable: No (only has ○, no ◎ upgrade)
 *
 * ## Skill ID Format
 *
 * Most skills follow a structured ID format:
 * - `|20|033|1|` → Category (20) | SkillID (033) | Variant (1)
 * - `|91|0041|` → Category (91) | SkillID (0041) (no variant for some categories)
 *
 * The variant digit typically indicates:
 * - 1 = Upgrade (◎) or Gold
 * - 2 = Base (○)
 * - 3 = SelfDebuff (×) or Gold (in Pattern 3b)
 * - 4 = Gold (in Pattern 1)
 */

// ============================================================================
// Internal Data Structures
// ============================================================================

/** Map of skill ID to all family member IDs (including self) */
const skillFamilyMap = new Map<number, Array<number>>();

/** Map of skill ID to skill data for quick lookup */
const skillById = new Map<number, ISkill>();

// ============================================================================
// Module Initialization
// ============================================================================

/**
 * Build skill family maps at module load time.
 * Processes all skills once to create lookup tables.
 */
function buildSkillFamilyMaps(): void {
  const skills = GametoraSkills as Array<ISkill>;

  // First pass: Build skillById map
  for (const skill of skills) {
    skillById.set(skill.id, skill);
  }

  // Second pass: Build family map from versions field
  for (const skill of skills) {
    if (!skill.versions || skill.versions.length === 0) {
      // Skill has no family - it's a singleton
      skillFamilyMap.set(skill.id, [skill.id]);
      continue;
    }

    // Build complete family by combining skill ID with all versions
    const family = [skill.id, ...skill.versions];
    // Remove duplicates and sort
    const uniqueFamily = Array.from(new Set(family)).sort((a, b) => a - b);

    skillFamilyMap.set(skill.id, uniqueFamily);
  }
}

// Initialize maps when module loads
buildSkillFamilyMaps();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert string skill ID to number
 */
function toNumberId(skillId: string): number {
  const id = parseInt(skillId, 10);
  if (isNaN(id)) {
    throw new Error(`Invalid skill ID: ${skillId}`);
  }
  return id;
}

/**
 * Get skill data by ID
 */
function getSkill(skillId: number): ISkill | undefined {
  return skillById.get(skillId);
}

/**
 * Check if a skill has positive effects (not a debuff)
 */
function hasPositiveEffects(skill: ISkill): boolean {
  if (!skill.condition_groups || skill.condition_groups.length === 0) {
    return false;
  }

  // Check if any effect has a positive value
  for (const group of skill.condition_groups) {
    for (const effect of group.effects) {
      // Positive value means buff, negative means debuff
      if (effect.value > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all white (rarity=1) skills from a family, excluding debuffs
 */
function getWhiteSkillsInFamily(familyIds: Array<number>): Array<ISkill> {
  const whiteSkills: Array<ISkill> = [];

  for (const id of familyIds) {
    const skill = getSkill(id);
    if (skill && skill.rarity === 1 && hasPositiveEffects(skill)) {
      whiteSkills.push(skill);
    }
  }

  return whiteSkills;
}

/**
 * Get gold (rarity=2) skill from a family
 */
function getGoldSkillInFamily(familyIds: Array<number>): ISkill | undefined {
  for (const id of familyIds) {
    const skill = getSkill(id);
    if (skill && skill.rarity === 2) {
      return skill;
    }
  }
  return undefined;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all skill IDs in the same family as the given skill.
 * Includes the skill itself.
 *
 * @param skillId - The skill ID to look up
 * @returns Array of all related skill IDs (as strings)
 *
 * @example
 * getSkillFamily("200011") // returns ["200011", "200012", "200013", "200014"]
 */
export function getSkillFamily(skillId: string): Array<string> {
  const numId = toNumberId(skillId);
  const family = skillFamilyMap.get(numId);

  if (!family) {
    // Skill not found - return just the ID itself
    return [skillId];
  }

  return family.map((id) => id.toString());
}

/**
 * Check if a skill is stackable (has base and upgrade tiers).
 * A skill is stackable if:
 * - It has rarity=1 (white)
 * - It has positive effects (not a debuff)
 * - Its family contains 2+ white skills with positive effects
 *
 * @param skillId - The skill ID to check
 * @returns true if the skill is stackable
 *
 * @example
 * isStackableSkill("200011") // true (Right-Handed ◎ has upgrade and base)
 * isStackableSkill("200012") // true (Right-Handed ○ has upgrade and base)
 * isStackableSkill("200013") // false (Right-Handed × is a debuff)
 * isStackableSkill("200332") // false (Corner Adept ○ has no ◎ version)
 */
export function isStackableSkill(skillId: string): boolean {
  const numId = toNumberId(skillId);
  const skill = getSkill(numId);

  if (!skill || skill.rarity !== 1) {
    return false;
  }

  // Debuff skills themselves are not stackable
  if (!hasPositiveEffects(skill)) {
    return false;
  }

  const family = skillFamilyMap.get(numId);
  if (!family) {
    return false;
  }

  const whiteSkills = getWhiteSkillsInFamily(family);

  // Need at least 2 white skills (base and upgrade) to be stackable
  return whiteSkills.length >= 2;
}

/**
 * Get the gold (rarity=2) version of a white skill, if it exists.
 *
 * @param whiteSkillId - The white skill ID
 * @returns The gold skill ID, or undefined if no gold version exists
 *
 * @example
 * getGoldVersion("200332") // "200331" (gold version of Corner Adept)
 */
export function getGoldVersion(whiteSkillId: string): string | undefined {
  const numId = toNumberId(whiteSkillId);
  const skill = getSkill(numId);

  if (!skill || skill.rarity !== 1) {
    return undefined;
  }

  const family = skillFamilyMap.get(numId);
  if (!family) {
    return undefined;
  }

  const goldSkill = getGoldSkillInFamily(family);
  return goldSkill ? goldSkill.id.toString() : undefined;
}

/**
 * Get the white (rarity=1) version(s) of a gold skill.
 * Returns the base tier white skill.
 *
 * @param goldSkillId - The gold skill ID
 * @returns The base tier white skill ID, or undefined if no white version exists
 *
 * @example
 * getWhiteVersion("200331") // "200332" (white ○ version of Archline Professor)
 */
export function getWhiteVersion(goldSkillId: string): string | undefined {
  const numId = toNumberId(goldSkillId);
  const skill = getSkill(numId);

  if (!skill || skill.rarity !== 2) {
    return undefined;
  }

  const family = skillFamilyMap.get(numId);
  if (!family) {
    return undefined;
  }

  const whiteSkills = getWhiteSkillsInFamily(family);

  if (whiteSkills.length === 0) {
    return undefined;
  }

  // Return the base tier (lowest cost)
  const baseTier = whiteSkills.sort((a, b) => {
    const costA = a.cost ?? Infinity;
    const costB = b.cost ?? Infinity;
    return costA - costB;
  })[0];

  return baseTier ? baseTier.id.toString() : undefined;
}

/**
 * Get the base tier (○) of a stackable skill.
 * If the skill is not stackable, returns the skill itself.
 *
 * @param skillId - The skill ID
 * @returns The base tier skill ID
 *
 * @example
 * getBaseTier("200332") // "200332" (already base tier)
 * getBaseTier("200333") // "200332" (base tier of the upgrade)
 */
export function getBaseTier(skillId: string): string {
  const numId = toNumberId(skillId);
  const skill = getSkill(numId);

  if (!skill || skill.rarity !== 1) {
    return skillId;
  }

  const family = skillFamilyMap.get(numId);
  if (!family) {
    return skillId;
  }

  const whiteSkills = getWhiteSkillsInFamily(family);

  if (whiteSkills.length < 2) {
    // Not stackable
    return skillId;
  }

  // Sort by cost ascending - lowest cost is base tier
  const sorted = whiteSkills.sort((a, b) => {
    const costA = a.cost ?? Infinity;
    const costB = b.cost ?? Infinity;
    return costA - costB;
  });

  return sorted[0].id.toString();
}

/**
 * Get the upgrade tier (◎) of a stackable skill, if it exists.
 *
 * @param skillId - The skill ID (should be base tier)
 * @returns The upgrade tier skill ID, or undefined if no upgrade exists
 *
 * @example
 * getUpgradeTier("200332") // "200333" (upgrade tier exists)
 * getUpgradeTier("200011") // undefined (no upgrade tier)
 */
export function getUpgradeTier(skillId: string): string | undefined {
  const numId = toNumberId(skillId);
  const skill = getSkill(numId);

  if (!skill || skill.rarity !== 1) {
    return undefined;
  }

  const family = skillFamilyMap.get(numId);
  if (!family) {
    return undefined;
  }

  const whiteSkills = getWhiteSkillsInFamily(family);

  // Sort by ID (Lowest is upgrade, highest is base / debuff)
  const sorted = whiteSkills.toSorted((a, b) => a.id - b.id);

  // Find current skill in sorted list
  const currentIndex = sorted.findIndex((s) => s.id === numId);

  if (currentIndex === -1) {
    // Skill not found or already at highest tier
    console.log('Skill not found or already at highest tier');
    return undefined;
  }

  const nextTier = sorted[currentIndex - 1] ?? undefined;

  if (!nextTier) {
    return undefined;
  }

  // Return next tier
  return nextTier.id.toString();
}
