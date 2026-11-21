import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROJECT_URL = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const ALLOWED_ORIGINS = new Set([
  "https://allegrovibez.com",
  "https://www.allegrovibez.com",
]);

function keyFromJson(envName: string): string {
  try {
    const parsed = JSON.parse(Deno.env.get(envName) || "{}");
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return "";
  }
}

const PUBLISHABLE_KEY =
  keyFromJson("SUPABASE_PUBLISHABLE_KEYS") ||
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "";
const SERVICE_KEY =
  keyFromJson("SUPABASE_SECRET_KEYS") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

function response(body: Record<string, unknown>, status = 200, origin?: string) {
  const headers = new Headers(BASE_HEADERS);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function validSlug(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 700) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function hostAllowed(urlValue: unknown, hosts: Set<string>): string | null {
  const safe = validHttpsUrl(urlValue);
  if (!safe) return null;
  const host = new URL(safe).hostname.toLowerCase().replace(/^www\./, "");
  return hosts.has(host) ? safe : null;
}

const MUSIC_HOSTS = new Set([
  "spotify.com", "open.spotify.com", "music.apple.com", "soundcloud.com",
  "youtube.com", "youtu.be", "bandcamp.com", "deezer.com",
]);
const SOCIAL_HOSTS = new Set([
  "instagram.com", "tiktok.com", "facebook.com", "x.com",
  "twitter.com", "threads.net",
]);

function safeLinkList(value: unknown, hosts: Set<string>) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) throw new Error("Invalid link list.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid link item.");
    const label = cleanText((item as Record<string, unknown>).label, 60);
    const url = hostAllowed((item as Record<string, unknown>).url, hosts);
    if (!label || !url) throw new Error("A link uses an unsupported provider or URL.");
    return { label, url };
  });
}

function safeEvents(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) throw new Error("Invalid events list.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid event item.");
    const row = item as Record<string, unknown>;
    const title = cleanText(row.title, 120);
    const date = cleanText(row.date, 10);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Each event needs a title and valid date.");
    return {
      title,
      date,
      venue: cleanText(row.venue, 100) || null,
      city: cleanText(row.city, 80) || null,
      country_code: cleanText(row.country_code, 2).toUpperCase() || null,
    };
  });
}

function safePressItems(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) throw new Error("Invalid press list.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid press item.");
    const row = item as Record<string, unknown>;
    const title = cleanText(row.title, 140);
    const publisher = cleanText(row.publisher, 100);
    if (!title || !publisher) throw new Error("Each press item needs a title and publisher.");
    const url = row.url === undefined || row.url === null || row.url === ""
      ? null
      : validHttpsUrl(row.url);
    if (row.url && !url) throw new Error("Press links must use HTTPS.");
    return {
      title,
      publisher,
      published_at: cleanText(row.published_at, 10) || null,
      url,
    };
  });
}

async function rest(path: string, method = "GET", body?: unknown) {
  if (!PROJECT_URL || !SERVICE_KEY) throw new Error("Publication service is not configured.");
  const result = await fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await result.text();
  let parsed: unknown = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  if (!result.ok) {
    // Do not return database messages or submitted data to the caller.
    throw new Error("Publication request could not be processed.");
  }
  return parsed;
}

