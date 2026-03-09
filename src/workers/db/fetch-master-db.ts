import lz4jsModule from 'lz4js';

type Lz4JsModule = {
  decompress: (data: Uint8Array, maxSize?: number) => Uint8Array;
  decompressBlock: (
    src: Uint8Array,
    dst: Uint8Array,
    sIndex: number,
    sLength: number,
    dIndex: number,
  ) => number;
};

const lz4js = lz4jsModule as Lz4JsModule;

const CDN_PROXY_BASE = '/api/cdn';
const VERSION_PROXY_URL = '/api/ver';
const PATH_ROOT_MANIFEST = 'dl/vertical/{resourceVersion}/manifests/manifestdat/root.manifest.bsv.lz4';
const PATH_MANIFEST = 'dl/vertical/resources/Manifest/{prefix}/{hname}';
const PATH_GENERIC = 'dl/vertical/resources/Generic/{prefix}/{hname}';

const BSV_MAGIC = 0xbf;
const BSV_FORMAT_VERSION = 1;
const BSV_FORMAT_ANONYMOUS = 1;
const LZ4_FRAME_MAGIC = [0x04, 0x22, 0x4d, 0x18];

const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_PLATFORM = 'Windows';
const PLATFORM_CHOICES = ['Windows', 'iOS', 'Android'] as const;
const MB = 1024 * 1024;
const MAX_DOWNLOAD_BYTES = {
  versionResponse: 1 * MB,
  rootManifest: 8 * MB,
  platformManifest: 32 * MB,
  masterManifest: 32 * MB,
  masterDb: 256 * MB,
} as const;
const MAX_DECOMPRESSED_BYTES = {
  rootManifest: 32 * MB,
  platformManifest: 64 * MB,
  masterManifest: 64 * MB,
  masterDb: 768 * MB,
} as const;
const MAX_BSV_ROW_COUNT = 750_000;
const MAX_BSV_SCHEMA_COUNT = 512;

const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder();

export type Platform = (typeof PLATFORM_CHOICES)[number];

export interface FetchMasterDbProgress {
  step: string;
  percent: number;
}

export interface FetchMasterDbOptions {
  resourceVersion?: string;
  appVersion?: string | null;
  platform?: Platform;
  timeoutSeconds?: number;
  onProgress?: (progress: FetchMasterDbProgress) => void;
}

export interface FetchMasterDbResult {
  resourceVersion: string;
  appVersion: string | null;
  platform: Platform;
  mdbData: Uint8Array;
}

interface ManifestEntry {
  name: string;
  size: bigint;
  checksum: bigint;
  hname: string;
}

interface RootEntry {
  platform: string;
  size: bigint;
  checksum: bigint;
  hname: string;
}

type BsvValue = string | bigint;
type Schema = [typeByte: number, fixedSize: number | null];

function emitProgress(
  onProgress: FetchMasterDbOptions['onProgress'],
  step: string,
  percent: number,
): void {
  onProgress?.({ step, percent });
}

function enforceMaxBytes(
  artifact: string,
  stage: 'compressed' | 'decompressed',
  actualBytes: number,
  maxBytes: number,
): void {
  if (actualBytes > maxBytes) {
    throw new Error(
      `${artifact} ${stage} payload exceeded limit (${actualBytes} bytes, max ${maxBytes} bytes)`,
    );
  }
}

