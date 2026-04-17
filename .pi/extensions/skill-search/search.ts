import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export type SkillEffect = {
  type: number;
  modifier: number;
  target?: number;
};

export type SkillAlternative = {
  precondition?: string;
  condition: string;
  baseDuration: number;
  effects: Array<SkillEffect>;
};

export type SkillEntry = {
  id: string;
  rarity: number;
  groupId: number;
  versions: Array<number>;
  iconId: string;
  baseCost: number;
  order: number;
  name: string;
  character: Array<number>;
  alternatives: Array<SkillAlternative>;
};

export type SkillSearchFilters = {
  query?: string;
  name?: string;
  condition?: string;
  groupId?: number;
  familyOf?: string;
  types?: Array<string>;
  limit?: number;
};

export type SkillSearchResult = {
  id: string;
  name: string;
  rarity: number;
  rarityName: string;
  groupId: number;
  baseCost: number;
  versions: Array<string>;
  familyIds: Array<string>;
  familyNames: Array<string>;
  conditions: Array<string>;
  effectTypeIds: Array<number>;
  effectTypeNames: Array<string>;
};

export type SkillSearchResponse = {
  filters: Required<Pick<SkillSearchFilters, 'limit'>> & SkillSearchFilters;
  totalMatches: number;
  shown: number;
  notes: Array<string>;
  results: Array<SkillSearchResult>;
};

type SkillDataset = {
  skills: Array<SkillEntry>;
  byId: Map<string, SkillEntry>;
  byGroupId: Map<number, Array<SkillEntry>>;
  familyMap: Map<string, Array<string>>;
};

const SKILLS_JSON_PATH = resolve(process.cwd(), 'src/modules/data/skills.json');

let cachedPath: string | undefined;
let cachedMtimeMs: number | undefined;
let cachedDataset: SkillDataset | undefined;

const EFFECT_TYPE_NAMES: Record<number, string> = {
  0: 'Noop',
  1: 'Speed Up',
  2: 'Stamina Up',
  3: 'Power Up',
  4: 'Guts Up',
  5: 'Wisdom Up',
  9: 'Recovery',
  10: 'Multiply Start Delay',
  14: 'Set Start Delay',
  21: 'Current Speed',
  22: 'Current Speed With Natural Deceleration',
  27: 'Target Speed',
  28: 'Lane Movement Speed',
  31: 'Acceleration',
  35: 'Change Lane',
  37: 'Activate Random Gold',
  42: 'Extend Evolved Duration',
};

const RARITY_NAMES: Record<number, string> = {
  1: 'White',
  2: 'Gold',
  3: 'Unique',
  4: 'Unique',
  5: 'Unique',
  6: 'Evolution',
};

const EFFECT_TYPE_ALIASES: Record<string, number> = {
  '0': 0,
  noop: 0,
  '1': 1,
  speed: 1,
  speedup: 1,
  'speedupskill': 1,
  '2': 2,
  stamina: 2,
  staminaup: 2,
  '3': 3,
  power: 3,
  powerup: 3,
  '4': 4,
  guts: 4,
  gutsup: 4,
  '5': 5,
  wisdom: 5,
  wit: 5,
  wisdomup: 5,
  witup: 5,
  '9': 9,
  recovery: 9,
  heal: 9,
  hp: 9,
  hpdrain: 9,
  drain: 9,
  '10': 10,
  multiplystartdelay: 10,
  startdelaymultiplier: 10,
  '14': 14,
  setstartdelay: 14,
  startdelay: 14,
  '21': 21,
  currentspeed: 21,
  actualspeed: 21,
  '22': 22,
  currentspeedwithnaturaldeceleration: 22,
  naturaldeceleration: 22,
  '27': 27,
  targetspeed: 27,
  targetspeedup: 27,
  '28': 28,
  lanemovement: 28,
  lanemovementspeed: 28,
  lanechange: 28,
  '31': 31,
  accel: 31,
  acceleration: 31,
  '35': 35,
  changelane: 35,
  '37': 37,
  activaterandomgold: 37,
  randomgold: 37,
  '42': 42,
  extendevolvedduration: 42,
  evolvedduration: 42,
};

type NameMatchKind = 'exact' | 'substring' | 'token' | 'fuzzy';

