import { config } from '@/config';
import type { FrontendModel, RaceRoomModelSpec } from './types';

const modelPromiseById = new Map<string, Promise<FrontendModel>>();

async function gunzipToString(buffer: ArrayBuffer): Promise<string> {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decompressed = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(decompressed);
}

export async function loadRaceRoomModel(spec: RaceRoomModelSpec): Promise<FrontendModel> {
  const cacheKey = `${spec.id}:${spec.artifactPath}`;
  if (!modelPromiseById.has(cacheKey)) {
    const modelPromise = fetch(`${config.basePath}${spec.artifactPath}`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${spec.label}: HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(async (buffer) => JSON.parse(await gunzipToString(buffer)) as FrontendModel);
    modelPromiseById.set(cacheKey, modelPromise);
  }
  return modelPromiseById.get(cacheKey)!;
}
