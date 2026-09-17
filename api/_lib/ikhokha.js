import crypto from 'node:crypto'

export const IKHOKHA_API='https://api.ikhokha.com/public-api/v1/api/payment'
export const IKHOKHA_STATUS_EXTERNAL='https://api.ikhokha.com/public-api/v1/api/getStatus/external'
export const ORIGIN='https://allegro-vibez.vercel.app'

export const PRODUCTS=Object.freeze({
  'creator-launch':{id:'creator-launch',label:'ALLEGRO Creator Launch Pack',amount:29900,prefix:'ALGCL',payableNow:true},
  'featured-artist':{id:'featured-artist',label:'ALLEGRO Featured Artist Launch',amount:59900,prefix:'ALGFA',payableNow:true},
  'business-sponsor':{id:'business-sponsor',label:'ALLEGRO Launch Sponsor',amount:150000,prefix:'ALGLS',payableNow:true},
  'founding-partner':{id:'founding-partner',label:'ALLEGRO Founding Partner',amount:500000,prefix:'ALGFP',payableNow:true},
  'radio-try':{id:'radio-try',label:'ALLEGRO Radio Founding Trial',amount:75000,prefix:'ALGRT',payableNow:false},
  'radio-grow':{id:'radio-grow',label:'ALLEGRO Radio Growth Package',amount:150000,prefix:'ALGRG',payableNow:false},
  'radio-daypart':{id:'radio-daypart',label:'ALLEGRO Radio Own the Daypart',amount:350000,prefix:'ALGRD',payableNow:false},
  'radio-show-partner':{id:'radio-show-partner',label:'ALLEGRO Radio Founding Show Partner',amount:750000,prefix:'ALGRS',payableNow:false}
})

export function credentials(){
  const appId=(process.env.IKHOKHA_APP_ID||'').trim()
  const appSecret=(process.env.IKHOKHA_APP_SECRET||'').trim()
  return {appId,appSecret,configured:Boolean(appId&&appSecret)}
}

function jsStringEscape(value){return String(value).replace(/[\\"']/g,'\\$&').replace(/\u0000/g,'\\0')}
function pathWithQuery(urlValue){const u=new URL(urlValue);return `${u.pathname}${u.search}`}
export function signatureFor(urlValue,body,secret){
  const payload=jsStringEscape(pathWithQuery(urlValue)+(body||''))
  return crypto.createHmac('sha256',secret).update(payload,'utf8').digest('hex')
}

export function parseBody(req){
  if(!req.body)return {}
  if(typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body
  try{return JSON.parse(Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body))}catch{return {}}
}

export function productFromReference(ref){
  const value=String(ref||'')
  return Object.values(PRODUCTS).find(p=>value.startsWith(`${p.prefix}-`))||null
}

export async function readRawBody(req){
  if(typeof req.body==='string')return req.body
  if(Buffer.isBuffer(req.body))return req.body.toString('utf8')
  if(req.body&&typeof req.body==='object')return JSON.stringify(req.body)
  const chunks=[]
  for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}
