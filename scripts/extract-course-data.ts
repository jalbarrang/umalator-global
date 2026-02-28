#!/usr/bin/env node
/**
 * Extract course data from master.mdb and courseeventparams
 * Ports make_global_course_data.pl to TypeScript
 */

import path from 'node:path';
import { Command } from 'commander';
import { closeDatabase, openDatabase, queryAll } from './lib/database';
import {
  readJsonFile,
  readJsonFileIfExists,
  resolveMasterDbPath,
  sortByNumericKey,
  writeJsonFile,
} from './lib/shared';

interface CourseSetStatusRow {
  course_set_status_id: number;
  target_status_1: number;
  target_status_2: number;
}

interface CourseRow {
  id: number;
  race_track_id: number;
  distance: number;
  ground: number;
  inout: number;
  turn: number;
  float_lane_max: number;
  course_set_status_id: number;
  finish_time_min: number;
  finish_time_max: number;
}

interface CourseEvent {
  _paramType: number;
  _distance: number;
  _values: Array<number>;
}

interface CourseEventParams {
  courseParams: Array<CourseEvent>;
}

interface Corner {
  start: number;
  length: number;
}

interface Straight {
  start: number;
  end: number;
  frontType: number;
}

interface Slope {
  start: number;
  length: number;
  slope: number;
}

interface CourseData {
  raceTrackId: number;
  distance: number;
  distanceType: number;
  surface: number;
  turn: number;
  course: number;
  laneMax: number;
  finishTimeMin: number;
  finishTimeMax: number;
  courseSetStatus: Array<number>;
  corners: Array<Corner>;
  straights: Array<Straight>;
  slopes: Array<Slope>;
}

type ExtractCourseDataOptions = {
  replaceMode: boolean;
  dbPath?: string;
  courseEventParamsPath?: string;
};

function parseCliArgs(argv: Array<string>): ExtractCourseDataOptions {
  const program = new Command();

  program
    .name('extract-course-data')
    .description('Extract course data from master.mdb and courseeventparams')
    .option('-r, --replace', 'replace existing extracted data')
    .option('--full', 'alias for --replace')
    .argument('[dbPath]', 'path to master.mdb')
    .argument('[courseEventParamsPath]', 'path to courseeventparams directory');

  program.parse(argv);

  const options = program.opts<{ replace?: boolean; full?: boolean }>();
  const [dbPath, courseEventParamsPath] = program.args as Array<string>;

  return {
    replaceMode: Boolean(options.replace || options.full),
    dbPath,
    courseEventParamsPath,
  };
}

/**
 * Calculate distance type category
 */
function distanceType(distance: number): number {
  if (distance <= 1400) return 1; // Short
  if (distance <= 1800) return 2; // Mile
  if (distance < 2500) return 3; // Mid
  return 4; // Long
}

