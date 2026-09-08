import fs from 'node:fs'
const policy=JSON.parse(fs.readFileSync('radio/catalogue/approved-license-classes.json','utf8'))
const codes=new Set(policy.allowed.map(x=>x.code))
for(const needed of ['CC0-1.0','PUBLIC-DOMAIN-VERIFIED','CC-BY-4.0','DIRECT-ALLEGRO-LICENCE','PAID-RADIO-LICENCE']){
  if(!codes.has(needed))throw new Error('Missing approved licence class '+needed)
}
if(policy.allowed.some(x=>x.code.includes('NC')||x.commercial!==true||x.radio!==true))throw new Error('Unsafe public music licence allowlist')
console.log('ALLEGRO_PUBLIC_MUSIC_POLICY=PASS')
