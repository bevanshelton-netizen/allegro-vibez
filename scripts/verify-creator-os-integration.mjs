import fs from 'node:fs'
import crypto from 'node:crypto'

const provenance=JSON.parse(fs.readFileSync('src/vendor/izakhono-creator-os/SOURCE.json','utf8'))
if(provenance.source_repository!=='bevanshelton-netizen/izakhono-builder')throw new Error('Creator OS source repository drifted.')
if(!/^[0-9a-f]{40}$/.test(provenance.source_commit))throw new Error('Creator OS source commit must be immutable.')

for(const file of ['artist-protect.js','revenue.js','clearset.js']){
  const path='src/vendor/izakhono-creator-os/'+file
  if(!fs.existsSync(path))throw new Error('Missing vendored Creator OS module: '+file)
  const text=fs.readFileSync(path,'utf8')
  if(!text.trim())throw new Error('Empty vendored Creator OS module: '+file)
  crypto.createHash('sha256').update(text).digest('hex')
}

const bridge=fs.readFileSync('src/lib/creatorOsBridge.js','utf8')
for(const token of ['creatorSplit','requiredContracts','settlementReady','creator_booking']){
  if(!bridge.includes(token))throw new Error('Creator OS bridge missing: '+token)
}

const booking=fs.readFileSync('src/pages/ArtistBooking.jsx','utf8')
for(const token of ['IZAKHONO Revenue','ARTIST PROTECT','CLEARSET']){
  if(!booking.includes(token))throw new Error('Booking Desk is not surfacing '+token)
}

const app=fs.readFileSync('src/App.jsx','utf8')
if(!app.includes('/bookings/:bookingId/contract'))throw new Error('Contract Shield booking route missing.')

console.log('ALLEGRO_IZAKHONO_CREATOR_OS=PASS')
