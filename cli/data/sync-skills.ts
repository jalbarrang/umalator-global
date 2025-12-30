// scripts/sync_from_gametora.ts
import fs from 'node:fs';
import path from 'node:path';
import { sortByNumericKey, writeJsonFile } from '../../scripts/lib/shared';
import type { ISkill } from '@/modules/skills/types';

// Target file structures
interface SkillDataEntry {
  rarity: number;
  alternatives: Array<{
    baseDuration: number;
    condition: string;
    precondition: string;
    effects: Array<{
      type: number;
      modifier: number;
      target: number;
    }>;
  }>;
}

interface SkillMetaEntry {
  groupId: number;
  iconId: string;
  baseCost: number;
  order: number;
}

type SkillNamesEntry = [string];

// Filter configuration
export interface FilterConfig {
  // Filter by skill ID ranges (useful for syncing by time period)
  idRanges?: Array<{ min: number; max: number }>;
  // Only include these specific IDs
  includeIds?: Array<number>;
  // Exclude these specific IDs
  excludeIds?: Array<number>;
  // Only sync skills that don't exist in target files
  onlyNew?: boolean;
  // Sync skills from a specific character/outfit ID
  specificCharId?: number;
  // Sync skills from multiple character/outfit IDs
  specificCharIds?: Array<number>;
  // Dry run - show what would be synced without writing
  dryRun?: boolean;
  // Verbose output
  verbose?: boolean;
}

function shouldIncludeSkill(
  skill: ISkill,
  skillId: number,
  config: FilterConfig,
  existingIds: Set<string>,
): boolean {
  const idStr = skillId.toString();

  // Skip rarity 6 skills (not in game yet)
  if (skill.rarity === 6) {
    return false;
  }

  // Skip if only syncing new and it already exists
  if (config.onlyNew && existingIds.has(idStr)) {
    return false;
  }

  // Check exclusions first
  if (config.excludeIds?.includes(skillId)) {
    return false;
  }

  // Check specific character ID (filter by exact outfit)
  if (config.specificCharId !== undefined) {
    // If filtering by character, ONLY include skills that have this char ID
    if (!skill.char || !skill.char.includes(config.specificCharId)) {
      return false;
    }
    // If the skill has the char ID, include it (ignore other filters)
    return true;
  }

  // Check multiple specific character IDs (filter by exact outfits)
  if (config.specificCharIds !== undefined && config.specificCharIds.length > 0) {
    // If filtering by characters, ONLY include skills that have at least one of these char IDs
    if (!skill.char || !config.specificCharIds.some((charId) => skill.char!.includes(charId))) {
      return false;
    }
    // If the skill has any of the char IDs, include it (ignore other filters)
    return true;
  }

  // Check specific inclusions
  if (config.includeIds && config.includeIds.length > 0) {
    return config.includeIds.includes(skillId);
  }

  // Check ranges
  if (config.idRanges && config.idRanges.length > 0) {
    return config.idRanges.some((range) => skillId >= range.min && skillId <= range.max);
  }

  // Default: include all
  return true;
}

function convertSkillToData(skill: ISkill, useEnglishVersion: boolean = true): SkillDataEntry {
  // Use English-specific conditions if available and requested, otherwise use default
  const conditionGroups =
    useEnglishVersion && skill.loc?.en?.condition_groups
      ? skill.loc.en.condition_groups
      : skill.condition_groups;

  return {
    rarity: skill.rarity,
    alternatives: conditionGroups.map((cg) => ({
      baseDuration: cg.base_time,
      condition: cg.condition,
      precondition: cg.precondition || '',
      effects: cg.effects.map((e) => ({
        type: e.type,
        modifier: e.value,
        target: e.target || 1, // Default to 1 (self) if not specified
      })),
    })),
  };
}

