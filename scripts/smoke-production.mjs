const origin=(process.env.PRODUCTION_ORIGIN||'https://allegro-vibez.netlify.app').replace(/\/$/,'')
const configUrl='https://zoolsumifdtanycjryje.supabase.co/functions/v1/public-config'
const expectedProject='zoolsumifdtanycjryje'
const expectedPublishableKey='sb_publishable_8LBaWtgMxlewODl4STQ9YA_jMMEt5Gt'

const checks=[]
let failed=false

function record(name,ok,detail=''){
  checks.push({name,ok,detail})
  if(!ok) failed=true
}

async function fetchText(url){
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/2.0'}})
    return {response,text:await response.text(),url:response.url}
  }catch(error){
    return {error,url}
  }
}

function jsReferences(text,base){
  const refs=new Set()
  for(const match of text.matchAll(/["']([^"']+\.js(?:\?[^"']*)?)["']/g)){
    const value=match[1]
    if(value.startsWith('http://')||value.startsWith('https://')) continue
    try{
      refs.add(new URL(value,base).href)
    }catch{
      continue
    }
  }
  return [...refs]
}

async function collectBundle(html,base){
  const queue=jsReferences(html,base)
  const seen=new Set()
  const texts=[]
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

const home=await fetchText(`${origin}/`)
if(home.error){
  record('production origin reachable',false,home.error.message)
}else{
  record('production origin reachable',home.response.ok,`HTTP ${home.response.status}`)
  record('brand HTML served',home.text.includes('ALLEGRO VIBEZ')||home.text.includes('ALLEGRO-VIBEZ'),'brand marker')
  record('nosniff header active',home.response.headers.get('x-content-type-options')==='nosniff')
  record('frame protection active',home.response.headers.get('x-frame-options')==='DENY')
  record('CSP header active',Boolean(home.response.headers.get('content-security-policy')))

  for(const path of ['/login','/privacy.html','/terms.html','/robots.txt']){
    const page=await fetchText(`${origin}${path}`)
    record(`${path} reachable`,Boolean(page.response?.ok),page.response?`HTTP ${page.response.status}`:(page.error?.message||'request failed'))
  }

  const bundle=await collectBundle(home.text,home.url||`${origin}/`)
  record('production JavaScript bundle discovered',bundle.files>0,`${bundle.files} JavaScript assets inspected`)
  record('live bundle targets Allegro Supabase project',bundle.text.includes(expectedProject),'production project ref')
  record('live bundle contains browser-safe auth key',bundle.text.includes(expectedPublishableKey),'publishable key bootstrap')
}

try{
  const response=await fetch(configUrl,{headers:{accept:'application/json','user-agent':'ALLEGRO-VIBEZ-production-smoke/2.0'}})
  const config=response.ok?await response.json():null
  record('Supabase browser configuration available',Boolean(response.ok&&config?.supabaseUrl&&config?.publishableKey),'public bootstrap endpoint')
  record('Supabase bootstrap matches production project',config?.supabaseUrl?.includes(expectedProject)===true,'project identity')
  record('Supabase bootstrap key matches active publishable key',config?.publishableKey===expectedPublishableKey,'key identity')
}catch(error){
  record('Supabase browser configuration available',false,error.message)
}

for(const check of checks){
  console.log(`${check.ok?'PASS':'FAIL'} ${check.name}${check.detail?` — ${check.detail}`:''}`)
}

if(failed){
  console.error('Production smoke probe found one or more launch gaps.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ production smoke probe passed with live authentication bootstrap verified.')
