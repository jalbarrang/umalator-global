/**
 * Timeline proxy Worker.
 *
 * uma.moe serves gacha/banner data as static, browser-proof-gated resources
 * (NOT through its documented `/api/*` routes). The flow is:
 *
 *   GET /resources/manifest.json            (needs X-API-Key or browser proof)
 *     -> find artifact entry (e.g. banner_timeline.json)
 *   GET /resources/current/<artifact>.json.gz
 *     -> gunzip -> JSON
 *
 * This Worker holds the upstream `UMA_MOE_API_KEY` server-side and exposes a
 * small, read-only surface. Access is gated by EITHER:
 *   - a request Origin on the allowlist (browser callers), OR
 *   - a matching local API key (scripts / local dev) via `X-Proxy-Key` header
 *     or `?key=` query param.
 *
 *   browser/script -> GET /timeline -> Worker -> uma.moe resources -> JSON
 */

type Env = {
  /** Upstream uma.moe API key (secret). Sent as X-API-Key to uma.moe. */
  UMA_MOE_API_KEY: string;
  /** Comma-separated app/local origins allowed to call this Worker (CORS + gate). */
  ALLOWED_ORIGIN: string;
  /** Optional shared key for non-browser callers (secret). When set, callers may
   *  pass it via `X-Proxy-Key` header or `?key=` to bypass the origin gate. */
  PROXY_API_KEY?: string;
};

const UMA_BASE = 'https://uma.moe';

// Cache upstream resources at the edge; banners change at most a few times a day.
const RESOURCE_CACHE_TTL_SECONDS = 300;

/**
 * Public route -> upstream manifest artifact name. Only these resources can be
 * proxied; arbitrary artifact names are rejected.
 */
const ROUTES: Record<string, string> = {
  '/timeline': 'banner_timeline.json',
  '/banners/character': 'character_banners.json',
  '/banners/support': 'supports_banners.json',
  '/banners/paid': 'paid_gacha_banners.json'
};

type ManifestArtifact = {
  name: string;
  path?: string;
  current_path?: string;
};

type Manifest = {
  version?: string;
  generated_at?: string;
  artifacts?: ManifestArtifact[];
};

function resolveAllowedOrigin(allowList: string, requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const allowed = allowList
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  // CORS requires echoing a single concrete origin, never a list.
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

/** Timing-safe-ish string compare to avoid trivial key probing via length/early-exit. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function hasValidProxyKey(env: Env, request: Request, url: URL): boolean {
  if (!env.PROXY_API_KEY) return false;
  const provided = request.headers.get('X-Proxy-Key') ?? url.searchParams.get('key');
  return typeof provided === 'string' && safeEqual(provided, env.PROXY_API_KEY);
}

/** Reads a response body that may be gzip-encoded, returning decoded text. */
async function readMaybeGzip(response: Response): Promise<string> {
  const buffer = new Uint8Array(await response.arrayBuffer());
  const isGzip = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(buffer);

  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function fetchManifest(env: Env): Promise<Manifest> {
  const response = await fetch(`${UMA_BASE}/resources/manifest.json`, {
    headers: { Accept: 'application/json', 'X-API-Key': env.UMA_MOE_API_KEY },
    cf: { cacheTtl: RESOURCE_CACHE_TTL_SECONDS, cacheEverything: true }
  });
  if (!response.ok) {
    throw new Error(`manifest ${response.status}`);
  }
  return (await response.json()) as Manifest;
}

async function fetchResource(env: Env, artifactName: string): Promise<string> {
  const manifest = await fetchManifest(env);
  const entry = manifest.artifacts?.find((artifact) => artifact.name === artifactName);
  const resourcePath = entry?.current_path ?? entry?.path;
  if (!resourcePath) {
    throw new Error(`artifact ${artifactName} not in manifest`);
  }

  const resourceUrl = new URL(resourcePath, UMA_BASE).toString();
  const response = await fetch(resourceUrl, {
    headers: { 'X-API-Key': env.UMA_MOE_API_KEY },
    cf: { cacheTtl: RESOURCE_CACHE_TTL_SECONDS, cacheEverything: true }
  });
  if (!response.ok) {
    throw new Error(`resource ${response.status}`);
  }
  return readMaybeGzip(response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('Origin');
    const allowedOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN, requestOrigin);
    const cors = corsHeaders(allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, cors);
    }
    if (!env.UMA_MOE_API_KEY) {
      return json({ ok: false, error: 'Worker is not configured.' }, 500, cors);
    }

    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/health') {
      return json({ ok: true, routes: Object.keys(ROUTES) }, 200, cors);
    }

    // Dual gate: allow if Origin is on the allowlist OR a valid local key is supplied.
    const originAllowed = requestOrigin !== null && allowedOrigin !== null;
    const keyAllowed = hasValidProxyKey(env, request, url);
    if (!originAllowed && !keyAllowed) {
      return json({ ok: false, error: 'Forbidden.' }, 403, cors);
    }

    const artifactName = ROUTES[path];
    if (!artifactName) {
      return json({ ok: false, error: 'Not found.' }, 404, cors);
    }

    let payload: string;
    try {
      payload = await fetchResource(env, artifactName);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      return json({ ok: false, error: 'Upstream fetch failed.', detail }, 502, cors);
    }

    return new Response(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${RESOURCE_CACHE_TTL_SECONDS}`,
        ...cors
      }
    });
  }
} satisfies ExportedHandler<Env>;
