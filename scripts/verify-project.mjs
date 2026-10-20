import { existsSync, readFileSync } from 'node:fs'

const required = [
  'index.html',
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

const index = readFileSync('index.html', 'utf8')
for (const token of ['ALLEGRO VIBEZ', 'og:title', 'twitter:card', 'canonical']) {
  if (!index.includes(token)) {
    console.error(`Publishing metadata check failed: ${token}`)
    process.exit(1)
  }
}

const readiness = readFileSync('LAUNCH_READINESS.md', 'utf8')
for (const token of [
  'IZAKHONO-owned-first',
  'IZAKHONO APP FABRIC / NODE01 runtime',
  'SOURCE → BUILD → IMAGE → NODE01 → CORE → EDGE/TLS → PUBLIC HTTPS → END-TO-END ACCEPTANCE',
]) {
  if (!readiness.includes(token)) {
    console.error(`Owned-runtime launch contract missing: ${token}`)
    process.exit(1)
  }
}

if (readiness.includes('GitHub Pages deployment')) {
  console.error('Launch readiness documentation must not advertise GitHub Pages deployment.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ publishing structure and IZAKHONO-owned runtime safeguards verified.')
