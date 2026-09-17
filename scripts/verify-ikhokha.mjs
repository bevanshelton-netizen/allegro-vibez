import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {PRODUCTS,signatureFor} from '../api/_lib/ikhokha.js'

const expected={
  'creator-launch':29900,
  'featured-artist':59900,
  'business-sponsor':150000,
  'founding-partner':500000,
  'radio-try':75000,
  'radio-grow':150000,
  'radio-daypart':350000,
  'radio-show-partner':750000,
}

for(const [id,amount] of Object.entries(expected)){
  assert.equal(PRODUCTS[id]?.amount,amount,`${id} amount must remain server-controlled`)
}
for(const id of ['radio-try','radio-grow','radio-daypart','radio-show-partner']){
  assert.equal(PRODUCTS[id]?.payableNow,false,`${id} must stay reservation-only until verified radio activation`)
}
for(const id of ['creator-launch','featured-artist','business-sponsor','founding-partner']){
  assert.equal(PRODUCTS[id]?.payableNow,true,`${id} must remain eligible for direct checkout`)
}

const signature=signatureFor('https://api.ikhokha.com/public-api/v1/api/payment','{"amount":29900}','ci-secret')
assert.match(signature,/^[0-9a-f]{64}$/,'iKhokha signature must be HMAC-SHA256 hex')

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)])
}
const browserFiles=walk(new URL('../src',import.meta.url)).filter(file=>/\.(js|jsx)$/.test(file))
for(const file of browserFiles){
  const content=fs.readFileSync(file,'utf8')
  assert(!content.includes('IKHOKHA_APP_SECRET'),'Browser source must never reference IKHOKHA_APP_SECRET')
  assert(!content.includes('IKHOKHA_APP_ID'),'Browser source must never reference IKHOKHA_APP_ID')
}

console.log('ALLEGRO iKhokha payment contract: PASS')
