const origin=(process.env.PRODUCTION_ORIGIN||'https://allegro-vibez.netlify.app').replace(/\/$/,'')

const results=[]
let failed=false

function record(name,ok,detail=''){
  results.push({name,ok,detail})
  if(!ok)failed=true
}

async function get(path){
  try{
    const response=await fetch(`${origin}${path}`,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/1.0'}})
    return {response,text:await response.text()}
  }catch(error){
    return {error}
  }
}

const home=await get('/')
if(home.error){
  record('production origin reachable',false,home.error.message)
}else{
  record('production origin reachable',home.response.ok,`HTTP ${home.response.status}`)
  record('brand HTML served',home.text.includes('ALLEGRO VIBEZ')||home.text.includes('ALLEGRO-VIBEZ'),'brand marker')
  const headers=home.response.headers
  record('nosniff header active',headers.get('x-content-type-options')==='nosniff')
  record('frame protection active',headers.get('x-frame-options')==='DENY')
  record('CSP header active',Boolean(headers.get('content-security-policy')))

  for(const path of ['/login','/privacy.html','/terms.html','/robots.txt']){
    const page=await get(path)
    record(`${path} reachable`,Boolean(page.response?.ok),page.response?`HTTP ${page.response.status}`:(page.error?.message||'request failed'))
  }

  const scriptPaths=[...home.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(match=>match[1])
  let javascript=''
  for(const src of scriptPaths){
    try{
      const url=new URL(src,`${origin}/`)
      if(url.origin!==origin)continue
      const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/1.0'}})
      if(response.ok)javascript+=`\n${await response.text()}`
    }catch{}
  }

  const hasPublishable=/sb_publishable_[A-Za-z0-9._-]{12,}/.test(javascript)
  let hasAnonJwt=false
  for(const match of javascript.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
    try{
      const payload=JSON.parse(Buffer.from(match[0].split('.')[1],'base64url').toString('utf8'))
      if(payload?.role==='anon'){hasAnonJwt=true;break}
    }catch{}
  }
  record('Supabase browser key embedded',hasPublishable||hasAnonJwt,'boolean detection only; key value is never printed')
}

for(const result of results){
  console.log(`${result.ok?'PASS':'FAIL'} ${result.name}${result.detail?` — ${result.detail}`:''}`)
}

if(failed){
  console.error('Production smoke probe found one or more launch gaps.')
  process.exit(1)
}

console.log('ALLEGRO VIBEZ production smoke probe passed.')
