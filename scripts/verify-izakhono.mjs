import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('izakhono/manifest.json', 'utf8'))
const schema = readFileSync('izakhono/schema.sql', 'utf8')

if (manifest.slug !== 'allegro_vibez') {
  console.error('IZAKHONO manifest slug must remain allegro_vibez.')
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
  'public_profiles',
  'profiles',
  'published_releases',
  'releases',
  'release_contributors',
  'release_events',
  'royalty_ledger',
  'creator_royalty_summary',
  'subscription_plans',
  'creator_subscriptions',
  'creator_wallets',
  'payout_requests',
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

if (!schema.includes('create or replace view published_releases')) {
  console.error('IZAKHONO schema must retain the safe published_releases view.')
  process.exit(1)
}

if (!schema.includes('allegro_validate_payout')) {
  console.error('IZAKHONO schema must retain server-side payout balance validation.')
  process.exit(1)
}

const bucket = manifest.buckets.find(item => item.name === 'release_assets')
if (!bucket || bucket.public !== false) {
  console.error('ALLEGRO release_assets must remain a private IZAKHONO Core bucket.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ IZAKHONO Core provisioning pack verified.')