async function extractCourseData(options: ExtractCourseDataOptions = { replaceMode: false }) {
  console.log('📖 Extracting course data...\n');

  const {
    replaceMode,
    dbPath: cliDbPath,
    courseEventParamsPath: cliCourseEventParamsPath,
  } = options;
  const dbPath = await resolveMasterDbPath(cliDbPath);
  const courseEventParamsPath =
    cliCourseEventParamsPath || path.join(process.cwd(), 'courseeventparams');

  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`,
  );
  console.log(`Database: ${dbPath}`);
  console.log(`Course event params: ${courseEventParamsPath}\n`);

  const db = openDatabase(dbPath);

  try {
    // Query course set statuses (threshold stats)
    const statusRows = queryAll<CourseSetStatusRow>(
      db,
      `SELECT course_set_status_id, target_status_1, target_status_2
       FROM race_course_set_status`,
    );

    const courseSetStatus: Record<number, Array<number>> = {};
    for (const row of statusRows) {
      const statuses = [row.target_status_1];
      if (row.target_status_2 !== 0) {
        statuses.push(row.target_status_2);
      }
      courseSetStatus[row.course_set_status_id] = statuses;
    }

    // Query course metadata
    const courseRows = queryAll<CourseRow>(
      db,
      `SELECT id, race_track_id, distance, ground, inout, turn, float_lane_max, course_set_status_id,
              finish_time_min, finish_time_max
       FROM race_course_set`,
    );

    console.log(`Found ${courseRows.length} courses\n`);

    const courses: Record<string, CourseData> = {};
    let processedCount = 0;

    for (const row of courseRows) {
      // Skip incomplete Longchamp courses
      if (row.id === 11201 || row.id === 11202) {
        console.log(`Skipping incomplete course ${row.id} (Longchamp)`);
        continue;
      }

      // Read course event params JSON file
      const eventParamsPath = path.join(courseEventParamsPath, `${row.id}.json`);

      let eventParams: CourseEventParams;
      try {
        eventParams = await readJsonFile<CourseEventParams>(eventParamsPath);
      } catch {
        console.warn(`Warning: Could not read ${eventParamsPath}, skipping course ${row.id}`);
        continue;
      }

      // Process events
      const corners: Array<Corner> = [];
      const straights: Array<Straight> = [];
      const slopes: Array<Slope> = [];

      let pendingStraight: Partial<Straight> | null = null;
      let straightState = 0; // 0 = not in straight, 1 = in straight

      for (const event of eventParams.courseParams) {
        if (event._paramType === 0) {
          // Corner
          corners.push({
            start: event._distance,
            length: event._values[1],
          });
        } else if (event._paramType === 2) {
          // Straight
          if (straightState === 0) {
            // Start of straight
            if (event._values[0] !== 1) {
              throw new Error(
                `Confused about course event params: straight ended before it started? (course id ${row.id})`,
              );
            }
            pendingStraight = {
              start: event._distance,
              frontType: event._values[1],
            };
            straightState = 1;
          } else {
            // End of straight
            if (event._values[0] !== 2) {
              throw new Error(
                `Confused about course event params: new straight started before previous straight ended (course id ${row.id})`,
              );
            }
            if (pendingStraight) {
              straights.push({
                start: pendingStraight.start!,
                end: event._distance,
                frontType: pendingStraight.frontType!,
              });
            }
            pendingStraight = null;
            straightState = 0;
          }
        } else if (event._paramType === 11) {
          // Slope
          slopes.push({
            start: event._distance,
            length: event._values[1],
            slope: event._values[0],
          });
        }
      }

      // Sort arrays by start position
      corners.sort((a, b) => a.start - b.start);
      straights.sort((a, b) => a.start - b.start);
      slopes.sort((a, b) => a.start - b.start);

      // Build course data entry
      courses[row.id.toString()] = {
        raceTrackId: row.race_track_id,
        distance: row.distance,
        distanceType: distanceType(row.distance),
        surface: row.ground,
        turn: row.turn,
        course: row.inout,
        laneMax: row.float_lane_max,
        finishTimeMin: row.finish_time_min,
        finishTimeMax: row.finish_time_max,
        courseSetStatus: courseSetStatus[row.course_set_status_id] || [],
        corners,
        straights,
        slopes,
      };

      processedCount++;
    }

    // Merge with existing data (unless replace mode)
    const outputPath = path.join(process.cwd(), 'src/modules/data/course_data.json');

    let finalCourses: Record<string, CourseData>;

    if (replaceMode) {
      finalCourses = courses;
      console.log(`\n⚠️  Full replacement mode: ${processedCount} courses from master.mdb only`);
    } else {
      const existingData = await readJsonFileIfExists<Record<string, CourseData>>(outputPath);

      if (existingData) {
        // Merge: existing data first, then overwrite with new data
        finalCourses = { ...existingData, ...courses };

        const finalCount = Object.keys(finalCourses).length;
        const preserved = finalCount - processedCount;

        console.log(`\n✓ Merge mode:`);
        console.log(`  → ${processedCount} courses from master.mdb (current content)`);
        console.log(`  → ${preserved} additional courses preserved (future content)`);
        console.log(`  → ${finalCount} total courses`);
      } else {
        finalCourses = courses;
        console.log(`\n✓ No existing file found, using master.mdb data only`);
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(finalCourses);
    await writeJsonFile(outputPath, sorted);
    console.log(`\n✓ Written to ${outputPath}`);
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  extractCourseData(options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractCourseData, parseCliArgs };
