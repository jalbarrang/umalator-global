#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { sortByNumericKey, writeJsonFile } from './lib/shared';

type CourseDataEntry = {
  raceTrackId: number;
  distance: number;
  surface: number;
  course: number;
};

type CliOptions = {
  sourceDir: string;
  courseDataPath: string;
  outputPath: string;
};

type AssetNameParts = {
  trackId: number;
  trackVariant: number;
  distance: number;
  surfaceCode: number;
  courseCode: number;
  variant: number;
};

type RotationSample = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type GeometryRecord = {
  courseId: number;
  assetName: string;
  raceTrackId: number;
  distance: number;
  surface: number;
  course: number;
  trackVariant: number;
  variant: number;
  durationSeconds: number;
  sampleCount: number;
  valueX: number[];
  valueY: number[];
  valueZ: number[];
  rotation: RotationSample[];
};

const DEFAULT_SOURCE_DIR = 'extracted-data/course';
const DEFAULT_COURSE_DATA_PATH = 'src/modules/data/course_data.json';
const DEFAULT_OUTPUT_PATH = 'src/modules/data/course_geometry.json';

function parseArgs(argv: string[]): CliOptions {
  const program = new Command();
  program
    .name('extract-course-geometry')
    .description('Extract normalized course geometry from Unity YAML assets.')
    .option('-s, --source <path>', 'Path to extracted-data/course directory', DEFAULT_SOURCE_DIR)
    .option(
      '-c, --course-data <path>',
      'Path to src/modules/data/course_data.json',
      DEFAULT_COURSE_DATA_PATH,
    )
    .option('-o, --output <path>', 'Path to output JSON file', DEFAULT_OUTPUT_PATH)
    .showHelpAfterError();

  program.parse(argv);
  const options = program.opts<{ source: string; courseData: string; output: string }>();
  return {
    sourceDir: path.resolve(options.source),
    courseDataPath: path.resolve(options.courseData),
    outputPath: path.resolve(options.output),
  };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function parseAssetName(fileName: string): AssetNameParts | null {
  const match =
    /^an_pos_race(?<trackId>\d+)_(?<trackVariant>\d+)_(?<distance>\d+)_(?<surfaceCode>\d+)_(?<courseCode>\d+)_(?<variant>\d+)\.asset$/.exec(
      fileName,
    );
  if (!match?.groups) {
    return null;
  }
  return {
    trackId: Number(match.groups.trackId),
    trackVariant: Number(match.groups.trackVariant),
    distance: Number(match.groups.distance),
    surfaceCode: Number(match.groups.surfaceCode),
    courseCode: Number(match.groups.courseCode),
    variant: Number(match.groups.variant),
  };
}

function parseScalarNumber(line: string, prefix: string): number {
  return Number(line.slice(prefix.length).trim());
}

function parseNumberList(lines: string[], startIndex: number): { values: number[]; nextIndex: number } {
  const values: number[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.startsWith('    - ')) {
      break;
    }
    values.push(Number(line.slice('    - '.length).trim()));
    index += 1;
  }
  return { values, nextIndex: index };
}

function parseRotationList(lines: string[], startIndex: number): { values: RotationSample[]; nextIndex: number } {
  const values: RotationSample[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith('    - {x: ')) {
      const match =
        /^\s*-\s*\{x:\s*([^,]+),\s*y:\s*([^,]+),\s*z:\s*([^,]+),\s*w:\s*([^}]+)\}\s*$/.exec(
          line,
        );
      if (!match) {
        break;
      }
      values.push({
        x: Number(match[1]),
        y: Number(match[2]),
        z: Number(match[3]),
        w: Number(match[4]),
      });
      index += 1;
      continue;
    }
    if (!line.startsWith('    - x: ')) {
      break;
    }
    const x = Number(line.slice('    - x: '.length).trim());
    const y = Number(lines[index + 1]?.slice('      y: '.length).trim());
    const z = Number(lines[index + 2]?.slice('      z: '.length).trim());
    const w = Number(lines[index + 3]?.slice('      w: '.length).trim());
    values.push({ x, y, z, w });
    index += 4;
  }
  return { values, nextIndex: index };
}