function enforceUnsignedCountLimit(name: string, value: bigint, max: number): number {
  if (value < 0n) {
    throw new Error(`Invalid negative ${name} in BSV payload`);
  }

  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${name} in BSV payload exceeds safe integer range: ${value.toString()}`);
  }

  if (value > BigInt(max)) {
    throw new Error(`${name} in BSV payload exceeded limit (${value.toString()}, max ${max})`);
  }

  return Number(value);
}

function toBase32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 0x1f];
  }

  return output;
}

async function calcHName(checksum: bigint, size: bigint, name: Uint8Array): Promise<string> {
  const header = new Uint8Array(16);
  const headerView = new DataView(header.buffer);
  headerView.setBigUint64(0, checksum, false);
  headerView.setBigUint64(8, size, false);

  const payload = new Uint8Array(header.length + name.length);
  payload.set(header, 0);
  payload.set(name, header.length);

  const digest = await crypto.subtle.digest('SHA-1', payload);
  return toBase32(new Uint8Array(digest));
}

async function downloadFile(
  url: string,
  timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS,
  options?: {
    artifact: string;
    maxBytes?: number;
  },
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: '*/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    }

    if (options?.maxBytes !== undefined) {
      const artifact = options.artifact;
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const parsedContentLength = Number(contentLength);
        if (Number.isFinite(parsedContentLength)) {
          enforceMaxBytes(artifact, 'compressed', parsedContentLength, options.maxBytes);
        }
      }
    }

    const responseBytes = new Uint8Array(await response.arrayBuffer());
    if (options?.maxBytes !== undefined) {
      enforceMaxBytes(options.artifact, 'compressed', responseBytes.length, options.maxBytes);
    }

    return responseBytes;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutSeconds}s for ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isLz4Compressed(data: Uint8Array): boolean {
  return (
    data.length >= 4 &&
    data[0] === LZ4_FRAME_MAGIC[0] &&
    data[1] === LZ4_FRAME_MAGIC[1] &&
    data[2] === LZ4_FRAME_MAGIC[2] &&
    data[3] === LZ4_FRAME_MAGIC[3]
  );
}

function decompressLz4(
  data: Uint8Array,
  options?: {
    artifact: string;
    maxOutputBytes?: number;
  },
): Uint8Array {
  if (data.length < 4) {
    throw new Error('Data too short for LZ4 header');
  }

  const maxOutputBytes = options?.maxOutputBytes;
  if (isLz4Compressed(data)) {
    const decompressed = Uint8Array.from(lz4js.decompress(data, maxOutputBytes));
    if (maxOutputBytes !== undefined) {
      enforceMaxBytes(options?.artifact ?? 'unknown artifact', 'decompressed', decompressed.length, maxOutputBytes);
    }
    return decompressed;
  }

  const uncompressedSize = (data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)) >>> 0;
  if (maxOutputBytes !== undefined) {
    enforceMaxBytes(options?.artifact ?? 'unknown artifact', 'decompressed', uncompressedSize, maxOutputBytes);
  }
  const dst = new Uint8Array(uncompressedSize);
  const written = lz4js.decompressBlock(data, dst, 4, data.length - 4, 0);
  const decompressed = written === dst.length ? dst : dst.slice(0, written);
  if (maxOutputBytes !== undefined) {
    enforceMaxBytes(options?.artifact ?? 'unknown artifact', 'decompressed', decompressed.length, maxOutputBytes);
  }
  return decompressed;
}

function asString(value: BsvValue): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string BSV value, got ${typeof value}`);
  }
  return value;
}

function asBigInt(value: BsvValue): bigint {
  if (typeof value !== 'bigint') {
    throw new Error(`Expected bigint BSV value, got ${typeof value}`);
  }
  return value;
}

class BsvParser {
  private readonly data: Uint8Array;
  private offset = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  setOffset(offset: number): void {
    this.offset = offset;
  }

  readVlq(maxBytes = 8): bigint {
    let value = 0n;
    let bytesRead = 0;

    while (bytesRead < maxBytes && this.offset < this.data.length) {
      const byte = this.data[this.offset];
      this.offset += 1;
      bytesRead += 1;

      value = (value << 7n) | BigInt(byte & 0x7f);

      if ((byte & 0x80) === 0) {
        break;
      }
    }

    return value;
  }

