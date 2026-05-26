import { describe, expect, it } from 'vitest';
import { encodeSkillPlanner, decodeSkillPlanner } from './encoding';

describe('encodeSkillPlanner / decodeSkillPlanner', () => {
  it('round-trips minimal data (no skills)', () => {
    const data = {
      card_id: 100601,
      speed: 1200,
      stamina: 800,
      power: 600,
      guts: 400,
      wiz: 900,
      proper_distance_short: 3,
      proper_distance_mile: 7,
      proper_distance_middle: 8,
      proper_distance_long: 5,
      proper_ground_turf: 8,
      proper_ground_dirt: 4,
      proper_running_style_nige: 7,
      proper_running_style_senko: 6,
      proper_running_style_sashi: 5,
      proper_running_style_oikomi: 3,
      strategy: 1,
      mood: 2,
      budget: 1500,
      fast_learner: true,
      obtained_skills: [] as Array<{ skill_id: number }>,
      candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
    };

    const encoded = encodeSkillPlanner(data);
    const decoded = decodeSkillPlanner(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.card_id).toBe(100601);
    expect(decoded!.speed).toBe(1200);
    expect(decoded!.stamina).toBe(800);
    expect(decoded!.power).toBe(600);
    expect(decoded!.guts).toBe(400);
    expect(decoded!.wiz).toBe(900);
    expect(decoded!.strategy).toBe(1);
    expect(decoded!.mood).toBe(2);
    expect(decoded!.budget).toBe(1500);
    expect(decoded!.fast_learner).toBe(true);
    expect(decoded!.obtained_skills).toEqual([]);
    expect(decoded!.candidate_skills).toEqual([]);
  });

  it('preserves all 10 aptitude fields individually', () => {
    const data = {
      card_id: 100601,
      speed: 1000, stamina: 1000, power: 1000, guts: 1000, wiz: 1000,
      proper_distance_short: 3,
      proper_distance_mile: 7,
      proper_distance_middle: 8,
      proper_distance_long: 5,
      proper_ground_turf: 8,
      proper_ground_dirt: 4,
      proper_running_style_nige: 7,
      proper_running_style_senko: 6,
      proper_running_style_sashi: 5,
      proper_running_style_oikomi: 3,
      strategy: 1, mood: 0, budget: 0, fast_learner: false,
      obtained_skills: [] as Array<{ skill_id: number }>,
      candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
    };
    const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;

    expect(decoded.proper_distance_short).toBe(3);
    expect(decoded.proper_distance_mile).toBe(7);
    expect(decoded.proper_distance_middle).toBe(8);
    expect(decoded.proper_distance_long).toBe(5);
    expect(decoded.proper_ground_turf).toBe(8);
    expect(decoded.proper_ground_dirt).toBe(4);
    expect(decoded.proper_running_style_nige).toBe(7);
    expect(decoded.proper_running_style_senko).toBe(6);
    expect(decoded.proper_running_style_sashi).toBe(5);
    expect(decoded.proper_running_style_oikomi).toBe(3);
  });

  it('round-trips every strategy value (1–5)', () => {
    for (let strategy = 1; strategy <= 5; strategy++) {
      const data = {
        card_id: 1, speed: 0, stamina: 0, power: 0, guts: 0, wiz: 0,
        proper_distance_short: 0, proper_distance_mile: 0, proper_distance_middle: 0, proper_distance_long: 0,
        proper_ground_turf: 0, proper_ground_dirt: 0,
        proper_running_style_nige: 0, proper_running_style_senko: 0, proper_running_style_sashi: 0, proper_running_style_oikomi: 0,
        strategy, mood: 0, budget: 0, fast_learner: false,
        obtained_skills: [] as Array<{ skill_id: number }>,
        candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
      };
      const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;
      expect(decoded.strategy).toBe(strategy);
    }
  });

  it('round-trips every mood value (-2 to +2)', () => {
    for (let mood = -2; mood <= 2; mood++) {
      const data = {
        card_id: 1, speed: 0, stamina: 0, power: 0, guts: 0, wiz: 0,
        proper_distance_short: 0, proper_distance_mile: 0, proper_distance_middle: 0, proper_distance_long: 0,
        proper_ground_turf: 0, proper_ground_dirt: 0,
        proper_running_style_nige: 0, proper_running_style_senko: 0, proper_running_style_sashi: 0, proper_running_style_oikomi: 0,
        strategy: 1, mood, budget: 0, fast_learner: false,
        obtained_skills: [] as Array<{ skill_id: number }>,
        candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
      };
      const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;
      expect(decoded.mood).toBe(mood);
    }
  });

  it('preserves obtained skill IDs', () => {
    const data = {
      card_id: 100601, speed: 1200, stamina: 800, power: 600, guts: 400, wiz: 900,
      proper_distance_short: 8, proper_distance_mile: 8, proper_distance_middle: 8, proper_distance_long: 8,
      proper_ground_turf: 7, proper_ground_dirt: 7,
      proper_running_style_nige: 6, proper_running_style_senko: 6, proper_running_style_sashi: 6, proper_running_style_oikomi: 6,
      strategy: 1, mood: 2, budget: 1500, fast_learner: true,
      obtained_skills: [{ skill_id: 200011 }, { skill_id: 201151 }, { skill_id: 100601 }],
      candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
    };
    const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;

    expect(decoded.obtained_skills).toEqual([
      { skill_id: 200011 },
      { skill_id: 201151 },
      { skill_id: 100601 }
    ]);
  });

  it('preserves candidate skills with hint levels', () => {
    const data = {
      card_id: 100601, speed: 1200, stamina: 800, power: 600, guts: 400, wiz: 900,
      proper_distance_short: 8, proper_distance_mile: 8, proper_distance_middle: 8, proper_distance_long: 8,
      proper_ground_turf: 7, proper_ground_dirt: 7,
      proper_running_style_nige: 6, proper_running_style_senko: 6, proper_running_style_sashi: 6, proper_running_style_oikomi: 6,
      strategy: 1, mood: 2, budget: 1500, fast_learner: true,
      obtained_skills: [] as Array<{ skill_id: number }>,
      candidate_skills: [
        { skill_id: 200011, hint_level: 0 as const },
        { skill_id: 201151, hint_level: 3 as const },
        { skill_id: 100601, hint_level: 5 as const }
      ]
    };
    const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;

    expect(decoded.candidate_skills).toEqual([
      { skill_id: 200011, hint_level: 0 },
      { skill_id: 201151, hint_level: 3 },
      { skill_id: 100601, hint_level: 5 }
    ]);
  });

  it('round-trips a full planner session', () => {
    const data = {
      card_id: 100601, speed: 1200, stamina: 800, power: 600, guts: 400, wiz: 900,
      proper_distance_short: 8, proper_distance_mile: 8, proper_distance_middle: 8, proper_distance_long: 8,
      proper_ground_turf: 7, proper_ground_dirt: 7,
      proper_running_style_nige: 6, proper_running_style_senko: 6, proper_running_style_sashi: 6, proper_running_style_oikomi: 6,
      strategy: 2, mood: -1, budget: 2500, fast_learner: false,
      obtained_skills: [{ skill_id: 200011 }, { skill_id: 200012 }],
      candidate_skills: [
        { skill_id: 200014, hint_level: 2 as const },
        { skill_id: 201151, hint_level: 0 as const },
        { skill_id: 300001, hint_level: 5 as const },
        { skill_id: 400010, hint_level: 1 as const }
      ]
    };
    const decoded = decodeSkillPlanner(encodeSkillPlanner(data))!;

    expect(decoded.card_id).toBe(100601);
    expect(decoded.strategy).toBe(2);
    expect(decoded.mood).toBe(-1);
    expect(decoded.budget).toBe(2500);
    expect(decoded.fast_learner).toBe(false);
    expect(decoded.obtained_skills).toHaveLength(2);
    expect(decoded.candidate_skills).toHaveLength(4);
    expect(decoded.candidate_skills[2]).toEqual({ skill_id: 300001, hint_level: 5 });
  });
});

