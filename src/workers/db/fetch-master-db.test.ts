import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  decompress: vi.fn((data: Uint8Array) => data),
  decompressBlock: vi.fn(
    (src: Uint8Array, dst: Uint8Array, sIndex: number, sLength: number, dIndex: number) => {
      const writeLength = Math.min(sLength, dst.length - dIndex);
      dst.set(src.subarray(sIndex, sIndex + writeLength), dIndex);
      return writeLength;
    },
  ),
}));

vi.mock('lz4js', () => ({
  default: {
    decompress: mocks.decompress,
    decompressBlock: mocks.decompressBlock,
  },
}));

function createLz4Block(payload: Uint8Array): Uint8Array {
  const block = new Uint8Array(4 + payload.length);
  const size = payload.length >>> 0;
  block[0] = size & 0xff;
  block[1] = (size >>> 8) & 0xff;
  block[2] = (size >>> 16) & 0xff;
  block[3] = (size >>> 24) & 0xff;
  block.set(payload, 4);
  return block;
}

function createBinaryResponse(payload: Uint8Array): Response {
  const arrayBuffer = new ArrayBuffer(payload.byteLength);
  new Uint8Array(arrayBuffer).set(payload);
  return new Response(arrayBuffer);
}

function encodeVlq(value: bigint): Array<number> {
  const chunks: Array<number> = [];
  let remaining = value;

  do {
    chunks.unshift(Number(remaining & 0x7fn));
    remaining >>= 7n;
  } while (remaining > 0n);

  for (let index = 0; index < chunks.length - 1; index += 1) {
    chunks[index] |= 0x80;
  }

  return chunks;
}

describe('fetch-master-db security bounds', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects oversized root manifest payload before parsing', async () => {
    const oversizedRootManifest = new Uint8Array(8 * 1024 * 1024 + 1);
    fetchMock.mockResolvedValueOnce(createBinaryResponse(oversizedRootManifest));

    const { fetchMasterDb } = await import('./fetch-master-db');
    await expect(fetchMasterDb({ resourceVersion: '20260308' })).rejects.toThrow(
      /root manifest compressed payload exceeded limit/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid BSV header in root manifest', async () => {
    const invalidBsvPayload = new Uint8Array([0, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    fetchMock.mockResolvedValueOnce(createBinaryResponse(createLz4Block(invalidBsvPayload)));

    const { fetchMasterDb } = await import('./fetch-master-db');
    await expect(fetchMasterDb({ resourceVersion: '20260308' })).rejects.toThrow(
      /invalid bsv magic/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized BSV row counts in root manifest', async () => {
    const rowCountTooLarge = 750_001n;
    const bsvPayload = new Uint8Array([
      0xbf,
      0x11,
      0x00,
      0x00,
      ...encodeVlq(rowCountTooLarge),
      0x00,
      0x00,
      0x00,
    ]);
    fetchMock.mockResolvedValueOnce(createBinaryResponse(createLz4Block(bsvPayload)));

    const { fetchMasterDb } = await import('./fetch-master-db');
    await expect(fetchMasterDb({ resourceVersion: '20260308' })).rejects.toThrow(
      /rowcount in bsv payload exceeded limit/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