function convertGeneVersionToData(
  skill: ISkill,
  useEnglishVersion: boolean = true,
): SkillDataEntry | null {
  if (!skill.gene_version) return null;

  // IMPORTANT: For gene version, check English localization first
  const conditionGroups =
    useEnglishVersion && skill.loc?.en?.gene_version?.condition_groups
      ? skill.loc.en.gene_version.condition_groups
      : skill.gene_version.condition_groups;

  return {
    rarity: skill.gene_version.rarity,
    alternatives: conditionGroups.map((cg) => ({
      baseDuration: cg.base_time,
      condition: cg.condition,
      precondition: cg.precondition || '',
      effects: cg.effects.map((e) => ({
        type: e.type,
        modifier: e.value,
        target: e.target || 1,
      })),
    })),
  };
}

function convertSkillToMeta(skill: ISkill): SkillMetaEntry {
  return {
    groupId: Math.floor(skill.id / 10),
    iconId: skill.iconid.toString(),
    baseCost: skill.cost || 0,
    order: 10, // Default order
  };
}

function convertGeneVersionToMeta(skill: ISkill): SkillMetaEntry | null {
  if (!skill.gene_version) return null;

  return {
    groupId: Math.floor(skill.gene_version.id / 10),
    iconId: skill.gene_version.iconid.toString(),
    baseCost: skill.gene_version.cost || 0,
    order: 10,
  };
}

function getSkillName(skill: ISkill): string {
  return skill.name_en || skill.enname;
}

function getGeneVersionName(skill: ISkill): string | null {
  if (!skill.gene_version) return null;
  return skill.gene_version.name_en || skill.enname;
}