describe('encoding — clamping', () => {
  const minimal = {
    card_id: 1, speed: 0, stamina: 0, power: 0, guts: 0, wiz: 0,
    proper_distance_short: 0, proper_distance_mile: 0, proper_distance_middle: 0, proper_distance_long: 0,
    proper_ground_turf: 0, proper_ground_dirt: 0,
    proper_running_style_nige: 0, proper_running_style_senko: 0, proper_running_style_sashi: 0, proper_running_style_oikomi: 0,
    strategy: 1, mood: 0, budget: 0, fast_learner: false,
    obtained_skills: [] as Array<{ skill_id: number }>,
    candidate_skills: [] as Array<{ skill_id: number; hint_level: 0 | 1 | 2 | 3 | 4 | 5 }>
  };

  it('clamps stats to 2047', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({ ...minimal, speed: 9999 }))!;
    expect(decoded.speed).toBe(2047);
  });

  it('clamps aptitudes to 9', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({ ...minimal, proper_distance_short: 15 }))!;
    expect(decoded.proper_distance_short).toBe(9);
  });

  it('clamps hint levels to 5', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({
      ...minimal,
      candidate_skills: [{ skill_id: 200011, hint_level: 7 as never }]
    }))!;
    expect(decoded.candidate_skills[0]!.hint_level).toBe(5);
  });

  it('clamps budget to 65535', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({ ...minimal, budget: 100000 }))!;
    expect(decoded.budget).toBe(65535);
  });

  it('truncates obtained skills to 63', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({
      ...minimal,
      obtained_skills: Array.from({ length: 70 }, (_, i) => ({ skill_id: 200000 + i }))
    }))!;
    expect(decoded.obtained_skills).toHaveLength(63);
  });

  it('truncates candidate skills to 127', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({
      ...minimal,
      candidate_skills: Array.from({ length: 140 }, (_, i) => ({ skill_id: 300000 + i, hint_level: 0 as const }))
    }))!;
    expect(decoded.candidate_skills).toHaveLength(127);
  });

  it('clamps invalid strategy to Front Runner (1)', () => {
    const decoded = decodeSkillPlanner(encodeSkillPlanner({ ...minimal, strategy: 0 }))!;
    expect(decoded.strategy).toBe(1);
  });
});

