import {
  extractEncodedPayload,
  gzipStringToBase64,
  gunzipBase64ToString
} from '@/modules/runners/share/gzip-base64';
import { parseRaceSimSnapshotJson } from './snapshot';
import type { RaceSimSnapshot } from './types';

const SHARE_CODE_PREFIX = 'rs1:';

export async function encodeRaceSimShareCode(snapshot: RaceSimSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const payload = await gzipStringToBase64(json);
  return `${SHARE_CODE_PREFIX}${payload}`;
}

export async function decodeRaceSimShareCode(input: string): Promise<RaceSimSnapshot | null> {
  try {
    const encoded = extractEncodedPayload(input);
    if (!encoded.startsWith(SHARE_CODE_PREFIX)) return null;

    const payload = encoded.slice(SHARE_CODE_PREFIX.length);
    if (!payload) return null;

    const json = await gunzipBase64ToString(payload);
    return parseRaceSimSnapshotJson(json);
  } catch {
    return null;
  }
}
