import { BitVector } from './bit-vector';
import type { SingleExportData, SingleExportSkill } from './types';

const MIN_BITS_PER_CHARACTER = 109;

function currentUtcTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const standard = base64.replaceAll('-', '+').replaceAll('_', '/');
  const binaryStr = atob(standard);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.codePointAt(i)!;
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const binaryStr = Array.from(bytes)
    .map((byte) => String.fromCodePoint(byte))
    .join('');
  const standard = btoa(binaryStr);
  return standard.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function decompressGzip(compressedBase64: string): Promise<string> {
  const compressedBytes = base64ToBytes(compressedBase64) as unknown as BlobPart;
  const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decompressedBuffer = await new Response(stream).arrayBuffer();
  return bytesToBase64(new Uint8Array(decompressedBuffer));
}

function extractEncodedPayload(input: string): string {
  const trimmed = input.trim();
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex !== -1) return trimmed.slice(hashIndex + 1);
  return trimmed;
}

function decodeCharacter(bv: BitVector): SingleExportData {
  const card_id = bv.read(20);
  bv.read(3); // talent_level — discarded

  let rank_score: number | undefined;
  if (bv.read(1) === 1) {
    rank_score = bv.read(15);
  }

  const speed = bv.read(11);
  const stamina = bv.read(11);
  const power = bv.read(11);
  const guts = bv.read(11);
  const wiz = bv.read(11);

  const proper_distance_short = bv.read(3) + 1;
  const proper_distance_mile = bv.read(3) + 1;
  const proper_distance_middle = bv.read(3) + 1;
  const proper_distance_long = bv.read(3) + 1;
  const proper_ground_turf = bv.read(3) + 1;
  const proper_ground_dirt = bv.read(3) + 1;
  const proper_running_style_nige = bv.read(3) + 1;
  const proper_running_style_senko = bv.read(3) + 1;
  const proper_running_style_sashi = bv.read(3) + 1;
  const proper_running_style_oikomi = bv.read(3) + 1;

  const factorCount = bv.read(4);
  for (let i = 0; i < factorCount; i++) {
    bv.read(24);
  }

  const skillCount = bv.read(6);
  const skill_array: SingleExportSkill[] = [];
  for (let i = 0; i < skillCount; i++) {
    const skill_id = bv.read(20);
    const skill_level = bv.read(1) === 0 ? 1 : 2;
    skill_array.push({ skill_id, skill_level });
  }

  const parentCount = bv.read(2);
  for (let i = 0; i < parentCount; i++) {
    bv.read(20);
    bv.read(3);
    const parentFactorCount = bv.read(4);
    for (let j = 0; j < parentFactorCount; j++) {
      bv.read(24);
    }
  }

  return {
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
    create_time: currentUtcTimestamp(),
    rank_score,
    skill_array,
  };
}

export async function decodeRoster(input: string): Promise<SingleExportData[] | null> {
  try {
    const encoded = extractEncodedPayload(input);
    if (!encoded) return null;

    let base64Str: string;
    if (encoded.startsWith('z')) {
      base64Str = await decompressGzip(encoded.slice(1));
    } else {
      base64Str = encoded;
    }

    const bv = BitVector.fromBase64(base64Str);

    if (bv.bitsRemaining() < 8) return null;
    const version = bv.read(8);
    if (version !== 4) return null;

    const results: SingleExportData[] = [];
    while (bv.bitsRemaining() >= MIN_BITS_PER_CHARACTER) {
      results.push(decodeCharacter(bv));
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}
