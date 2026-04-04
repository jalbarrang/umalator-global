import { gzipSync } from 'node:zlib';
import { describe, it, expect, beforeAll } from 'vitest';
import { BitVector } from './bit-vector';
import { decodeRoster } from './roster-encoding';
import type { SingleExportData, SingleExportSkill } from './types';

type TestRosterCharacter = Omit<SingleExportData, 'create_time'> & {
  talent_level?: number;
};

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const standard = value.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(Buffer.from(standard, 'base64'));
}

function encodeRoster(characters: TestRosterCharacter[]): string {
  const bv = new BitVector();
  bv.write(4, 8);

  for (const character of characters) {
    bv.write(character.card_id, 20);
    bv.write(character.talent_level ?? 0, 3);

    if (character.rank_score != null) {
      bv.write(1, 1);
      bv.write(character.rank_score, 15);
    } else {
      bv.write(0, 1);
    }

    bv.write(character.speed, 11);
    bv.write(character.stamina, 11);
    bv.write(character.power, 11);
    bv.write(character.guts, 11);
    bv.write(character.wiz, 11);

    bv.write(character.proper_distance_short - 1, 3);
    bv.write(character.proper_distance_mile - 1, 3);
    bv.write(character.proper_distance_middle - 1, 3);
    bv.write(character.proper_distance_long - 1, 3);
    bv.write(character.proper_ground_turf - 1, 3);
    bv.write(character.proper_ground_dirt - 1, 3);
    bv.write(character.proper_running_style_nige - 1, 3);
    bv.write(character.proper_running_style_senko - 1, 3);
    bv.write(character.proper_running_style_sashi - 1, 3);
    bv.write(character.proper_running_style_oikomi - 1, 3);

    bv.write(0, 4);

    const skills = character.skill_array.slice(0, 63);
    bv.write(skills.length, 6);
    for (const skill of skills) {
      bv.write(skill.skill_id, 20);
      bv.write(skill.skill_level === 2 ? 1 : 0, 1);
    }

    bv.write(0, 2);
  }

  return bv.toBase64();
}

function buildTestRoster(): TestRosterCharacter[] {
  const roster: TestRosterCharacter[] = [
    {
      card_id: 105001,
      talent_level: 4,
      speed: 1180,
      stamina: 794,
      power: 831,
      guts: 519,
      wiz: 843,
      proper_distance_short: 3,
      proper_distance_mile: 7,
      proper_distance_middle: 8,
      proper_distance_long: 4,
      proper_ground_turf: 8,
      proper_ground_dirt: 2,
      proper_running_style_nige: 4,
      proper_running_style_senko: 8,
      proper_running_style_sashi: 6,
      proper_running_style_oikomi: 3,
      rank_score: 14522,
      skill_array: [
        { skill_id: 100101, skill_level: 1 },
        { skill_id: 100202, skill_level: 2 },
        { skill_id: 100303, skill_level: 1 },
      ],
    },
  ];

  for (let index = 1; index < 228; index++) {
    const skills: SingleExportSkill[] = [];
    const skillCount = (index % 4) + 1;

    for (let skillIndex = 0; skillIndex < skillCount; skillIndex++) {
      skills.push({
        skill_id: 200000 + index * 10 + skillIndex,
        skill_level: ((index + skillIndex) % 2) + 1,
      });
    }

    roster.push({
      card_id: 105001 + index,
      talent_level: index % 5,
      speed: 900 + (index % 900),
      stamina: 700 + ((index * 3) % 700),
      power: 650 + ((index * 5) % 800),
      guts: 400 + ((index * 7) % 700),
      wiz: 600 + ((index * 11) % 900),
      proper_distance_short: (index % 8) + 1,
      proper_distance_mile: ((index + 1) % 8) + 1,
      proper_distance_middle: ((index + 2) % 8) + 1,
      proper_distance_long: ((index + 3) % 8) + 1,
      proper_ground_turf: ((index + 4) % 8) + 1,
      proper_ground_dirt: ((index + 5) % 8) + 1,
      proper_running_style_nige: ((index + 6) % 8) + 1,
      proper_running_style_senko: ((index + 7) % 8) + 1,
      proper_running_style_sashi: (index % 8) + 1,
      proper_running_style_oikomi: ((index + 2) % 8) + 1,
      rank_score: index % 3 === 0 ? 1000 + index * 7 : undefined,
      skill_array: skills,
    });
  }

  return roster;
}

