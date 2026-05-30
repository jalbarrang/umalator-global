/**
 * Suggestion bot Worker.
 *
 * Receives suggestions from the app, verifies a Cloudflare Turnstile token, optionally
 * rate-limits per IP, and forwards a formatted embed to a Discord webhook.
 */

type Env = {
  /** Comma-separated list of app origins allowed to call this Worker (CORS). */
  ALLOWED_ORIGIN: string;
  /** Discord channel webhook URL (secret). */
  DISCORD_WEBHOOK_URL: string;
  /** Turnstile secret key (secret). */
  TURNSTILE_SECRET_KEY: string;
  /** Optional KV namespace for per-IP rate limiting. */
  RATE_LIMIT_KV?: KVNamespace;
};

const CATEGORIES = ['bug', 'feature', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

const MESSAGE_MIN = 1;
const MESSAGE_MAX = 2000;

// Per-IP rate limit: max submissions within the window (only enforced when RATE_LIMIT_KV is bound).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

const CATEGORY_META: Record<Category, { label: string; color: number }> = {
  bug: { label: '🐞 Bug', color: 0xef4444 },
  feature: { label: '💡 Feature', color: 0x3b82f6 },
  other: { label: '💬 Other', color: 0x9ca3af }
};

type SuggestionPayload = {
  category: Category;
  message: string;
  token: string;
  metadata?: {
    route?: string;
    version?: string;
    userAgent?: string;
  };
};

/** Resolves the request's Origin against the allowlist; returns it when allowed, else null. */
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  // CORS requires echoing a single concrete origin, never a list.
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(
  body: unknown,
  status: number,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

function parsePayload(raw: unknown): { ok: true; value: SuggestionPayload } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid request body.' };
  }
  const body = raw as Record<string, unknown>;

  if (!isCategory(body.category)) {
    return { ok: false, error: 'Invalid category.' };
  }
  if (typeof body.message !== 'string') {
    return { ok: false, error: 'Message is required.' };
  }
  const message = body.message.trim();
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return { ok: false, error: `Message must be ${MESSAGE_MIN}–${MESSAGE_MAX} characters.` };
  }
  if (typeof body.token !== 'string' || body.token.length === 0) {
    return { ok: false, error: 'Missing verification token.' };
  }

  const metadataRaw =
    typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as Record<string, unknown>)
      : {};
  const pickString = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v.slice(0, 512) : undefined;

  return {
    ok: true,
    value: {
      category: body.category,
      message,
      token: body.token,
      metadata: {
        route: pickString(metadataRaw.route),
        version: pickString(metadataRaw.version),
        userAgent: pickString(metadataRaw.userAgent)
      }
    }
  };
}

async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form
    });
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Returns true when the request is within the rate limit (or limiting is disabled). */
async function withinRateLimit(env: Env, ip: string | null): Promise<boolean> {
  if (!env.RATE_LIMIT_KV || !ip) return true;

  const key = `rl:${ip}`;
  const current = Number((await env.RATE_LIMIT_KV.get(key)) ?? '0');
  if (current >= RATE_LIMIT_MAX) return false;

  await env.RATE_LIMIT_KV.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS
  });
  return true;
}

async function postToDiscord(env: Env, payload: SuggestionPayload): Promise<boolean> {
  const meta = CATEGORY_META[payload.category];
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (payload.metadata?.route) {
    fields.push({ name: 'Route', value: payload.metadata.route, inline: true });
  }
  if (payload.metadata?.version) {
    fields.push({ name: 'Version', value: payload.metadata.version, inline: true });
  }
  if (payload.metadata?.userAgent) {
    fields.push({ name: 'User agent', value: payload.metadata.userAgent.slice(0, 1024) });
  }

  const body = {
    embeds: [
      {
        title: meta.label,
        description: payload.message,
        color: meta.color,
        fields,
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const resp = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestOrigin = request.headers.get('Origin');
    const allowedOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN, requestOrigin);
    const cors = corsHeaders(allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, cors);
    }
    // Reject browser requests from disallowed origins (non-browser clients send no
    // Origin header and are gated by Turnstile instead).
    if (requestOrigin && !allowedOrigin) {
      return json({ ok: false, error: 'Origin not allowed.' }, 403, cors);
    }
    if (!env.DISCORD_WEBHOOK_URL || !env.TURNSTILE_SECRET_KEY) {
      return json({ ok: false, error: 'Worker is not configured.' }, 500, cors);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON.' }, 400, cors);
    }

    const parsed = parsePayload(raw);
    if (!parsed.ok) {
      return json({ ok: false, error: parsed.error }, 400, cors);
    }

    const ip = request.headers.get('CF-Connecting-IP');

    if (!(await withinRateLimit(env, ip))) {
      return json({ ok: false, error: 'Too many submissions. Try again later.' }, 429, cors);
    }

    const verified = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, parsed.value.token, ip);
    if (!verified) {
      return json({ ok: false, error: 'Verification failed.' }, 403, cors);
    }

    const delivered = await postToDiscord(env, parsed.value);
    if (!delivered) {
      return json({ ok: false, error: 'Failed to deliver suggestion.' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  }
} satisfies ExportedHandler<Env>;