  readUnum(numBytes: number): bigint {
    if (this.offset + numBytes > this.data.length) {
      throw new Error('Unexpected end of BSV data while reading integer');
    }

    let value = 0n;
    for (let i = 0; i < numBytes; i += 1) {
      value = (value << 8n) | BigInt(this.data[this.offset + i]);
    }
    this.offset += numBytes;
    return value;
  }

  readText(): string {
    const start = this.offset;
    while (this.offset < this.data.length && this.data[this.offset] !== 0) {
      this.offset += 1;
    }
    const text = textDecoder.decode(this.data.slice(start, this.offset));
    if (this.offset < this.data.length) {
      this.offset += 1;
    }
    return text;
  }

  readByte(): number {
    if (this.offset >= this.data.length) {
      throw new Error('Unexpected end of BSV data while reading byte');
    }
    const value = this.data[this.offset];
    this.offset += 1;
    return value;
  }
}

function parseAnonymousBsv(
  data: Uint8Array,
): [rows: Array<Array<BsvValue>>, schemas: Array<Schema>] {
  if (data.length < 2) {
    throw new Error('BSV data too short');
  }

  if (data[0] !== BSV_MAGIC) {
    throw new Error(
      `Invalid BSV magic: expected 0x${BSV_MAGIC.toString(16)}, got 0x${data[0].toString(16)}`,
    );
  }

  const formatByte = data[1];
  const version = (formatByte >> 4) & 0x0f;
  const formatType = formatByte & 0x0f;

  if (version !== BSV_FORMAT_VERSION) {
    throw new Error(`Unsupported BSV version: ${version}, expected ${BSV_FORMAT_VERSION}`);
  }
  if (formatType !== BSV_FORMAT_ANONYMOUS) {
    throw new Error(`Expected ANONYMOUS format (${BSV_FORMAT_ANONYMOUS}), got ${formatType}`);
  }

  const parser = new BsvParser(data);
  parser.setOffset(2);

  parser.readUnum(2);
  const rowCount = enforceUnsignedCountLimit('rowCount', parser.readVlq(), MAX_BSV_ROW_COUNT);
  parser.readVlq();
  parser.readVlq();
  const schemaCount = enforceUnsignedCountLimit(
    'schemaCount',
    parser.readVlq(),
    MAX_BSV_SCHEMA_COUNT,
  );

  const schemas: Array<Schema> = [];
  for (let i = 0; i < schemaCount; i += 1) {
    const typeByte = parser.readByte();
    let fixedSize: number | null = null;

    if (((typeByte - 0x21) & 0xcf) === 0 && typeByte !== 0x51) {
      fixedSize = Number(parser.readVlq());
    }

    schemas.push([typeByte, fixedSize]);
  }

  const rows: Array<Array<BsvValue>> = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row: Array<BsvValue> = [];

    for (const [typeByte, fixedSize] of schemas) {
      const baseType = typeByte & 0xf0;

      if (typeByte === 0x40 || baseType === 0x40) {
        row.push(parser.readText());
      } else if (typeByte === 0x11 || typeByte === 0x12 || typeByte === 0x13 || baseType === 0x10) {
        row.push(parser.readVlq());
      } else if (fixedSize !== null) {
        row.push(parser.readUnum(fixedSize));
      } else {
        throw new Error(`Unknown BSV type: 0x${typeByte.toString(16).toUpperCase()}`);
      }
    }

    rows.push(row);
  }

  return [rows, schemas];
}

async function parseRootManifest(data: Uint8Array): Promise<Array<RootEntry>> {
  const [rows] = parseAnonymousBsv(data);
  const entries: Array<RootEntry> = [];

  for (const row of rows) {
    if (row.length < 3) {
      continue;
    }

    const platform = asString(row[0]);
    const size = asBigInt(row[1]);
    const checksum = asBigInt(row[2]);
    const hname = await calcHName(checksum, size, textEncoder.encode(platform));

    entries.push({
      platform,
      size,
      checksum,
      hname,
    });
  }

  return entries;
}

