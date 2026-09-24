import fs from 'node:fs'

const client=fs.readFileSync('src/lib/appFabric.js','utf8')
for(const token of [
  'https://fabric.izakhonoafrica.co.za',
  'https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/izakhono-gateway-event',
  "event_type:'lead.created'",
  'external-resilience'
]) if(!client.includes(token)) throw new Error('APP FABRIC hybrid client missing '+token)

const join=fs.readFileSync('src/pages/ArtistJoin.jsx','utf8')
if(!join.includes('emitAppFabricLead')) throw new Error('Artist onboarding is not mirrored into APP FABRIC')
if(!join.includes("source:'allegro-artist-interest'")) throw new Error('Artist lead source missing')

const booking=fs.readFileSync('src/pages/ArtistBooking.jsx','utf8')
if(!booking.includes('emitAppFabricLead')) throw new Error('Artist booking is not mirrored into APP FABRIC')
if(!booking.includes("source:'allegro-artist-booking'")) throw new Error('Booking lead source missing')

console.log('ALLEGRO_APP_FABRIC_HYBRID=PASS')