async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization) || !PUBLISHABLE_KEY) return null;
  const authResponse = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: authorization,
    },
  });
  if (!authResponse.ok) return null;
  const user = await authResponse.json().catch(() => null);
  return user && typeof user.id === "string" ? user : null;
}


Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || undefined;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return response({ error: "Origin not allowed." }, 403);
  }
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405, origin);
  if (!PROJECT_URL || !PUBLISHABLE_KEY || !SERVICE_KEY) {
    return response({ error: "Publication service is not configured." }, 503, origin);
  }

  try {
    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 16000) return response({ error: "Request is too large." }, 413, origin);
    const rawBody = await req.text();
    if (rawBody.length > 16000) return response({ error: "Request is too large." }, 413, origin);

    let input: Record<string, unknown>;
    try {
      input = JSON.parse(rawBody);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
    } catch {
      return response({ error: "Invalid JSON request." }, 400, origin);
    }

    const user = await authenticatedUser(req);
    if (!user) return response({ error: "A valid signed-in artist account is required." }, 401, origin);

    const action = cleanText(input.action, 20);
    const artistId = cleanText(input.artist_id, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(artistId)) {
      return response({ error: "A valid artist record is required." }, 400, origin);
    }

    const artists = await rest(
      `allegro_artists?select=id,stage_name&id=eq.${encodeURIComponent(artistId)}&owner_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    ) as Array<{ id: string; stage_name: string }>;
    if (!Array.isArray(artists) || !artists[0]) {
      return response({ error: "Artist ownership could not be verified." }, 403, origin);
    }

    if (action === "submit") {
      if (input.consent !== true) {
        return response({ error: "Explicit artist-page consent is required." }, 400, origin);
      }
      const displayName = cleanText(input.display_name, 120);
      const slug = input.slug;
      if (!displayName || !validSlug(slug)) {
        return response({ error: "A display name and valid public slug are required." }, 400, origin);
      }

      const pending = await rest(
        `allegro_artist_page_requests?select=id&artist_id=eq.${encodeURIComponent(artistId)}&status=in.(draft,submitted,withdrawal_requested)&limit=1`,
      ) as Array<{ id: string }>;
      if (Array.isArray(pending) && pending.length) {
        return response({ error: "An artist-page request is already open." }, 409, origin);
      }

      const collision = await rest(
        `allegro_artist_public_pages?select=artist_id&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      ) as Array<{ artist_id: string }>;
      if (Array.isArray(collision) && collision.some((row) => row.artist_id !== artistId)) {
        return response({ error: "That public artist slug is already in use." }, 409, origin);
      }

      const requestedSlug = await rest(
        `allegro_artist_page_requests?select=artist_id&requested_slug=eq.${encodeURIComponent(slug)}&status=in.(draft,submitted,withdrawal_requested)&limit=1`,
      ) as Array<{ artist_id: string }>;
      if (Array.isArray(requestedSlug) && requestedSlug.some((row) => row.artist_id !== artistId)) {
        return response({ error: "That artist slug is already reserved by another request." }, 409, origin);
      }

      const publicData = {
        display_name: displayName,
        tagline: cleanText(input.tagline, 160) || null,
        biography: cleanText(input.biography, 3000) || null,
        city: cleanText(input.city, 80) || null,
        country_code: cleanText(input.country_code, 2).toUpperCase() || null,
        music_links: safeLinkList(input.music_links, MUSIC_HOSTS),
        social_links: safeLinkList(input.social_links, SOCIAL_HOSTS),
        events: safeEvents(input.events),
        press_items: safePressItems(input.press_items),
      };
      const serialized = JSON.stringify(publicData);
      if (serialized.length > 10000) {
        return response({ error: "Public profile content is too large." }, 413, origin);
      }

      const requestId = await rest("rpc/allegro_submit_artist_page_request", "POST", {
        p_artist_id: artistId,
        p_owner_id: user.id,
        p_requested_slug: slug,
        p_public_data: publicData,
        p_consent_version: "artist-page-consent-v1",
        p_consented_at: new Date().toISOString(),
      }) as string;
      if (typeof requestId !== "string") throw new Error("Publication request could not be processed.");
      return response({ ok: true, request_id: requestId, status: "submitted" }, 201, origin);
    }

    if (action === "withdraw") {
      const result = await rest("rpc/allegro_withdraw_artist_page", "POST", {
        p_artist_id: artistId,
        p_owner_id: user.id,
      }) as { status?: string; public_page_suspended?: boolean };
      return response({
        ok: true,
        status: result?.status === "withdrawn" ? "withdrawn" : "unknown",
        public_page_suspended: result?.public_page_suspended === true,
      }, 200, origin);
    }

    return response({ error: "Unsupported action." }, 400, origin);
  } catch {
    return response({ error: "The artist-page request could not be completed." }, 500, origin);
  }
});
