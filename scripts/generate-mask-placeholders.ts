#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MASK_COLOR = {
  r: 0x33,
  g: 0x33,
  b: 0x33,
  a: 0xff,
};

async function generateMaskPng(
  outputPath: string,
  width: number,
  height: number,
  windows: WindowRect[],
): Promise<void> {
  const pixels = Buffer.alloc(width * height * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = MASK_COLOR.r;
    pixels[i + 1] = MASK_COLOR.g;
    pixels[i + 2] = MASK_COLOR.b;
    pixels[i + 3] = MASK_COLOR.a;
  }

  for (const window of windows) {
    const startX = Math.max(0, window.x);
    const startY = Math.max(0, window.y);
    const endX = Math.min(width, window.x + window.width);
    const endY = Math.min(height, window.y + window.height);

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const index = (y * width + x) * 4;
        pixels[index + 3] = 0;
      }
    }
  }

  await sharp(pixels, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);
}

async function main(): Promise<void> {
  const maskDir = path.resolve(process.cwd(), 'public/masks');
  await fs.mkdir(maskDir, { recursive: true });

  await generateMaskPng(path.join(maskDir, 'mask-full-details.png'), 1290, 2200, [
    { x: 300, y: 120, width: 900, height: 200 },
    { x: 50, y: 380, width: 1190, height: 120 },
    { x: 50, y: 620, width: 1190, height: 1400 },
  ]);

  await generateMaskPng(path.join(maskDir, 'mask-skills-only.png'), 1290, 1500, [
    { x: 50, y: 50, width: 1190, height: 1400 },
  ]);

  console.log('Generated mask placeholders:');
  console.log(' - public/masks/mask-full-details.png');
  console.log(' - public/masks/mask-skills-only.png');
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error('Failed to generate mask placeholders', error);
    process.exit(1);
  });
}