function parseGeometryAsset(
  raw: string,
  assetName: string,
  courseId: number,
  meta: {
    raceTrackId: number;
    distance: number;
    surface: number;
    course: number;
    trackVariant: number;
    variant: number;
  },
): GeometryRecord {
  const lines = raw.split(/\r?\n/);
  let durationSeconds = 0;
  let distanceFromAsset = 0;
  let valueX: number[] = [];
  let valueY: number[] = [];
  let valueZ: number[] = [];
  let rotation: RotationSample[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith('  length: ')) {
      durationSeconds = parseScalarNumber(line, '  length: ');
      index += 1;
      continue;
    }
    if (line.startsWith('  Distance: ')) {
      distanceFromAsset = parseScalarNumber(line, '  Distance: ');
      index += 1;
      continue;
    }
    if (line === '    valueX:') {
      const parsed = parseNumberList(lines, index + 1);
      valueX = parsed.values;
      index = parsed.nextIndex;
      continue;
    }
    if (line === '    valueY:') {
      const parsed = parseNumberList(lines, index + 1);
      valueY = parsed.values;
      index = parsed.nextIndex;
      continue;
    }
    if (line === '    valueZ:') {
      const parsed = parseNumberList(lines, index + 1);
      valueZ = parsed.values;
      index = parsed.nextIndex;
      continue;
    }
    if (line === '    rotation:') {
      const parsed = parseRotationList(lines, index + 1);
      rotation = parsed.values;
      index = parsed.nextIndex;
      continue;
    }
    index += 1;
  }

  if (
    valueX.length === 0 ||
    valueY.length === 0 ||
    valueZ.length === 0 ||
    rotation.length === 0 ||
    valueX.length !== valueY.length ||
    valueX.length !== valueZ.length ||
    valueX.length !== rotation.length
  ) {
    throw new Error(`Failed to parse complete geometry from ${assetName}`);
  }

  if (distanceFromAsset !== meta.distance) {
    throw new Error(
      `Distance mismatch for ${assetName}: filename/course=${meta.distance}, asset=${distanceFromAsset}`,
    );
  }

  return {
    courseId,
    assetName,
    raceTrackId: meta.raceTrackId,
    distance: meta.distance,
    surface: meta.surface,
    course: meta.course,
    trackVariant: meta.trackVariant,
    variant: meta.variant,
    durationSeconds,
    sampleCount: valueX.length,
    valueX,
    valueY,
    valueZ,
    rotation,
  };
}

function buildCourseIndex(courseData: Record<string, CourseDataEntry>): Map<string, number> {
  const index = new Map<string, number>();
  for (const [courseId, entry] of Object.entries(courseData)) {
    index.set(
      `${entry.raceTrackId}:${entry.distance}:${entry.surface}:${entry.course}`,
      Number(courseId),
    );
  }
  return index;
}

function choosePreferredAsset(left: AssetNameParts, right: AssetNameParts): number {
  if (left.trackVariant !== right.trackVariant) {
    return left.trackVariant - right.trackVariant;
  }
  return left.variant - right.variant;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const courseData = JSON.parse(await readFile(options.courseDataPath, 'utf8')) as Record<
    string,
    CourseDataEntry
  >;
  const courseIndex = buildCourseIndex(courseData);
  const files = await walk(options.sourceDir);
  const assetFiles = files.filter((file) => file.endsWith('.asset'));

  const matchedByCourseId = new Map<number, Array<{ filePath: string; parts: AssetNameParts }>>();
  let skippedBaseLoopAssets = 0;
  let unmatchedAssets = 0;

  for (const filePath of assetFiles) {
    const assetName = path.basename(filePath);
    const parts = parseAssetName(assetName);
    if (!parts) {
      continue;
    }
    if (parts.distance <= 0) {
      skippedBaseLoopAssets += 1;
      continue;
    }

    const surface = parts.surfaceCode + 1;
    const course = parts.courseCode + 1;
    const courseId = courseIndex.get(`${parts.trackId}:${parts.distance}:${surface}:${course}`);
    if (courseId == null) {
      unmatchedAssets += 1;
      continue;
    }

    const group = matchedByCourseId.get(courseId) ?? [];
    group.push({ filePath, parts });
    matchedByCourseId.set(courseId, group);
  }

  const result: Record<string, GeometryRecord> = {};
  for (const [courseId, assets] of matchedByCourseId.entries()) {
    assets.sort((a, b) => choosePreferredAsset(a.parts, b.parts));
    const chosen = assets[0];
    const assetName = path.basename(chosen.filePath);
    const raw = await readFile(chosen.filePath, 'utf8');
    const entry = courseData[String(courseId)];
    result[String(courseId)] = parseGeometryAsset(raw, assetName, courseId, {
      raceTrackId: entry.raceTrackId,
      distance: entry.distance,
      surface: entry.surface,
      course: entry.course,
      trackVariant: chosen.parts.trackVariant,
      variant: chosen.parts.variant,
    });
  }

  await writeJsonFile(options.outputPath, sortByNumericKey(result));

  console.log(`Geometry written to ${options.outputPath}`);
  console.log(`Matched courses: ${Object.keys(result).length}`);
  console.log(`Skipped base-loop assets: ${skippedBaseLoopAssets}`);
  console.log(`Unmatched assets: ${unmatchedAssets}`);

  const duplicateCourses = [...matchedByCourseId.entries()].filter(([, assets]) => assets.length > 1);
  if (duplicateCourses.length > 0) {
    console.log(`Courses with multiple variants: ${duplicateCourses.length}`);
    for (const [courseId, assets] of duplicateCourses.slice(0, 10)) {
      console.log(
        `  ${courseId}: ${assets.map(({ filePath }) => path.basename(filePath)).join(', ')}`,
      );
    }
  }
}

try {
  await main();
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
