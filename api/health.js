const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zoolsumifdtanycjryje.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_8LBaWtgMxlewODl4STQ9YA_jMMEt5Gt'
const PROJECT = 'allegro-vibez'

async function probe(path, init = {}) {
  const started = Date.now()
  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_KEY,
        ...init.headers,
      },
    })
    return {
      ok: response.ok || response.status === 401 || response.status === 403,
      status: response.status,
      ms: Date.now() - started,
    }
  } catch (error) {
    return { ok: false, status: 0, ms: Date.now() - started, error: error.message }
  }
}

export default async function handler(req, res) {
  const [config, rest, profiles, releases] = await Promise.all([
    probe('/functions/v1/public-config'),
    probe('/rest/v1/'),
    probe('/rest/v1/public_profiles?select=id&limit=1'),
    probe('/rest/v1/published_releases?select=id&limit=1'),
  ])

  const checks = {
    frontend_backend_gateway: { ok: true, service: 'ALLEGRO API health endpoint' },
    supabase_public_config: config,
    supabase_rest_gateway: rest,
    creator_profiles: profiles,
    music_releases: releases,
    growth: { ok: true, status: 'application-layer', note: 'No dedicated external growth service is configured in this deployment.' },
    payments: { ok: true, status: 'application-layer', note: 'No dedicated payment service endpoint is configured in this deployment.' },
    webhooks: { ok: true, status: 'application-layer', note: 'No dedicated webhook endpoint is configured in this deployment.' },
    creator: profiles,
    listener: releases,
  }

  const hardFailures = Object.values(checks).filter(check => check && check.ok === false)
  const status = hardFailures.length ? 503 : 200

  res.status(status).setHeader('Cache-Control', 'no-store').json({
    service: PROJECT,
    status: hardFailures.length ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    checks,
  })
}
