#!/usr/bin/env node
/**
 * Transform src/store/race/cm-presets.json from raw game format to RacePreset shape.
 * courseId is resolved from course_data.json by raceTrackId, distance, turn, surface.
 *
 * Input must be the raw array format (with nested `race`). Re-running overwrites the file;
 * keep a backup of the raw export if you need to regenerate after course_data updates.
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { readJsonFile } from './lib/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EVENT_TYPE_CM = 0;
const TIME_OF_DAY_MIDDAY = 2;

type RawRace = {
  condition: number;
  distance: number;
  ground: number;
  season: number;
  track: number;
  turn: number;
  weather: number;
};

type RawCmPreset = {
  id: number;
  name: string;
  name_en?: string;
  race: RawRace;
  start: number;
};

type CourseRow = {
  raceTrackId: number;
  distance: number;
  surface: number;
  turn: number;
};

type RacePresetOut = {
  id: string;
  name: string;
  type: number;
  date: string;
  courseId: number;
  season: number;
  ground: number;
  weather: number;
  time: number;
};

function formatDateFromUnixSeconds(sec: number): string {
  const d = new Date(sec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function findCourseId(
  courses: Record<string, CourseRow>,
  track: number,
  distance: number,
  turn: number,
  surface: number,
): { courseId: number | null; reason: string } {
  const knownTracks = new Set(Object.values(courses).map((c) => c.raceTrackId));
  if (!knownTracks.has(track)) {
    return { courseId: null, reason: `no raceTrackId ${track} in course_data.json` };
  }

  const matches = Object.entries(courses).filter(
    ([, c]) =>
      c.raceTrackId === track &&
      c.distance === distance &&
      c.turn === turn &&
      c.surface === surface,
  );

  if (matches.length === 0) {
    return {
      courseId: null,
      reason: `no course for track=${track} distance=${distance} turn=${turn} surface=${surface}`,
    };
  }

  if (matches.length > 1) {
    console.warn(
      `Ambiguous course match (using first): ${matches.map((m) => m[0]).join(', ')} for track=${track} distance=${distance} turn=${turn} surface=${surface}`,
    );
  }

  return { courseId: Number(matches[0][0]), reason: '' };
}

async function main(): Promise<void> {
  const presetsPath = path.join(ROOT, 'src/store/race/cm-presets.json');
  const coursePath = path.join(ROOT, 'src/modules/data/course_data.json');

  const rawPresets = await readJsonFile<RawCmPreset[]>(presetsPath);
  const courses = await readJsonFile<Record<string, CourseRow>>(coursePath);

  const out: RacePresetOut[] = [];

  for (const p of rawPresets) {
    const r = p.race;
    const { courseId, reason } = findCourseId(courses, r.track, r.distance, r.turn, r.ground);

    if (courseId === null) {
      console.warn(`SKIP preset id=${p.id} name=${p.name_en ?? p.name}: ${reason}`);
      continue;
    }

    out.push({
      id: randomUUID(),
      name: p.name_en ?? p.name,
      type: EVENT_TYPE_CM,
      date: formatDateFromUnixSeconds(p.start),
      courseId,
      season: r.season,
      ground: r.condition,
      weather: r.weather,
      time: TIME_OF_DAY_MIDDAY,
    });
  }

  const json = JSON.stringify(out, null, 2) + '\n';
  await writeFile(presetsPath, json, 'utf8');
  console.log(
    `Wrote ${out.length} presets to ${presetsPath} (skipped ${rawPresets.length - out.length})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
