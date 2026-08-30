const origin=(process.env.PRODUCTION_ORIGIN||'https://allegro-vibez.netlify.app').replace(/\/$/,'')
const configUrl='https://zoolsumifdtanycjryje.supabase.co/functions/v1/public-config'

const checks=[]
let failed=false

function record(name,ok,detail=''){
  checks.push({name,ok,detail})
  if(!ok) failed=true
}

async function fetchText(url){
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/1.0'}})
    return {response,text:await response.text()}
  }catch(error){
    return {error}
  }
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
}

try{
  const response=await fetch(configUrl,{headers:{accept:'application/json','user-agent':'ALLEGRO-VIBEZ-production-smoke/1.0'}})
  const config=response.ok?await response.json():null
  record('Supabase browser configuration available',Boolean(response.ok&&config?.supabaseUrl&&config?.publishableKey),'public bootstrap endpoint')
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

console.log('ALLEGRO VIBEZ production smoke probe passed.')
