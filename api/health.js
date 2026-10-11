const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yfawrenhudjomhnglfhq.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_3KY--8Y_uuKEdfdumC2txg__OWTRo2p'
const PROJECT = 'allegro-vibez'

async function probe(path, init = {}) {
  const started = Date.now()
  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: { apikey: SUPABASE_KEY, ...init.headers },
    })
    return { ok: response.ok || response.status < 500, status: response.status, ms: Date.now() - started }
  } catch (error) {
    return { ok: false, status: 0, ms: Date.now() - started, error: error.message }
  }
}

const functionProbe = slug => probe(`/functions/v1/${slug}`)

export default async function handler(req, res) {
  const [config, rest, profiles, releases, studio, growth, payments, webhook, music, creator, listener] = await Promise.all([
    probe('/functions/v1/public-config'),
    probe('/rest/v1/'),
    probe('/rest/v1/public_profiles?select=id&limit=1'),
    probe('/rest/v1/published_releases?select=id&limit=1'),
    functionProbe('allegro-studio-api'),
    functionProbe('allegro-studio-growth'),
    functionProbe('allegro-studio-ikhokha-webhook'),
    functionProbe('allegro-music-api'),
    functionProbe('allegro-creator-api'),
    functionProbe('allegro-listener-api'),
    functionProbe('allegro-studio-api'),
  ])

  const checks = {
    frontend_backend_gateway: { ok: true, service: 'ALLEGRO API health endpoint' },
    supabase_public_config: config,
    supabase_rest_gateway: rest,
    studio_api: studio,
    growth: growth,
    payment_webhook: webhook,
    music: music,
    creator: creator,
    listener: listener,
    creator_profiles: profiles,
    music_releases: releases,
    payments: payments,
    webhooks: webhook,
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