export async function syncSkills(config: FilterConfig = {}) {
  const basePath = path.join(process.cwd(), 'src/modules/data');

  console.log('📖 Reading gametora skills...');
  const gametoraSkills: Array<ISkill> = JSON.parse(
    fs.readFileSync(path.join(basePath, 'gametora/skills.json'), 'utf-8'),
  );

  console.log(`   Found ${gametoraSkills.length} skills in gametora data\n`);

  // Read existing files
  console.log('📖 Reading existing data files...');
  const existingSkillData: Record<string, SkillDataEntry> = JSON.parse(
    fs.readFileSync(path.join(basePath, 'skill_data.json'), 'utf-8'),
  );
  const existingSkillMeta: Record<string, SkillMetaEntry> = JSON.parse(
    fs.readFileSync(path.join(basePath, 'skill_meta.json'), 'utf-8'),
  );
  const existingSkillNames: Record<string, SkillNamesEntry> = JSON.parse(
    fs.readFileSync(path.join(basePath, 'skillnames.json'), 'utf-8'),
  );

  const existingIds = new Set(Object.keys(existingSkillData));
  console.log(`   skill_data.json: ${Object.keys(existingSkillData).length} skills`);
  console.log(`   skill_meta.json: ${Object.keys(existingSkillMeta).length} skills`);
  console.log(`   skillnames.json: ${Object.keys(existingSkillNames).length} skills\n`);

  // Process skills
  const newSkillData: Record<string, SkillDataEntry> = {};
  const newSkillMeta: Record<string, SkillMetaEntry> = {};
  const newSkillNames: Record<string, SkillNamesEntry> = {};

  let mainSkillsProcessed = 0;
  let geneSkillsProcessed = 0;

  const processedIds: Set<number> = new Set();
  const processedSkills: Map<number, { id: number; name: string }> = new Map();

  const skillVersionsToInclude = new Set<number>(); // Track skill versions to include

  // First pass: find all skills to include and their versions
  for (const skill of gametoraSkills) {
    if (shouldIncludeSkill(skill, skill.id, config, existingIds)) {
      skillVersionsToInclude.add(skill.id);

      // If this skill has versions, include those too
      if (skill.versions) {
        skill.versions.forEach((versionId) => skillVersionsToInclude.add(versionId));
      }
    }
  }

  // Second pass: process all skills that should be included
  for (const skill of gametoraSkills) {
    // Process main skill (either matched directly or included as a version)
    if (skillVersionsToInclude.has(skill.id)) {
      const idStr = skill.id.toString();
      const skillName = getSkillName(skill);
      newSkillData[idStr] = convertSkillToData(skill, true);
      newSkillMeta[idStr] = convertSkillToMeta(skill);
      newSkillNames[idStr] = [skillName];
      mainSkillsProcessed++;
      processedIds.add(skill.id);
      processedSkills.set(skill.id, { id: skill.id, name: skillName });

      if (config.verbose) {
        console.log(`  ✓ ${skill.id}: ${skillName}`);
      }
    }

    // Process gene version (inherited skill)
    if (skill.gene_version) {
      const geneId = skill.gene_version.id;

      if (skillVersionsToInclude.has(skill.id)) {
        // Include gene version if main skill is included
        const idStr = geneId.toString();
        const geneData = convertGeneVersionToData(skill, true);
        const geneMeta = convertGeneVersionToMeta(skill);
        const geneName = getGeneVersionName(skill);

        if (geneData && geneMeta && geneName) {
          newSkillData[idStr] = geneData;
          newSkillMeta[idStr] = geneMeta;
          newSkillNames[idStr] = [geneName];

          geneSkillsProcessed++;

          processedIds.add(geneId);

          processedSkills.set(geneId, {
            id: geneId,
            name: `${geneName} (inherited)`,
          });

          if (config.verbose) {
            console.log(`  ✓ ${geneId}: ${geneName} (inherited)`);
          }
        }
      }
    }
  }

  console.log('✨ Processing complete:');
  console.log(`   Main skills to sync: ${mainSkillsProcessed}`);
  console.log(`   Gene skills to sync: ${geneSkillsProcessed}`);
  console.log(`   Total: ${mainSkillsProcessed + geneSkillsProcessed} skills\n`);

  if (config.dryRun) {
    console.log('🔍 DRY RUN - No files will be written\n');
    console.log('Skill IDs that would be synced:');
    console.log(Array.from(processedIds).sort((a, b) => a - b));

    // Group by ranges for easier reading
    const ranges: Array<{ start: number; end: number }> = [];
    for (const id of processedIds) {
      if (ranges.length === 0 || id - ranges[ranges.length - 1].end > 1) {
        ranges.push({ start: id, end: id });
      } else {
        ranges[ranges.length - 1].end = id;
      }
    }

    ranges.forEach((r) => {
      if (r.start === r.end) {
        console.log(`  ${r.start}`);
      } else {
        console.log(`  ${r.start}-${r.end}`);
      }
    });

    return {
      mainSkills: mainSkillsProcessed,
      geneSkills: geneSkillsProcessed,
      total: mainSkillsProcessed + geneSkillsProcessed,
      processedIds,
      processedSkills,
      dryRun: true,
    };
  }

  // Merge with existing data
  const mergedSkillData = { ...existingSkillData, ...newSkillData };
  const mergedSkillMeta = { ...existingSkillMeta, ...newSkillMeta };
  const mergedSkillNames = { ...existingSkillNames, ...newSkillNames };

  // Sort by numeric ID
  const sortedSkillData = sortByNumericKey(mergedSkillData);
  const sortedSkillMeta = sortByNumericKey(mergedSkillMeta);
  const sortedSkillNames = sortByNumericKey(mergedSkillNames);

  // Write files (minified)
  await writeJsonFile(path.join(basePath, 'skill_data.json'), sortedSkillData);
  await writeJsonFile(path.join(basePath, 'skill_meta.json'), sortedSkillMeta);
  await writeJsonFile(path.join(basePath, 'skillnames.json'), sortedSkillNames);

  return {
    mainSkills: mainSkillsProcessed,
    geneSkills: geneSkillsProcessed,
    total: mainSkillsProcessed + geneSkillsProcessed,
    processedIds,
    processedSkills,
    dryRun: false,
  };
}