const TEST_ROSTER = buildTestRoster();
const TEST_ROSTER_BASE64 = encodeRoster(TEST_ROSTER);
const TEST_ROSTER_HASH = `z${toBase64Url(gzipSync(fromBase64Url(TEST_ROSTER_BASE64)))}`;
const TEST_ROSTER_URL = `https://example.test/roster#${TEST_ROSTER_HASH}`;

describe('decodeRoster', () => {
  describe('URL extraction', () => {
    it('returns null for empty string', async () => {
      expect(await decodeRoster('')).toBeNull();
    });

    it('returns null for garbage input', async () => {
      expect(await decodeRoster('not-a-valid-code')).toBeNull();
    });

    it('returns null for V2 encoded string', async () => {
      expect(await decodeRoster('CAAA')).toBeNull();
    });
  });

  describe('real roster data', () => {
    let roster: SingleExportData[];

    beforeAll(async () => {
      const result = await decodeRoster(TEST_ROSTER_URL);
      expect(result).not.toBeNull();
      roster = result ?? [];
    });

    it('decodes from full URL (with https:// prefix and # fragment)', () => {
      expect(roster.length).toBeGreaterThan(0);
    });

    it('decodes from hash fragment only (z-prefixed compressed)', async () => {
      const hashFragment = TEST_ROSTER_URL.split('#')[1];
      expect(hashFragment).toBeTruthy();
      expect(hashFragment?.startsWith('z')).toBe(true);

      const result = await decodeRoster(hashFragment ?? '');
      expect(result).not.toBeNull();
      expect(result?.length).toBeGreaterThan(0);
    });

    it('decodes characters with valid card_ids', () => {
      for (const char of roster) {
        expect(char.card_id).toBeGreaterThan(0);
        expect(char.card_id).toBeLessThan(1_048_576);
      }
    });

    it('decodes characters with stats in reasonable range', () => {
      for (const char of roster) {
        for (const stat of [char.speed, char.stamina, char.power, char.guts, char.wiz]) {
          expect(stat).toBeGreaterThanOrEqual(0);
          expect(stat).toBeLessThanOrEqual(2047);
        }
      }
    });

    it('decodes characters with aptitudes in valid range (1-8)', () => {
      for (const char of roster) {
        const aptitudes = [
          char.proper_distance_short,
          char.proper_distance_mile,
          char.proper_distance_middle,
          char.proper_distance_long,
          char.proper_ground_turf,
          char.proper_ground_dirt,
          char.proper_running_style_nige,
          char.proper_running_style_senko,
          char.proper_running_style_sashi,
          char.proper_running_style_oikomi,
        ];
        for (const apt of aptitudes) {
          expect(apt).toBeGreaterThanOrEqual(1);
          expect(apt).toBeLessThanOrEqual(8);
        }
      }
    });

    it('decodes characters with valid skills', () => {
      for (const char of roster) {
        expect(char.skill_array.length).toBeGreaterThanOrEqual(0);
        expect(char.skill_array.length).toBeLessThanOrEqual(63);

        for (const skill of char.skill_array) {
          expect(skill.skill_id).toBeGreaterThan(0);
          expect(skill.skill_id).toBeLessThan(1_048_576);
          expect([1, 2]).toContain(skill.skill_level);
        }
      }
    });

    it('decodes rank_score when present', () => {
      const withRankScore = roster.filter((c) => c.rank_score != null);

      for (const char of withRankScore) {
        expect(char.rank_score).toBeGreaterThanOrEqual(0);
        expect(char.rank_score).toBeLessThanOrEqual(32767);
      }
    });

    it('populates create_time for all characters', () => {
      for (const char of roster) {
        expect(char.create_time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      }
    });

    it('decodes a known character count from the test roster', () => {
      expect(roster.length).toMatchInlineSnapshot(`228`);
    });

    it('first character has consistent decoded fields', () => {
      const first = roster[0];

      expect(first.card_id).toMatchInlineSnapshot(`105001`);
      expect(first.speed).toMatchInlineSnapshot(`1180`);
      expect(first.stamina).toMatchInlineSnapshot(`794`);
      expect(first.power).toMatchInlineSnapshot(`831`);
      expect(first.guts).toMatchInlineSnapshot(`519`);
      expect(first.wiz).toMatchInlineSnapshot(`843`);
      expect(first.skill_array.length).toBeGreaterThan(0);
    });
  });
});