type NameMatch = {
  score: number;
  kind: NameMatchKind;
};

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_\-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCompact(value: string): string {
  return normalize(value).replace(/\s+/g, '');
}

function tokenize(value: string): Array<string> {
  return normalize(value).split(' ').filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = new Array<number>(b.length + 1).fill(0).map((_, index) => index);
  const current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function getEnglishNameMatch(candidateName: string, searchText: string): NameMatch | null {
  const candidate = normalize(candidateName);
  const needle = normalize(searchText);
  if (!candidate || !needle) {
    return null;
  }

  const candidateCompact = normalizeCompact(candidateName);
  const needleCompact = normalizeCompact(searchText);

  if (candidate === needle || candidateCompact === needleCompact) {
    return { score: 1, kind: 'exact' };
  }

  if (
    candidate.startsWith(needle) ||
    candidate.includes(needle) ||
    candidateCompact.includes(needleCompact)
  ) {
    return {
      score: candidate.startsWith(needle) ? 0.97 : 0.94,
      kind: 'substring',
    };
  }

  const candidateTokens = tokenize(candidateName);
  const needleTokens = tokenize(searchText);
  if (
    needleTokens.length > 1 &&
    needleTokens.every((token) =>
      candidateTokens.some((candidateToken) => candidateToken.startsWith(token) || candidateToken.includes(token)),
    )
  ) {
    return { score: 0.9, kind: 'token' };
  }

  if (needleCompact.length >= 4) {
    const compactSimilarity = similarity(candidateCompact, needleCompact);
    const spacedSimilarity = similarity(candidate, needle);
    const best = Math.max(compactSimilarity, spacedSimilarity);
    if (best >= 0.74) {
      return { score: best, kind: 'fuzzy' };
    }
  }

  return null;
}

function unique<T>(values: Iterable<T>): Array<T> {
  return Array.from(new Set(values));
}

function safeList(value: string | undefined): Array<string> {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function getEffectTypeName(typeId: number): string {
  return EFFECT_TYPE_NAMES[typeId] ?? `Type ${typeId}`;
}

function getRarityName(rarity: number): string {
  return RARITY_NAMES[rarity] ?? `Rarity ${rarity}`;
}

function resolveEffectTypeIds(types: Array<string> | undefined): Array<number> {
  if (!types || types.length === 0) {
    return [];
  }

  const ids: Array<number> = [];
  for (const type of types) {
    const normalized = normalize(type).replace(/\s+/g, '');
    const direct = Number(type);
    if (Number.isInteger(direct) && String(direct) === type.trim()) {
      ids.push(direct);
      continue;
    }

    const alias = EFFECT_TYPE_ALIASES[normalized];
    if (alias !== undefined) {
      ids.push(alias);
    }
  }

  return unique(ids);
}

function getSkillConditions(skill: SkillEntry): Array<string> {
  const conditions: Array<string> = [];
  for (const alternative of skill.alternatives ?? []) {
    if (alternative.precondition) {
      conditions.push(`pre:${alternative.precondition}`);
    }
    if (alternative.condition) {
      conditions.push(alternative.condition);
    }
  }
  return unique(conditions);
}

function getSkillEffectTypeIds(skill: SkillEntry): Array<number> {
  const ids: Array<number> = [];
  for (const alternative of skill.alternatives ?? []) {
    for (const effect of alternative.effects ?? []) {
      ids.push(effect.type);
    }
  }
  return unique(ids).sort((a, b) => a - b);
}

function buildDatasetFromPath(path: string): SkillDataset {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, SkillEntry>;
  const skills = Object.values(raw);
  const byId = new Map<string, SkillEntry>(skills.map((skill) => [skill.id, skill]));
  const byGroupId = new Map<number, Array<SkillEntry>>();

  for (const skill of skills) {
    const existing = byGroupId.get(skill.groupId) ?? [];
    existing.push(skill);
    byGroupId.set(skill.groupId, existing);
  }

  const familyMap = new Map<string, Array<string>>();
  for (const skill of skills) {
    const visited = new Set<string>();
    const queue: Array<string> = [skill.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      const current = byId.get(currentId);
      if (!current) {
        continue;
      }

      for (const versionId of current.versions.map(String)) {
        if (!visited.has(versionId)) {
          queue.push(versionId);
        }
      }

      const groupMembers = byGroupId.get(current.groupId) ?? [];
      for (const member of groupMembers) {
        if (!visited.has(member.id)) {
          queue.push(member.id);
        }
      }
    }

    familyMap.set(skill.id, Array.from(visited).sort());
  }

  return { skills, byId, byGroupId, familyMap };
}

function loadDataset(cwd: string): SkillDataset {
  const path = resolve(cwd, 'src/modules/data/skills.json');
  const mtimeMs = statSync(path).mtimeMs;

  if (cachedDataset && cachedPath === path && cachedMtimeMs === mtimeMs) {
    return cachedDataset;
  }

  cachedDataset = buildDatasetFromPath(path);
  cachedPath = path;
  cachedMtimeMs = mtimeMs;
  return cachedDataset;
}

function resolveSkillMatches(dataset: SkillDataset, reference: string): Array<SkillEntry> {
  const trimmed = reference.trim();
  if (!trimmed) {
    return [];
  }

  const direct = dataset.byId.get(trimmed);
  if (direct) {
    return [direct];
  }

  return dataset.skills
    .map((skill) => ({ skill, match: getEnglishNameMatch(skill.name, trimmed) }))
    .filter((entry): entry is { skill: SkillEntry; match: NameMatch } => entry.match !== null)
    .sort((a, b) => b.match.score - a.match.score || a.skill.order - b.skill.order)
    .map((entry) => entry.skill);
}

function scoreSkill(skill: SkillEntry, dataset: SkillDataset, filters: SkillSearchFilters): number {
  let score = 0;
  const normalizedName = normalize(skill.name);
  const joinedConditions = getSkillConditions(skill).join(' ');
  const normalizedConditions = normalize(joinedConditions);

  if (filters.name) {
    const nameMatch = getEnglishNameMatch(skill.name, filters.name);
    if (nameMatch) {
      score += 120 + nameMatch.score * 100;
      if (nameMatch.kind === 'exact') score += 40;
    }
  }

  if (filters.query) {
    const needle = normalize(filters.query);
    if (skill.id === filters.query.trim()) score += 220;
    if (String(skill.groupId) === filters.query.trim()) score += 180;

    const nameMatch = getEnglishNameMatch(skill.name, filters.query);
    if (nameMatch) {
      score += 70 + nameMatch.score * 110;
      if (nameMatch.kind === 'exact') score += 20;
    }

    if (normalizedConditions.includes(needle)) score += 60;
  }

  if (filters.condition) {
    const needle = normalize(filters.condition);
    if (normalizedConditions.includes(needle)) score += 140;
  }

  if (filters.familyOf) {
    const familyIds = dataset.familyMap.get(skill.id) ?? [skill.id];
    const familyNames = familyIds
      .map((id) => dataset.byId.get(id)?.name)
      .filter((name): name is string => Boolean(name))
      .join(' ');
    if (normalize(familyNames).includes(normalize(filters.familyOf))) {
      score += 80;
    }
  }

  score -= skill.order / 1_000_000;
  return score;
}

function matchesAnyText(skill: SkillEntry, filterText: string): boolean {
  const needle = normalize(filterText);
  if (!needle) return true;

  if (skill.id === filterText.trim()) return true;
  if (String(skill.groupId) === filterText.trim()) return true;
  if (getEnglishNameMatch(skill.name, filterText)) return true;

  const joinedConditions = getSkillConditions(skill).join(' ');
  if (normalize(joinedConditions).includes(needle)) return true;

  return false;
}

function toResult(skill: SkillEntry, dataset: SkillDataset): SkillSearchResult {
  const familyIds = dataset.familyMap.get(skill.id) ?? [skill.id];
  const familyNames = familyIds
    .map((id) => dataset.byId.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  const effectTypeIds = getSkillEffectTypeIds(skill);

  return {
    id: skill.id,
    name: skill.name,
    rarity: skill.rarity,
    rarityName: getRarityName(skill.rarity),
    groupId: skill.groupId,
    baseCost: skill.baseCost,
    versions: skill.versions.map(String),
    familyIds,
    familyNames: unique(familyNames),
    conditions: getSkillConditions(skill),
    effectTypeIds,
    effectTypeNames: effectTypeIds.map(getEffectTypeName),
  };
}

export function searchSkills(cwd: string, filters: SkillSearchFilters): SkillSearchResponse {
  const dataset = loadDataset(cwd);
  const limit = Math.max(1, Math.min(filters.limit ?? 20, 100));
  const notes: Array<string> = [];
  const normalizedFilters: SkillSearchResponse['filters'] = { ...filters, limit };
  const requestedTypeIds = resolveEffectTypeIds(filters.types);

  if (
    !filters.query &&
    !filters.name &&
    !filters.condition &&
    filters.groupId === undefined &&
    !filters.familyOf &&
    requestedTypeIds.length === 0
  ) {
    return {
      filters: normalizedFilters,
      totalMatches: 0,
      shown: 0,
      notes: ['Provide at least one filter: query, name, condition, groupId, familyOf, or types.'],
      results: [],
    };
  }

  let candidates = [...dataset.skills];

  if (filters.familyOf) {
    const familyRoots = resolveSkillMatches(dataset, filters.familyOf);
    if (familyRoots.length === 0) {
      notes.push(`No skill family matched '${filters.familyOf}'.`);
      candidates = [];
    } else {
      const familyIds = new Set<string>();
      for (const root of familyRoots) {
        for (const familyId of dataset.familyMap.get(root.id) ?? [root.id]) {
          familyIds.add(familyId);
        }
      }
      notes.push(
        `Family filter resolved from: ${familyRoots
          .slice(0, 5)
          .map((skill) => `${skill.id} ${skill.name}`)
          .join(', ')}${familyRoots.length > 5 ? '…' : ''}`,
      );
      candidates = candidates.filter((skill) => familyIds.has(skill.id));
    }
  }

  if (filters.groupId !== undefined) {
    candidates = candidates.filter((skill) => skill.groupId === filters.groupId);
  }

  if (filters.name) {
    candidates = candidates.filter((skill) => getEnglishNameMatch(skill.name, filters.name!) !== null);

    const hasDirectNameMatch = candidates.some((skill) => {
      const normalizedNeedle = normalize(filters.name!);
      const normalizedName = normalize(skill.name);
      return (
        normalizedName === normalizedNeedle ||
        normalizedName.includes(normalizedNeedle) ||
        normalizeCompact(skill.name).includes(normalizeCompact(filters.name!))
      );
    });

    if (candidates.length > 0 && !hasDirectNameMatch) {
      notes.push(`Name search used fuzzy English matching for '${filters.name}'.`);
    }
  }

  if (filters.condition) {
    const needle = normalize(filters.condition);
    candidates = candidates.filter((skill) => normalize(getSkillConditions(skill).join(' ')).includes(needle));
  }

  if (requestedTypeIds.length > 0) {
    candidates = candidates.filter((skill) => {
      const effectTypeIds = getSkillEffectTypeIds(skill);
      return requestedTypeIds.some((typeId) => effectTypeIds.includes(typeId));
    });

    if (filters.types && requestedTypeIds.length === 0) {
      notes.push(`No effect types were recognized from: ${filters.types.join(', ')}`);
    }
  }

  if (filters.query) {
    candidates = candidates.filter((skill) => matchesAnyText(skill, filters.query!));
  }

  const ranked = candidates
    .map((skill) => ({ skill, score: scoreSkill(skill, dataset, filters) }))
    .sort((a, b) => b.score - a.score || a.skill.order - b.skill.order || a.skill.id.localeCompare(b.skill.id));

  const results = ranked.slice(0, limit).map(({ skill }) => toResult(skill, dataset));

  return {
    filters: normalizedFilters,
    totalMatches: ranked.length,
    shown: results.length,
    notes,
    results,
  };
}

function compactConditions(conditions: Array<string>, max = 2): string {
  if (conditions.length === 0) return '—';
  const shown = conditions.slice(0, max).join(' | ');
  return conditions.length > max ? `${shown} …` : shown;
}

export function formatSkillSearchSummary(response: SkillSearchResponse): string {
  const filterParts: Array<string> = [];
  if (response.filters.query) filterParts.push(`query="${response.filters.query}"`);
  if (response.filters.name) filterParts.push(`name="${response.filters.name}"`);
  if (response.filters.condition) filterParts.push(`condition="${response.filters.condition}"`);
  if (response.filters.groupId !== undefined) filterParts.push(`group=${response.filters.groupId}`);
  if (response.filters.familyOf) filterParts.push(`family="${response.filters.familyOf}"`);
  if (response.filters.types?.length) filterParts.push(`types=${response.filters.types.join(',')}`);

  const lines: Array<string> = [
    `Skill search: ${response.totalMatches} match(es), showing ${response.shown}`,
    filterParts.length > 0 ? `Filters: ${filterParts.join(' · ')}` : 'Filters: (none)',
  ];

  if (response.notes.length > 0) {
    lines.push(...response.notes.map((note) => `Note: ${note}`));
  }

  if (response.results.length === 0) {
    lines.push('No matching skills found.');
    return lines.join('\n');
  }

  for (const [index, result] of response.results.entries()) {
    lines.push(
      `${index + 1}. ${result.id} ${result.name} [${result.rarityName}] group:${result.groupId} types:${result.effectTypeNames.join(', ') || '—'}`,
    );
    lines.push(`   family: ${result.familyNames.join(' | ') || result.id}`);
    lines.push(`   conditions: ${compactConditions(result.conditions)}`);
  }

  return lines.join('\n');
}

export function formatSkillDetails(result: SkillSearchResult): string {
  const lines = [
    `${result.id} ${result.name}`,
    `rarity: ${result.rarityName}`,
    `group: ${result.groupId}`,
    `base cost: ${result.baseCost}`,
    `types: ${result.effectTypeNames.join(', ') || '—'}`,
    `versions: ${result.versions.join(', ') || '—'}`,
    `family: ${result.familyIds.map((id, index) => `${id} ${result.familyNames[index] ?? ''}`.trim()).join(' | ')}`,
    'conditions:',
    ...result.conditions.map((condition) => `- ${condition}`),
  ];

  return lines.join('\n');
}

export function parseCommandFilters(input: string): SkillSearchFilters {
  const filters: SkillSearchFilters = {};
  const queryTokens: Array<string> = [];
  const tokens = input.match(/(?:[^\s:=]+[:=]"[^"]*"|[^\s:=]+[:=]'[^']*'|[^\s:=]+[:=][^\s]+|"[^"]*"|'[^']*'|\S+)/g) ?? [];

  for (const token of tokens) {
    const separatorIndex = Math.max(token.indexOf(':'), token.indexOf('='));
    if (separatorIndex > 0) {
      const rawKey = token.slice(0, separatorIndex).trim().toLowerCase();
      const rawValue = token.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, '').trim();

      switch (rawKey) {
        case 'name':
          filters.name = value;
          continue;
        case 'condition':
        case 'cond':
          filters.condition = value;
          continue;
        case 'group':
        case 'groupid': {
          const groupId = Number(value);
          if (Number.isInteger(groupId)) {
            filters.groupId = groupId;
          }
          continue;
        }
        case 'family':
          filters.familyOf = value;
          continue;
        case 'type':
        case 'types':
          filters.types = [...(filters.types ?? []), ...safeList(value)];
          continue;
        case 'limit': {
          const limit = Number(value);
          if (Number.isInteger(limit)) {
            filters.limit = limit;
          }
          continue;
        }
        default:
          break;
      }
    }

    queryTokens.push(token.replace(/^['"]|['"]$/g, '').trim());
  }

  const query = queryTokens.join(' ').trim();
  if (query) {
    filters.query = query;
  }

  return filters;
}

export function getSkillSearchHelp(): string {
  return [
    'Usage: /skill-search [filters]',
    'Filters:',
    '  name:<text>',
    '  type:<effect-type>',
    '  group:<groupId>',
    '  condition:<raw-condition-text>',
    '  family:<skill-id-or-name>',
    '  limit:<n>',
    '  <bare text>  -> generic name/condition/id/group search',
    'Name and family matching use fuzzy English search.',
    '',
    'Examples:',
    '  /skill-search name:"Sharp Gaze"',
    '  /skill-search type:Recovery condition:order_rate>50',
    '  /skill-search group:20144',
    '  /skill-search family:"Risky Business"',
    '  /skill-search name:"All seeing eye"',
  ].join('\n');
}

export { SKILLS_JSON_PATH };
