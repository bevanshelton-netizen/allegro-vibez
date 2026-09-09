import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('izakhono/manifest.json', 'utf8'))
const deployManifest = JSON.parse(readFileSync('.izakhono.json', 'utf8'))
const schema = readFileSync('izakhono/schema.sql', 'utf8')
const runtime = readFileSync('src/lib/supabaseClient.js', 'utf8')
const dockerfile = readFileSync('Dockerfile', 'utf8')
const nginx = readFileSync('deploy/nginx.conf', 'utf8')
const envExample = readFileSync('.env.example', 'utf8')

if (manifest.slug !== 'allegro-vibez') {
  console.error('IZAKHONO manifest slug must remain allegro-vibez.')
  process.exit(1)
}

for (const file of ['schema.sql', 'seed.sql']) {
  if (!manifest.schema_files.includes(file)) {
    console.error(`IZAKHONO manifest is missing schema file: ${file}`)
    process.exit(1)
  }
}

const exposed = new Set(manifest.exposures.map(item => item.table_name))
for (const table of [
  'public_profiles','profiles','published_releases','releases',
  'release_contributors','release_events','royalty_ledger',
  'creator_royalty_summary','subscription_plans','creator_subscriptions',
  'creator_wallets','payout_requests',
  'public_artist_booking_settings','artist_booking_settings','artist_booking_intake',
  'artist_booking_requests','artist_booking_events',
]) {
  if (!exposed.has(table)) {
    console.error(`IZAKHONO exposure missing: ${table}`)
    process.exit(1)
  }
}

const profileExposure = manifest.exposures.find(item => item.table_name === 'profiles')
if (profileExposure?.select_policy === 'public') {
  console.error('Internal creator profiles must not expose role/admin fields publicly.')
  process.exit(1)
}

const publicProfileExposure = manifest.exposures.find(item => item.table_name === 'public_profiles')
if (publicProfileExposure?.select_policy !== 'public') {
  console.error('public_profiles must remain the safe public artist directory surface.')
  process.exit(1)
}

const releaseExposure = manifest.exposures.find(item => item.table_name === 'releases')
if (releaseExposure?.select_policy === 'public') {
  console.error('Private/draft releases must never be publicly exposed through IZAKHONO Core.')
  process.exit(1)
}

const publicReleaseExposure = manifest.exposures.find(item => item.table_name === 'published_releases')
if (publicReleaseExposure?.select_policy !== 'public') {
  console.error('published_releases must remain the public discovery surface.')
  process.exit(1)
}

if (!schema.includes('create or replace view public_profiles')) {
  console.error('IZAKHONO schema must retain the safe public_profiles view.')
  process.exit(1)
}

const publishedViewMatch = schema.match(/create or replace view published_releases as\s+select([\s\S]*?)from releases\s+where status = 'published';/i)
if (!publishedViewMatch || !/\bstatus\b/i.test(publishedViewMatch[1])) {
  console.error('IZAKHONO published_releases view must exist and include status.')
  process.exit(1)
}

if (!schema.includes('allegro_validate_payout')) {
  console.error('IZAKHONO schema must retain server-side payout balance validation.')
  process.exit(1)
}

for (const token of [
  'create table if not exists artist_booking_intake',
  'create table if not exists artist_booking_requests',
  'create or replace view public_artist_booking_settings',
  'platform_fee_bps integer not null default 1000 check (platform_fee_bps = 1000)',
  'allegro_route_booking_intake',
]) {
  if (!schema.includes(token)) {
    console.error(`IZAKHONO booking contract missing: ${token}`)
    process.exit(1)
  }
}

const bookingIntake = manifest.exposures.find(item => item.table_name === 'artist_booking_intake')
if (bookingIntake?.insert_policy !== 'public' || bookingIntake?.select_policy !== 'none') {
  console.error('Public booking intake must be write-only: public insert, no public select.')
  process.exit(1)
}

const bookingRequests = manifest.exposures.find(item => item.table_name === 'artist_booking_requests')
if (bookingRequests?.select_policy !== 'owner' || bookingRequests?.insert_policy !== 'none') {
  console.error('Private booking requests must remain artist-owned and not directly public-insertable.')
  process.exit(1)
}

const seed = readFileSync('izakhono/seed.sql', 'utf8')
if (seed.includes("'USD',8") || seed.includes("'USD',6")) {
  console.error('IZAKHONO seed must not silently reduce the locked ALLEGRO 10% creator platform share.')
  process.exit(1)
}

const bucket = manifest.buckets.find(item => item.name === 'release_assets')
if (!bucket || bucket.public !== false) {
  console.error('ALLEGRO release_assets must remain a private IZAKHONO Core bucket.')
  process.exit(1)
}

for (const required of ['VITE_IZAKHONO_CORE_URL', 'VITE_IZAKHONO_PROJECT', 'VITE_IZAKHONO_PUBLIC_KEY']) {
  if (!runtime.includes(required) || !dockerfile.includes(required) || !envExample.includes(required)) {
    console.error(`IZAKHONO production variable missing from runtime/build contract: ${required}`)
    process.exit(1)
  }
}

if (!runtime.includes('createIzakhonoCoreClient') || !runtime.includes("selectedProvider = 'izakhono-core'")) {
  console.error('ALLEGRO runtime must prefer IZAKHONO Core when its public configuration is supplied.')
  process.exit(1)
}

for (const required of ['createClient', 'FALLBACK_SUPABASE_URL', 'FALLBACK_SUPABASE_PUBLISHABLE_KEY']) {
  if (!runtime.includes(required)) {
    console.error(`Zero-cost live failover contract missing: ${required}`)
    process.exit(1)
  }
}

if (!nginx.includes('*.izakhono.africa') || !nginx.includes('*.supabase.co')) {
  console.error('Container CSP must allow preferred IZAKHONO Core and temporary Supabase failover origins.')
  process.exit(1)
}

if (deployManifest.dockerfile_path !== 'Dockerfile' || deployManifest.build_context !== '.' || deployManifest.container_port !== 8080 || deployManifest.health_path !== '/healthz') {
  console.error('IZAKHONO deployment manifest must use the ALLEGRO Dockerfile, port 8080 and /healthz gate.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ IZAKHONO Core preference, Zero Host deployment and production failover verified.')
