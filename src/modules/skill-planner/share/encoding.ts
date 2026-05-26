import { BitVector } from '@/modules/runners/share/bit-vector';
import type { SkillPlannerExportData, SkillPlannerExportSkill } from './types';
import type { HintLevel } from '../types';

const VERSION = 1;
const MIN_BITS = 159;

const clampStat = (v: number) => Math.max(0, Math.min(2047, v));
const clampApt = (v: number) => Math.max(0, Math.min(9, v));
const clampHint = (v: number) => Math.max(0, Math.min(5, v)) as HintLevel;
const clampBudget = (v: number) => Math.max(0, Math.min(65535, v));
const clampStrategy = (v: number) => (v >= 1 && v <= 5 ? v : 1);
const clampMoodEncoded = (v: number) => (v >= 0 && v <= 4 ? v : 4);

const APTITUDE_FIELDS = [
  'proper_distance_short',
  'proper_distance_mile',
  'proper_distance_middle',
  'proper_distance_long',
  'proper_ground_turf',
  'proper_ground_dirt',
  'proper_running_style_nige',
  'proper_running_style_senko',
  'proper_running_style_sashi',
  'proper_running_style_oikomi'
] as const;

export function encodeSkillPlanner(data: SkillPlannerExportData): string {
  const bv = new BitVector();

  bv.write(VERSION, 8);
  bv.write(data.card_id, 20);

  bv.write(clampStat(data.speed), 11);
  bv.write(clampStat(data.stamina), 11);
  bv.write(clampStat(data.power), 11);
  bv.write(clampStat(data.guts), 11);
  bv.write(clampStat(data.wiz), 11);

  for (const field of APTITUDE_FIELDS) {
    bv.write(clampApt(data[field]), 4);
  }

  bv.write(clampStrategy(data.strategy), 3);
  bv.write(clampMoodEncoded(data.mood + 2), 3);

  bv.write(clampBudget(data.budget), 16);
  bv.write(data.fast_learner ? 1 : 0, 1);

  const obtained = data.obtained_skills.slice(0, 63);
  bv.write(obtained.length, 6);
  for (const s of obtained) {
    bv.write(s.skill_id, 20);
  }

  const candidates = data.candidate_skills.slice(0, 127);
  bv.write(candidates.length, 7);
  for (const s of candidates) {
    bv.write(s.skill_id, 20);
    bv.write(clampHint(s.hint_level), 3);
  }

  return bv.toBase64();
}

export function decodeSkillPlanner(encoded: string): SkillPlannerExportData | null {
  try {
    const bv = BitVector.fromBase64(encoded);
    if (bv.bitsRemaining() < MIN_BITS) return null;

    const version = bv.read(8);
    if (version !== VERSION) return null;

    const card_id = bv.read(20);

    const speed = bv.read(11);
    const stamina = bv.read(11);
    const power = bv.read(11);
    const guts = bv.read(11);
    const wiz = bv.read(11);

    const proper_distance_short = bv.read(4);
    const proper_distance_mile = bv.read(4);
    const proper_distance_middle = bv.read(4);
    const proper_distance_long = bv.read(4);
    const proper_ground_turf = bv.read(4);
    const proper_ground_dirt = bv.read(4);
    const proper_running_style_nige = bv.read(4);
    const proper_running_style_senko = bv.read(4);
    const proper_running_style_sashi = bv.read(4);
    const proper_running_style_oikomi = bv.read(4);

    const strategy = clampStrategy(bv.read(3));
    const mood = clampMoodEncoded(bv.read(3)) - 2;

    const budget = bv.read(16);
    const fast_learner = bv.read(1) === 1;

    const obtainedCount = bv.read(6);
    const obtained_skills: Array<{ skill_id: number }> = [];
    for (let i = 0; i < obtainedCount; i++) {
      if (bv.bitsRemaining() < 20) break;
      obtained_skills.push({ skill_id: bv.read(20) });
    }

    const base = {
      card_id,
      speed,
      stamina,
      power,
      guts,
      wiz,
      proper_distance_short,
      proper_distance_mile,
      proper_distance_middle,
      proper_distance_long,
      proper_ground_turf,
      proper_ground_dirt,
      proper_running_style_nige,
      proper_running_style_senko,
      proper_running_style_sashi,
      proper_running_style_oikomi,
      strategy,
      mood,
      budget,
      fast_learner,
      obtained_skills
    };

    if (bv.bitsRemaining() < 7) {
      return { ...base, candidate_skills: [] };
    }

    const candidateCount = bv.read(7);
    const candidate_skills: Array<SkillPlannerExportSkill> = [];
    for (let i = 0; i < candidateCount; i++) {
      if (bv.bitsRemaining() < 23) break;
      const skill_id = bv.read(20);
      const hint_level = clampHint(bv.read(3));
      candidate_skills.push({ skill_id, hint_level });
    }

    return { ...base, candidate_skills };
  } catch {
    return null;
  }
}
