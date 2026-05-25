import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import {
  inspectSkill,
  estimateSkillDuration,
  classifySkillEffects,
  formatInspection,
  formatDurationEstimate,
  formatClassification
} from './mechanics';

export default function skillMechanicsExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: 'inspect_skill',
    label: 'Inspect Skill',
    description:
      'Inspect a skill\'s raw mechanical data: effects (type, modifier, target), baseDuration, conditions, and debuff classification. Use when you need to understand how a skill works at the engine level.',
    promptSnippet:
      'Inspect raw skill mechanics: effects, modifiers, baseDuration, debuff classification.',
    promptGuidelines: [
      'Use inspect_skill when investigating skill behavior, effect values, duration scaling, or debuff classification — not for name/family lookups (use search_skills for that).'
    ],
    parameters: Type.Object({
      skillId: Type.String({ description: 'Skill ID to inspect (e.g. "201151")' })
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = inspectSkill(ctx.cwd, params.skillId);
      if (!result) {
        return {
          content: [{ type: 'text', text: `Skill ${params.skillId} not found.` }],
          details: { error: 'not_found' }
        };
      }
      return {
        content: [{ type: 'text', text: formatInspection(result) }],
        details: result
      };
    }
  });

  pi.registerTool({
    name: 'estimate_skill_duration',
    label: 'Estimate Skill Duration',
    description:
      'Estimate a skill\'s effect duration in meters for a given course distance. Uses baseDuration scaling formula and approximate race speed.',
    promptSnippet: 'Estimate skill effect duration in meters for a course distance.',
    promptGuidelines: [
      'Use estimate_skill_duration when you need to know how far a skill effect spans on the racetrack for a specific course distance.'
    ],
    parameters: Type.Object({
      skillId: Type.String({ description: 'Skill ID (e.g. "201151")' }),
      courseDistance: Type.Number({
        description: 'Course distance in meters (e.g. 2200)',
        minimum: 1000,
        maximum: 3600
      }),
      estimatedSpeed: Type.Optional(
        Type.Number({
          description: 'Estimated race speed in m/s (default: 20)',
          minimum: 10,
          maximum: 30
        })
      )
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = estimateSkillDuration(
        ctx.cwd,
        params.skillId,
        params.courseDistance,
        params.estimatedSpeed
      );
      if (!result) {
        return {
          content: [{ type: 'text', text: `Skill ${params.skillId} not found.` }],
          details: { error: 'not_found' }
        };
      }
      return {
        content: [{ type: 'text', text: formatDurationEstimate(result) }],
        details: result
      };
    }
  });

  pi.registerTool({
    name: 'classify_skill_effects',
    label: 'Classify Skill Effects',
    description:
      'Classify a skill\'s effects: which are instant vs duration-based, which are self vs targeted (debuff), and whether it qualifies as an injectable external debuff.',
    promptSnippet: 'Classify skill effects as instant/duration, self/targeted, debuff/buff.',
    promptGuidelines: [
      'Use classify_skill_effects when determining if a skill is a debuff, whether its effects are instant or have duration, or how effects are targeted.'
    ],
    parameters: Type.Object({
      skillId: Type.String({ description: 'Skill ID (e.g. "201151")' })
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = classifySkillEffects(ctx.cwd, params.skillId);
      if (!result) {
        return {
          content: [{ type: 'text', text: `Skill ${params.skillId} not found.` }],
          details: { error: 'not_found' }
        };
      }
      return {
        content: [{ type: 'text', text: formatClassification(result) }],
        details: result
      };
    }
  });
}
