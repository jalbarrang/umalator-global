import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeRoster } from './roster-encoding';
import type { SingleExportData } from './types';

const TEST_ROSTER_PATH = resolve(__dirname, '../../../../tests/roster/roster-test-1');
const TEST_ROSTER_URL = readFileSync(TEST_ROSTER_PATH, 'utf-8').trim();

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