describe('decodeSkillPlanner — error handling', () => {
  it('returns null for empty string', () => {
    expect(decodeSkillPlanner('')).toBeNull();
  });

  it('returns null for too-short input', () => {
    expect(decodeSkillPlanner('AAAA')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(decodeSkillPlanner('not-valid-data-at-all!!!')).toBeNull();
  });
});

describe('encoding — output format', () => {
  it('produces a compact URL-safe Base64 string', () => {
    const data = {
      card_id: 100601, speed: 1200, stamina: 800, power: 600, guts: 400, wiz: 900,
      proper_distance_short: 8, proper_distance_mile: 8, proper_distance_middle: 8, proper_distance_long: 8,
      proper_ground_turf: 7, proper_ground_dirt: 7,
      proper_running_style_nige: 6, proper_running_style_senko: 6, proper_running_style_sashi: 6, proper_running_style_oikomi: 6,
      strategy: 1, mood: 2, budget: 1500, fast_learner: true,
      obtained_skills: Array.from({ length: 10 }, (_, i) => ({ skill_id: 200000 + i })),
      candidate_skills: Array.from({ length: 15 }, (_, i) => ({
        skill_id: 300000 + i,
        hint_level: (i % 6) as 0 | 1 | 2 | 3 | 4 | 5
      }))
    };
    const encoded = encodeSkillPlanner(data);

    // URL-safe Base64 only
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    // Typical session per spec: ~118 chars
    expect(encoded.length).toBeLessThan(200);
    expect(encoded.length).toBeGreaterThan(50);
  });
});
