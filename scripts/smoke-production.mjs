const origin=(process.env.PRODUCTION_ORIGIN||'https://allegrovibez.com').replace(/\/$/,'')
const fallbackOrigin=(process.env.FALLBACK_PRODUCTION_ORIGIN||'https://allegro-vibez.vercel.app').replace(/\/$/,'')
const expectedProject='zoolsumifdtanycjryje'
const expectedPublishableKey='sb_publishable_8LBaWtgMxlewODl4STQ9YA_jMMEt5Gt'
const attempts=Number(process.env.PRODUCTION_SMOKE_ATTEMPTS||12)
const delayMs=Number(process.env.PRODUCTION_SMOKE_DELAY_MS||5000)
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function fetchText(url){
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ALLEGRO-VIBEZ-production-smoke/5.0','cache-control':'no-cache'}})
    return {response,text:await response.text(),url:response.url}
  }catch(error){return {error,url}}
}

function jsReferences(text,base){
  const refs=new Set()
  for(const match of text.matchAll(/["']([^"']+\.js(?:\?[^"']*)?)["']/g)){
    const value=match[1]
    if(value.startsWith('http://')||value.startsWith('https://')) continue
    try{refs.add(new URL(value,base).href)}catch{}
  }
  return [...refs]
}

async function collectBundle(html,base){
  const queue=jsReferences(html,base),seen=new Set(),texts=[]
  while(queue.length&&seen.size<40){
    const url=queue.shift(); if(seen.has(url)) continue
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
  record('public production origin reachable',Boolean(home.response?.ok),home.response?`HTTP ${home.response.status}`:(home.error?.message||'request failed'))
  if(!home.response?.ok) return checks

  record('brand HTML served',home.text.includes('ALLEGRO VIBEZ')||home.text.includes('ALLEGRO-VIBEZ'),'brand marker')
  record('nosniff header active',home.response.headers.get('x-content-type-options')==='nosniff')
  record('frame protection active',home.response.headers.get('x-frame-options')==='DENY')
  record('CSP header active',Boolean(home.response.headers.get('content-security-policy')))

  for(const path of ['/login','/privacy.html','/terms.html','/robots.txt','/api/health']){
    const page=await fetchText(`${origin}${path}`)
    record(`${path} reachable`,Boolean(page.response?.ok),page.response?`HTTP ${page.response.status}`:(page.error?.message||'request failed'))
    if(path==='/api/health'&&page.response?.ok){
      try{
        const health=JSON.parse(page.text)
        record('critical backend health is healthy',health.status==='healthy',health.status||'missing status')
        for(const [name,check] of Object.entries(health.checks||{})){
          if(check?.ok===false) record(`backend ${name}`,false,check.error||`HTTP ${check.status}`)
        }
      }catch(error){record('health response is valid JSON',false,error.message)}
    }
  }

  const bundle=await collectBundle(home.text,home.url||`${origin}/`)
  record('production JavaScript bundle discovered',bundle.files>0,`${bundle.files} JavaScript assets inspected`)
  record('live bundle targets Allegro backend',bundle.text.includes(expectedProject),'production project ref')
  record('live bundle contains browser-safe auth bootstrap',bundle.text.includes(expectedPublishableKey),'publishable key present')

  const configuredCoreUrl=process.env.IZAKHONO_CORE_URL?.replace(/\/$/,'')
  if(configuredCoreUrl){
    const core=await fetchText(`${configuredCoreUrl}/health`)
    record('configured IZAKHONO Core reachable',Boolean(core.response?.ok),core.response?`HTTP ${core.response.status}`:(core.error?.message||'request failed'))
  }

  return checks
}

let lastChecks=[]
for(let attempt=1;attempt<=attempts;attempt+=1){
  lastChecks=await probe()
  const passed=lastChecks.length>0&&lastChecks.every(check=>check.ok)
  console.log(`Production probe attempt ${attempt}/${attempts}: ${passed?'PASS':'waiting for deployment'}`)
  for(const check of lastChecks) console.log(`${check.ok?'PASS':'FAIL'} ${check.name}${check.detail?` — ${check.detail}`:''}`)
  if(passed){console.log('ALLEGRO VIBEZ production smoke probe passed.');process.exit(0)}
  if(attempt<attempts) await sleep(delayMs)
}

console.error(`Production smoke probe failed. Primary origin: ${origin}. Fallback deployment origin: ${fallbackOrigin}.`)
process.exit(1)
