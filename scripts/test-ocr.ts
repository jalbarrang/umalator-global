#!/usr/bin/env node
/**
 * CLI tool to test the OCR parsing pipeline against a screenshot image.
 *
 * Usage:
 *   pnpm exec tsx scripts/test-ocr.ts <image-path>
 *   pnpm exec tsx scripts/test-ocr.ts ~/Downloads/taiki-test.jpeg
 *   pnpm exec tsx scripts/test-ocr.ts ~/Downloads/taiki-test.jpeg --raw  # show raw OCR text
 *   pnpm exec tsx scripts/test-ocr.ts ~/Downloads/taiki-test.jpeg --no-binarize  # skip binarization
 */

import path from 'node:path';
import fs from 'node:fs';
import { Command } from 'commander';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// Import the parsing pipeline (shared with the browser worker)
import { parseOcrResult } from '../src/modules/runners/ocr/parser';
import { getSkillLookup, getSkillById } from '../src/modules/data/skills';
import { getUmaLookup } from '../src/modules/runners/data/search';

// ─── Image Preprocessing ────────────────────────────────────────────────────

async function binarizeImage(inputPath: string): Promise<Buffer> {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();

  if (!width || !height) {
    throw new Error('Could not read image dimensions');
  }

  // Extract raw RGBA pixels
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Apply grayscale + threshold binarization (same as browser TesseractEngine)
  for (let i = 0; i < data.length; i += 4) {
    const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = grayscale >= 128 ? 255 : 0;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

async function runTesseract(
  input: string | Buffer,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const { data: { text } } = await worker.recognize(input);
  await worker.terminate();
  return text;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

function header(title: string) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function labelValue(label: string, value: unknown, indent = 2) {
  const pad = ' '.repeat(indent);
  const display = value === undefined || value === null ? '(not detected)' : String(value);
  console.log(`${pad}${label.padEnd(20)} ${display}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('test-ocr')
  .description('Test OCR pipeline against a screenshot image')
  .argument('<image>', 'Path to screenshot image (jpg, png, etc.)')
  .option('--raw', 'Show raw OCR text output')
  .option('--no-binarize', 'Skip image binarization preprocessing')
  .option('--save-binarized <path>', 'Save binarized image to a file for inspection')
  .action(async (imagePath: string, options: { raw?: boolean; binarize: boolean; saveBinarized?: string }) => {
    const resolvedPath = path.resolve(imagePath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      process.exit(1);
    }

    // Warm up lookups
    console.log('Building skill lookup...');
    const skillLookup = getSkillLookup();
    console.log(`  ${skillLookup.size} skill entries loaded`);

    const umaLookup = getUmaLookup();
    console.log(`  ${umaLookup.size} uma entries loaded`);

    // Preprocess
    let ocrInput: string | Buffer = resolvedPath;

    if (options.binarize) {
      process.stdout.write('Binarizing image... ');
      const binarized = await binarizeImage(resolvedPath);
      ocrInput = binarized;
      console.log(`done (${(binarized.length / 1024).toFixed(0)} KB)`);

      if (options.saveBinarized) {
        const savePath = path.resolve(options.saveBinarized);
        fs.writeFileSync(savePath, binarized);
        console.log(`  Saved binarized image to: ${savePath}`);
      }
    } else {
      console.log('Skipping binarization (--no-binarize)');
    }

    // OCR
    process.stdout.write('Running Tesseract OCR... ');
    let lastPercent = -1;
    const rawText = await runTesseract(ocrInput, (percent) => {
      if (percent !== lastPercent && percent % 20 === 0) {
        process.stdout.write(`${percent}% `);
        lastPercent = percent;
      }
    });
    console.log('done');

    if (options.raw) {
      header('Raw OCR Text');
      console.log(rawText);
    }

    // Parse
    header('Parsing Results');
    const result = parseOcrResult({ text: rawText }, 0);

    // Uma identity
    header('Uma Identity');
    labelValue('Outfit ID', result.outfitId);
    labelValue('Outfit Name', result.outfitName);
    labelValue('Uma Name', result.umaName);
    labelValue('Confidence', result.umaConfidence ? `${(result.umaConfidence * 100).toFixed(0)}%` : undefined);

    // Stats
    header('Stats');
    labelValue('Speed', result.speed);
    labelValue('Stamina', result.stamina);
    labelValue('Power', result.power);
    labelValue('Guts', result.guts);
    labelValue('Wisdom', result.wisdom);

    // Skills
    header(`Skills (${result.skills.length} detected)`);
    for (const skill of result.skills) {
      const skillData = getSkillById(skill.id);
      const idPrefix = skill.id.startsWith('9') ? '(inherited)' : skill.id.startsWith('1') && skill.id.length >= 6 ? '(unique)   ' : '           ';
      const confidenceStr = `${(skill.confidence * 100).toFixed(0)}%`.padStart(4);
      const nameStr = (skillData?.name ?? skill.name).padEnd(35);
      console.log(`  ${confidenceStr}  ${nameStr}  ${skill.id}  ${idPrefix}  ← "${skill.originalText}"`);
    }

    // Unrecognized
    if (result.unrecognized.length > 0) {
      header(`Unrecognized Lines (${result.unrecognized.length})`);
      for (const line of result.unrecognized) {
        console.log(`  · ${line}`);
      }
    }

    // Summary
    header('Summary');
    const expectedFromImage = {
      uma: 'Taiki Shuttle / [Wild Frontier]',
      stats: { speed: 1200, stamina: 667, power: 791, guts: 466, wisdom: 1030 },
      skills: [
        'Shooting for Victory! (Lvl 5 → unique)',
        'Triumphant Pulse',
        'Victoria por plancha ☆',
        'Tokyo Racecourse ○',
        'Professor of Curvature',
        'Straightaway Adept',
        'Mile Maven',
        'Mile Straightaways ◎',
        'Changing Gears',
        'Unyielding Spirit',
        'Tail Held High',
      ],
    };

    const detectedStats = [result.speed, result.stamina, result.power, result.guts, result.wisdom];
    const expectedStats = [1200, 667, 791, 466, 1030];
    const statsMatch = detectedStats.every((s, i) => s === expectedStats[i]);

    console.log(`  Uma detected:   ${result.outfitId ? '✓' : '✗'}`);
    console.log(`  Stats correct:  ${statsMatch ? '✓' : '✗'} (${detectedStats.join(', ')})`);
    console.log(`  Skills found:   ${result.skills.length} / ${expectedFromImage.skills.length} expected`);
    console.log(`  Unrecognized:   ${result.unrecognized.length} lines`);
    console.log();
  });

program.parse();
