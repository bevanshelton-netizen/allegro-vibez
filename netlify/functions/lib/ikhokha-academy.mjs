import crypto from 'node:crypto'

export const IKHOKHA_API = 'https://api.ikhokha.com/public-api/v1/api/payment'
export const IKHOKHA_STATUS_EXTERNAL = 'https://api.ikhokha.com/public-api/v1/api/getStatus/external'

export const PRODUCTS = Object.freeze({
  academy_30d: {
    id: 'academy_30d',
    label: 'ALLEGRO Music Academy — 30 Day All Access',
    amount: 9900,
    days: 30,
    prefix: 'AMA'
  }
})

export function credentials() {
  const appId = (process.env.IKHOKHA_APP_ID || '').trim()
  const appSecret = (process.env.IKHOKHA_APP_SECRET || '').trim()
  return { appId, appSecret, configured: Boolean(appId && appSecret) }
}

export function origin() {
  const candidate = (process.env.ALLEGRO_PUBLIC_ORIGIN || process.env.URL || 'https://allegro-vibez.netlify.app').trim()
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:') throw new Error('HTTPS required')
    return parsed.origin
  } catch {
    return 'https://allegro-vibez.netlify.app'
  }
}

function jsStringEscape(str) {
  return String(str).replace(/[\\"']/g, '\\return String(str).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')').replaceAll(String.fromCharCode(0), '\\0')
}

function pathWithQuery(urlValue) {
  const u = new URL(urlValue)
  return `${u.pathname}${u.search}`
}

export function signatureFor(urlValue, body, secret) {
  const payload = jsStringEscape(pathWithQuery(urlValue) + (body || ''))
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

export function productFromReference(ref) {
  if (!ref || !ref.startsWith('AMA-')) return null
  return PRODUCTS.academy_30d
}

function entitlementKey(secret) {
  return crypto.createHmac('sha256', secret).update('allegro-music-academy-entitlement-v1').digest()
}

export function issueEntitlement(product, externalTransactionID, secret) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    v: 1,
    product: product.id,
    tx: externalTransactionID,
    iat: now,
    exp: now + product.days * 86400
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', entitlementKey(secret)).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyEntitlement(token, secret) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', entitlementKey(secret)).update(body).digest('base64url')
  const a = Buffer.from(sig || '')
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let payload
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) } catch { return null }
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
  const product = PRODUCTS[payload.product]
  if (!product) return null
  return { payload, product }
}

export function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(payload)
  }
}
