import fs from 'node:fs'
import path from 'node:path'

const roots=['src','supabase']
const files=[]
for(const root of roots){
  const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else files.push(full)}}
  walk(root)
}
const textFiles=files.filter(f=>/\.(js|jsx|sql|md)$/.test(f))
const forbidden=[/service_role\s*[:=]\s*["'][^"']+/i,/SUPABASE_SERVICE_ROLE/i,/sk_live_[A-Za-z0-9]+/i,/secret[_-]?key\s*[:=]\s*["'][^"']+/i]
const hits=[]
for(const file of textFiles){const text=fs.readFileSync(file,'utf8');for(const rx of forbidden){if(rx.test(text))hits.push(`${file}: ${rx}`)}}
if(hits.length){console.error('Potential frontend/server secret exposure detected:');hits.forEach(h=>console.error(`- ${h}`));process.exit(1)}
const requiredSql=['alter table public.releases enable row level security','create or replace function public.request_payout','create or replace function public.create_distribution_order']
const allSql=textFiles.filter(f=>f.endsWith('.sql')).map(f=>fs.readFileSync(f,'utf8')).join('\n').toLowerCase()
for(const needle of requiredSql){if(!allSql.includes(needle.toLowerCase())){console.error(`Missing security/control SQL: ${needle}`);process.exit(1)}}
console.log(`ALLEGRO-VIBEZ security static checks OK (${textFiles.length} source/migration files scanned).`)
