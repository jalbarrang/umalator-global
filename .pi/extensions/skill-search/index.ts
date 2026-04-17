import type { ExtensionAPI, ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import {
  formatSkillDetails,
  formatSkillSearchSummary,
  getSkillSearchHelp,
  parseCommandFilters,
  searchSkills,
  type SkillSearchFilters,
  type SkillSearchResult,
} from './search';

const SearchSkillsParams = Type.Object({
  query: Type.Optional(
    Type.String({
      description: 'Generic text matched against skill id, name, groupId, and raw conditions.',
    }),
  ),
  name: Type.Optional(Type.String({ description: 'Substring match against the skill name.' })),
  condition: Type.Optional(
    Type.String({ description: 'Substring match against raw condition/precondition text.' }),
  ),
  groupId: Type.Optional(Type.Integer({ description: 'Exact groupId to match.' })),
  familyOf: Type.Optional(
    Type.String({ description: 'Skill id or skill name used to resolve a whole skill family.' }),
  ),
  types: Type.Optional(
    Type.Array(
      Type.String({
        description: 'Effect type name or id, e.g. Recovery, Target Speed, Acceleration, 27, 31.',
      }),
    ),
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, description: 'Maximum results to return.' })),
});

type SearchSkillsInput = {
  query?: string;
  name?: string;
  condition?: string;
  groupId?: number;
  familyOf?: string;
  types?: Array<string>;
  limit?: number;
};

const EFFECT_TYPE_OPTIONS = [
  'Speed Up',
  'Stamina Up',
  'Power Up',
  'Guts Up',
  'Wisdom Up',
  'Recovery',
  'Current Speed',
  'Current Speed With Natural Deceleration',
  'Target Speed',
  'Lane Movement Speed',
  'Acceleration',
  'Change Lane',
];

function resultLabel(result: SkillSearchResult): string {
  return `${result.id} ${result.name} [${result.rarityName}] group:${result.groupId}`;
}

async function maybeShowDetailPicker(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  results: Array<SkillSearchResult>,
) {
  if (!ctx.hasUI || results.length <= 1) {
    return;
  }

  const selected = await ctx.ui.select(
    'Skill search results (Esc to skip details)',
    results.slice(0, 50).map(resultLabel),
  );

  if (!selected) {
    return;
  }

  const result = results.find((item) => resultLabel(item) === selected);
  if (!result) {
    return;
  }

  pi.sendMessage({
    customType: 'skill-search-result',
    content: formatSkillDetails(result),
    details: { mode: 'detail', result },
    display: true,
  });
}

async function runSearch(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  filters: SkillSearchFilters,
  pickDetails = true,
) {
  const response = searchSkills(ctx.cwd, filters);

  pi.sendMessage({
    customType: 'skill-search-result',
    content: formatSkillSearchSummary(response),
    details: { mode: 'summary', response },
    display: true,
  });

  if (pickDetails) {
    await maybeShowDetailPicker(pi, ctx, response.results);
  }
}

async function promptForFilters(ctx: ExtensionCommandContext): Promise<SkillSearchFilters | null> {
  if (!ctx.hasUI) {
    return null;
  }

  const mode = await ctx.ui.select('Search skills by', [
    'generic text',
    'name',
    'type',
    'group',
    'condition',
    'family',
  ]);

  if (!mode) {
    return null;
  }

  if (mode === 'type') {
    const effectType = await ctx.ui.select('Choose an effect type', EFFECT_TYPE_OPTIONS);
    if (!effectType) {
      return null;
    }
    return { types: [effectType] };
  }

  const placeholderByMode: Record<string, string> = {
    'generic text': 'e.g. gaze, 20144, order_rate>50',
    name: 'e.g. Sharp Gaze',
    group: 'e.g. 20144',
    condition: 'e.g. running_style==3',
    family: 'e.g. Risky Business',
  };

  const value = await ctx.ui.input(`Search ${mode}`, placeholderByMode[mode] ?? 'enter a value');
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  switch (mode) {
    case 'generic text':
      return { query: trimmed };
    case 'name':
      return { name: trimmed };
    case 'group': {
      const groupId = Number(trimmed);
      if (!Number.isInteger(groupId)) {
        ctx.ui.notify(`Invalid group id: ${trimmed}`, 'error');
        return null;
      }
      return { groupId };
    }
    case 'condition':
      return { condition: trimmed };
    case 'family':
      return { familyOf: trimmed, limit: 50 };
    default:
      return { query: trimmed };
  }
}

export default function skillSearchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: 'search_skills',
    label: 'Search Skills',
    description: 'Search the local skill dataset by skill name, effect type, groupId, raw conditions, or skill family.',
    promptSnippet: 'Search local Umamusume skill data by name, effect type, groupId, raw conditions, or family.',
    promptGuidelines: [
      'Use this tool when the user asks to identify, compare, or find skills from the local skill JSON data.',
      'Prefer this tool over manual grep when the task is specifically about searching skills by name, types, groups, conditions, or family.',
    ],
    parameters: SearchSkillsParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const response = searchSkills(ctx.cwd, params as SearchSkillsInput);

      return {
        content: [{ type: 'text', text: formatSkillSearchSummary(response) }],
        details: response,
      };
    },
  });

  pi.registerCommand('skill-search', {
    description: 'Search local skills by name, type, group, condition, or family',
    getArgumentCompletions: (prefix) => {
      const suggestions = [
        'name:',
        'type:',
        'group:',
        'condition:',
        'family:',
        'limit:',
      ];
      const filtered = suggestions.filter((item) => item.startsWith(prefix));
      return filtered.length > 0 ? filtered.map((item) => ({ value: item, label: item })) : null;
    },
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      if (!trimmed) {
        const filters = await promptForFilters(ctx);
        if (!filters) {
          pi.sendMessage({
            customType: 'skill-search-result',
            content: getSkillSearchHelp(),
            details: { mode: 'help' },
            display: true,
          });
          return;
        }

        await runSearch(pi, ctx, filters);
        return;
      }

      if (trimmed === 'help' || trimmed === '--help' || trimmed === '-h') {
        pi.sendMessage({
          customType: 'skill-search-result',
          content: getSkillSearchHelp(),
          details: { mode: 'help' },
          display: true,
        });
        return;
      }

      await runSearch(pi, ctx, parseCommandFilters(trimmed));
    },
  });

  pi.registerCommand('skill-family', {
    description: 'Show all local skills in the same family as a skill id or name',
    handler: async (args, ctx) => {
      let reference = args.trim();
      if (!reference && ctx.hasUI) {
        const input = await ctx.ui.input('Skill family lookup', 'e.g. Sharp Gaze or 201442');
        reference = input?.trim() ?? '';
      }

      if (!reference) {
        pi.sendMessage({
          customType: 'skill-search-result',
          content: 'Usage: /skill-family <skill-id-or-name>',
          details: { mode: 'help' },
          display: true,
        });
        return;
      }

      await runSearch(pi, ctx, { familyOf: reference, limit: 50 });
    },
  });
}