async function parseContentManifest(data: Uint8Array): Promise<Array<ManifestEntry>> {
  const [rows] = parseAnonymousBsv(data);
  const parsedRows = rows
    .map((row) => {
      if (row.length >= 7) {
        return {
          name: asString(row[0]),
          size: asBigInt(row[4]),
          checksum: asBigInt(row[5]),
        };
      }
      if (row.length >= 3) {
        return {
          name: asString(row[0]),
          size: asBigInt(row[1]),
          checksum: asBigInt(row[2]),
        };
      }
      return null;
    })
    .filter((entry): entry is { name: string; size: bigint; checksum: bigint } => entry !== null);

  return Promise.all(
    parsedRows.map(async (entry) => ({
      ...entry,
      hname: await calcHName(entry.checksum, entry.size, textEncoder.encode(entry.name)),
    })),
  );
}

function getRootManifestUrl(resourceVersion: string): string {
  const path = PATH_ROOT_MANIFEST.replace('{resourceVersion}', resourceVersion);
  return `${CDN_PROXY_BASE}/${path}`;
}

function getManifestUrl(hname: string): string {
  const path = PATH_MANIFEST.replace('{prefix}', hname.slice(0, 2)).replace('{hname}', hname);
  return `${CDN_PROXY_BASE}/${path}`;
}

function getGenericUrl(hname: string): string {
  const path = PATH_GENERIC.replace('{prefix}', hname.slice(0, 2)).replace('{hname}', hname);
  return `${CDN_PROXY_BASE}/${path}`;
}

function parseVersionField(payload: unknown): string | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return String(Math.trunc(payload));
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    const match = trimmed.match(/\d{6,}/);
    return match?.[0] ?? null;
  }

  return null;
}

export type LatestVersionInfo = {
  resourceVersion: string;
  appVersion: string | null;
};

function extractLatestVersionInfo(payload: unknown): LatestVersionInfo | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const current = (payload as Record<string, unknown>).current;
  if (!current || typeof current !== 'object') {
    return null;
  }

  const currentRecord = current as Record<string, unknown>;
  const resourceVersion = parseVersionField(currentRecord.resource_version);
  if (!resourceVersion) {
    return null;
  }

  return {
    resourceVersion,
    appVersion: parseVersionField(currentRecord.app_version),
  };
}

export async function fetchLatestVersionInfo(
  timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS,
): Promise<LatestVersionInfo> {
  const responseData = await downloadFile(VERSION_PROXY_URL, timeoutSeconds, {
    artifact: 'version response',
    maxBytes: MAX_DOWNLOAD_BYTES.versionResponse,
  });
  const text = textDecoder.decode(responseData).trim();
  if (!text) {
    throw new Error('Version API returned an empty response');
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    const versionInfo = extractLatestVersionInfo(parsed);
    if (versionInfo) {
      return versionInfo;
    }
  } catch {
    throw new Error(`Failed to parse /api/ver JSON response: ${text.slice(0, 160)}`);
  }

  throw new Error(
    `Could not parse current.resource_version from /api/ver response: ${text.slice(0, 160)}`,
  );
}

/**
 * @deprecated Use fetchLatestVersionInfo() and read resourceVersion.
 */
export async function fetchLatestAppVer(
  timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS,
): Promise<string> {
  const versionInfo = await fetchLatestVersionInfo(timeoutSeconds);
  return versionInfo.resourceVersion;
}

