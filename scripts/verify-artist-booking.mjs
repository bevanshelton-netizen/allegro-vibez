import fs from 'node:fs'

const mustExist=[
  'src/pages/ArtistBooking.jsx',
  'supabase/migrations/20260909_artist_booking_engine.sql',
]
for(const file of mustExist){
  if(!fs.existsSync(file))throw new Error('Missing booking engine file: '+file)
}

const app=fs.readFileSync('src/App.jsx','utf8')
if(!app.includes('/artist/:artistId/book'))throw new Error('Public artist booking route missing')
if(!app.includes('/bookings'))throw new Error('Creator booking desk route missing')

const artist=fs.readFileSync('src/pages/ArtistSpace.jsx','utf8')
if(!artist.includes('BOOK THIS ARTIST'))throw new Error('Artist space booking CTA missing')

const workflow=fs.readFileSync('src/lib/creatorWorkflow.js','utf8')
for(const token of ['create_artist_booking_request','quote_artist_booking','set_artist_booking_status']){
  if(!workflow.includes(token))throw new Error('Booking workflow RPC missing: '+token)
}

const migration=fs.readFileSync('supabase/migrations/20260909_artist_booking_engine.sql','utf8')
for(const token of ['artist_booking_requests','privacy_consent','effective_platform_fee_bps','deposit_status']){
  if(!migration.includes(token))throw new Error('Booking migration safeguard missing: '+token)
}
if(!migration.includes("'not_collected'"))throw new Error('Deposit collection must default to not_collected')

const html=fs.readFileSync('index.html','utf8')
if(!html.includes('allegro-artist-booking'))throw new Error('Netlify booking fallback missing')

console.log('ALLEGRO_ARTIST_BOOKING_ENGINE=PASS')
