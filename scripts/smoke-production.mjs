const origin=(process.env.PRODUCTION_ORIGIN||'https://allegrovibez.com').replace(/\/$/,'')
const expectedCoreProject='allegro-vibez'
const expectedSupabaseProject='zoolsumifdtanycjryje'
const attempts=Number(process.env.PRODUCTION_SMOKE_ATTEMPTS||12)
const delayMs=Number(process.env.PRODUCTION_SMOKE_DELAY_MS||5000)
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function fetchText(url){
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/4.1','cache-control':'no-cache'}})
    return {response,text:await response.text(),url}
  }catch(error){ return {error,url} }
}
function jsReferences(text,base){
  const refs=new Set()
  for(const match of text.matchAll(/["']([^"']+\.js(?:\?[^"']*)?)["']/g)){
    const value=match[1]
    if(value.startsWith('http://')||value.startsWith('https://')) continue
    try{ refs.add(new URL(value,base).href) }catch(error){ void error }
  }
  return [...refs]
}
async function collectBundle(html,base){
  const queue=jsReferences(html,base), seen=new Set(), texts=[]
  while(queue.length&&seen.size<40){
    const url=queue.shift()
    if(seen.has(url)) continue
    seen.add(url)
    const asset=await fetchText(url)
    if(!asset.response?.ok) continue
    texts.push(asset.text)
    for(const ref of jsReferences(asset.text,url)) if(!seen.has(ref)) queue.push(ref)
  }
  return {text:texts.join('\n'),files:seen.size}
}
async function probe(){
  const checks=[]
  const record=(name,ok,detail='')=>checks.push({name,ok,detail})
  const home=await fetchText(`${origin}/?production_probe=${Date.now()}`)
  if(home.error){ record('production origin reachable',false,home.error.message); return checks }
  record('production origin reachable',home.response.ok,`HTTP ${home.response.status}`)
  record('brand HTML served',home.text.includes('ALLEGRO VIBEZ')||home.text.includes('ALLEGRO-VIBEZ'),'brand marker')
  record('nosniff header active',home.response.headers.get('x-content-type-options')==='nosniff')
  record('frame protection active',home.response.headers.get('x-frame-options')==='DENY'||Boolean(home.response.headers.get('content-security-policy')),'security header')
  record('CSP header active',Boolean(home.response.headers.get('content-security-policy')))
  for(const path of ['/login','/privacy.html','/terms.html','/robots.txt','/healthz']){
    const page=await fetchText(`${origin}${path}`)
    record(`${path} reachable`,Boolean(page.response?.ok),page.response?`HTTP ${page.response.status}`:(page.error?.message||'request failed'))
  }
  const bundle=await collectBundle(home.text,home.url||`${origin}/`)
  record('production JavaScript bundle discovered',bundle.files>0,`${bundle.files} JavaScript assets inspected`)
  const coreSelected=bundle.text.includes("selectedProvider='izakhono-core'")||bundle.text.includes('selectedProvider="izakhono-core"')||bundle.text.includes('izakhono-core')
  const supabaseFallback=bundle.text.includes(expectedSupabaseProject)||bundle.text.includes('backendProvider')
  record('backend contract present',coreSelected||supabaseFallback,coreSelected?'IZAKHONO Core contract':'compatibility fallback contract')
  if(coreSelected) record('Core project contract present',bundle.text.includes(expectedCoreProject),'Core project identity')
  else record('compatibility backend contract present',supabaseFallback,'fallback identity')
  return checks
}
let lastChecks=[]
for(let attempt=1;attempt<=attempts;attempt+=1){
  lastChecks=await probe()
  const passed=lastChecks.every(check=>check.ok)
  console.log(`Production probe attempt ${attempt}/${attempts}: ${passed?'PASS':'waiting for deployment'}`)
  for(const check of lastChecks) console.log(`${check.ok?'PASS':'FAIL'} ${check.name}${check.detail?` — ${check.detail}`:''}`)
  if(passed){ console.log('ALLEGRO VIBEZ production smoke probe passed.'); process.exit(0) }
  if(attempt<attempts) await sleep(delayMs)
}
console.error('Production smoke probe did not reach the verified state before the deployment window expired.')
process.exit(1)