export async function fetchMasterDb(options: FetchMasterDbOptions = {}): Promise<FetchMasterDbResult> {
  const timeoutSeconds = options.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const platform = options.platform ?? DEFAULT_PLATFORM;

  if (!PLATFORM_CHOICES.includes(platform)) {
    throw new Error(`Unsupported platform '${platform}'`);
  }

  let resourceVersion = options.resourceVersion;
  let appVersion = options.appVersion ?? null;
  if (!resourceVersion) {
    emitProgress(options.onProgress, 'Resolving resource version', 5);
    const latestVersion = await fetchLatestVersionInfo(timeoutSeconds);
    resourceVersion = latestVersion.resourceVersion;
    if (options.appVersion === undefined) {
      appVersion = latestVersion.appVersion;
    }
  } else {
    emitProgress(options.onProgress, 'Using provided resource version', 5);
  }

  emitProgress(options.onProgress, 'Downloading root manifest', 15);
  const rootCompressed = await downloadFile(getRootManifestUrl(resourceVersion), timeoutSeconds, {
    artifact: 'root manifest',
    maxBytes: MAX_DOWNLOAD_BYTES.rootManifest,
  });
  const rootData = decompressLz4(rootCompressed, {
    artifact: 'root manifest',
    maxOutputBytes: MAX_DECOMPRESSED_BYTES.rootManifest,
  });
  const rootEntries = await parseRootManifest(rootData);

  const platformEntry = rootEntries.find(
    (entry) => entry.platform.toLowerCase() === platform.toLowerCase(),
  );
  if (!platformEntry) {
    throw new Error(`Platform '${platform}' not found in root manifest`);
  }

  emitProgress(options.onProgress, 'Downloading platform manifest', 35);
  let platformData = await downloadFile(getManifestUrl(platformEntry.hname), timeoutSeconds, {
    artifact: 'platform manifest',
    maxBytes: MAX_DOWNLOAD_BYTES.platformManifest,
  });
  if (isLz4Compressed(platformData)) {
    platformData = decompressLz4(platformData, {
      artifact: 'platform manifest',
      maxOutputBytes: MAX_DECOMPRESSED_BYTES.platformManifest,
    });
  } else {
    enforceMaxBytes(
      'platform manifest',
      'decompressed',
      platformData.length,
      MAX_DECOMPRESSED_BYTES.platformManifest,
    );
  }
  const platformEntries = await parseContentManifest(platformData);

  const masterEntry = platformEntries.find((entry) => entry.name.toLowerCase() === 'master');
  if (!masterEntry) {
    throw new Error("'master' entry not found in platform manifest");
  }

  emitProgress(options.onProgress, 'Downloading master manifest', 55);
  let masterManifestData = await downloadFile(getManifestUrl(masterEntry.hname), timeoutSeconds, {
    artifact: 'master manifest',
    maxBytes: MAX_DOWNLOAD_BYTES.masterManifest,
  });
  if (isLz4Compressed(masterManifestData)) {
    masterManifestData = decompressLz4(masterManifestData, {
      artifact: 'master manifest',
      maxOutputBytes: MAX_DECOMPRESSED_BYTES.masterManifest,
    });
  } else {
    enforceMaxBytes(
      'master manifest',
      'decompressed',
      masterManifestData.length,
      MAX_DECOMPRESSED_BYTES.masterManifest,
    );
  }
  const masterEntries = await parseContentManifest(masterManifestData);

  const mdbEntry = masterEntries.find((entry) => {
    const normalizedName = entry.name.toLowerCase();
    return normalizedName === 'master.mdb' || normalizedName === 'master.mdb.lz4';
  });
  if (!mdbEntry) {
    throw new Error("'master.mdb.lz4' entry not found in master manifest");
  }

  emitProgress(options.onProgress, 'Downloading master.mdb', 75);
  const mdbCompressed = await downloadFile(getGenericUrl(mdbEntry.hname), timeoutSeconds, {
    artifact: 'master.mdb',
    maxBytes: MAX_DOWNLOAD_BYTES.masterDb,
  });

  emitProgress(options.onProgress, 'Decompressing master.mdb', 90);
  const mdbData = decompressLz4(mdbCompressed, {
    artifact: 'master.mdb',
    maxOutputBytes: MAX_DECOMPRESSED_BYTES.masterDb,
  });

  emitProgress(options.onProgress, 'Master DB ready', 100);
  return {
    resourceVersion,
    appVersion,
    platform,
    mdbData,
  };
}
