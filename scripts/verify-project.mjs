import { existsSync, readFileSync } from 'node:fs'

const required = [
  'index.html',
  'netlify.toml',
  'src/main.jsx',
  'src/App.jsx',
  'src/lib/supabaseClient.js',
  'public/privacy.html',
  'public/terms.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/av-hero.webp',
  'public/av-discover.webp',
  'public/av-artists.webp',
  'supabase/ALLEGRO_VIBEZ_GO_LIVE.sql',
  'supabase/migrations/20260819_payfast_commerce.sql',
  'supabase/migrations/20260822_payfast_hardening.sql',
  'supabase/migrations/20260822_payfast_zar_plans.sql',
  'supabase/functions/payfast-checkout/index.ts',
  'supabase/functions/payfast-notify/index.ts',
]

const missing = required.filter(file => !existsSync(file))
if (missing.length) {
  console.error('Missing required publishing files:\n' + missing.map(file => `- ${file}`).join('\n'))
  process.exit(1)
}

const netlify = readFileSync('netlify.toml', 'utf8')
for (const token of [
  'to = "/index.html"',
  'status = 200',
  'X-Content-Type-Options = "nosniff"',
  'X-Frame-Options = "DENY"',
  'Strict-Transport-Security',
  'Content-Security-Policy',
  "frame-ancestors 'none'",
  'Cache-Control = "public, max-age=31536000, immutable"',
]) {
  if (!netlify.includes(token)) {
    console.error(`Netlify production safeguard missing: ${token}`)
    process.exit(1)
  }
}

const index = readFileSync('index.html', 'utf8')
for (const token of ['ALLEGRO VIBEZ', 'og:title', 'twitter:card', 'canonical']) {
  if (!index.includes(token)) {
    console.error(`Publishing metadata check failed: ${token}`)
    process.exit(1)
  }
}

const readiness = readFileSync('LAUNCH_READINESS.md', 'utf8')
if (!readiness.includes('Netlify') || readiness.includes('GitHub Pages deployment')) {
  console.error('Launch readiness documentation does not match the production host.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ publishing structure and production host safeguards verified.')
