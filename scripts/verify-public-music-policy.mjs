import fs from 'node:fs'
const policy=JSON.parse(fs.readFileSync('radio/catalogue/approved-license-classes.json','utf8'))
const codes=new Set(policy.allowed.map(x=>x.code))
for(const needed of ['CC0-1.0','PUBLIC-DOMAIN-VERIFIED','CC-BY-4.0','DIRECT-ALLEGRO-LICENCE','PAID-RADIO-LICENCE']){
  if(!codes.has(needed))throw new Error('Missing approved licence class '+needed)
}
const blocked=Array.isArray(policy.blocked_prefixes)?policy.blocked_prefixes:[]
for(const item of policy.allowed){
  if(item.commercial!==true||item.radio!==true)throw new Error('Unsafe approved licence capability: '+item.code)
  if(blocked.some(prefix=>String(item.code).startsWith(prefix)))throw new Error('Blocked licence class was accidentally approved: '+item.code)
}
if(!blocked.some(x=>String(x).includes('CC-BY-NC')))throw new Error('NonCommercial Creative Commons classes must remain blocked')
console.log('ALLEGRO_PUBLIC_MUSIC_POLICY=PASS')
