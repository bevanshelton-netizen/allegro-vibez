import { readFileSync } from 'node:fs'

const core = readFileSync('src/lib/izakhonoCoreClient.js','utf8')
const workflow = readFileSync('src/lib/creatorWorkflow.js','utf8')
const booking = readFileSync('src/pages/ArtistBooking.jsx','utf8')
const runtime = readFileSync('src/lib/supabaseClient.js','utf8')

for (const token of [
  '/v2/data/',
  "this.client.from('profiles').insert(profile)",
  "this.client.from('public_profiles').insert(publicProfile)",
  "this.client.from('creator_wallets').insert",
  "this.client.from('creator_subscriptions').insert",
  "Payout requests remain disabled until the IZAKHONO server-side balance validator is active.",
]) {
  if (!core.includes(token)) throw new Error('Core live contract missing: ' + token)
}

if (core.includes('new FormData()')) throw new Error('IZAKHONO storage upload must send raw bytes, not a multipart envelope.')
if (core.includes('/v1/data/')) throw new Error('ALLEGRO data access must use the IZAKHONO Core v2 policy API.')

for (const token of [
  "backendProvider === 'izakhono-core'",
  "public_profiles",
  "public_artist_booking_settings",
  "artist_booking_intake",
  "platform_fee_bps: 1000",
]) {
  if (!workflow.includes(token)) throw new Error('Creator workflow Core contract missing: ' + token)
}

if (!booking.includes("window.location.hostname.endsWith('.netlify.app')")) {
  throw new Error('Legacy Netlify booking fallback must be explicitly host-gated.')
}

if (!runtime.includes("selectedProvider = 'izakhono-core'")) {
  throw new Error('IZAKHONO Core must remain the preferred runtime when configured.')
}

console.log('ALLEGRO_IZAKHONO_CORE_LIVE_CONTRACT=PASS')
