import {
  extractEncodedPayload,
  gzipStringToBase64,
  gunzipBase64ToString
} from '@/modules/runners/share/gzip-base64';
import { parseCaratPlanSnapshotJson } from './snapshot';
import type { CaratPlanSnapshot } from './types';

const SHARE_CODE_PREFIX = 'cp1:';

export async function encodeCaratPlanShareCode(snapshot: CaratPlanSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const payload = await gzipStringToBase64(json);
  return `${SHARE_CODE_PREFIX}${payload}`;
}

export async function decodeCaratPlanShareCode(input: string): Promise<CaratPlanSnapshot | null> {
  try {
    const encoded = extractEncodedPayload(input);
    if (!encoded.startsWith(SHARE_CODE_PREFIX)) return null;

    const payload = encoded.slice(SHARE_CODE_PREFIX.length);
    if (!payload) return null;

    const json = await gunzipBase64ToString(payload);
    return parseCaratPlanSnapshotJson(json);
  } catch {
    return null;
  }
}
