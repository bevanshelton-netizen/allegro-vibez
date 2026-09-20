import {
  IKHOKHA_STATUS_EXTERNAL,
  credentials,
  issueEntitlement,
  json,
  productFromReference,
  signatureFor
} from './lib/ikhokha-academy.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })

  const { appId, appSecret, configured } = credentials()
  if (!configured) return json(503, { error: 'Payment gateway is not configured.', code: 'IKHOKHA_NOT_CONFIGURED' })

  const ref = String(event.queryStringParameters?.externalReference || '').trim()
  if (!/^AMA-[0-9a-f-]{36}$/i.test(ref)) return json(400, { error: 'Invalid payment reference.' })

  const product = productFromReference(ref)
  if (!product) return json(400, { error: 'Unknown product reference.' })

  const statusUrl = `${IKHOKHA_STATUS_EXTERNAL}?externalReference=${encodeURIComponent(ref)}`
  const signature = signatureFor(statusUrl, '', appSecret)

  let response
  try {
    response = await fetch(statusUrl, {
      method: 'GET',
      headers: { Accept: 'application/json', 'IK-APPID': appId, 'IK-SIGN': signature }
    })
  } catch (error) {
    console.error('iKhokha status network error', error?.message)
    return json(502, { error: 'Could not verify payment with iKhokha.' })
  }

  const raw = await response.text()
  let data = {}
  try { data = JSON.parse(raw) } catch { data = { message: raw } }
  if (!response.ok) return json(502, { error: 'Payment status lookup failed.' })

  const providerStatus = String(data.status || '').toUpperCase()
  if (providerStatus !== 'PAID' && providerStatus !== 'SUCCESS') {
    return json(200, { paid: false, status: providerStatus || 'PENDING' })
  }

  if (Number.isFinite(Number(data.amount)) && Number(data.amount) !== product.amount) {
    console.error('iKhokha amount mismatch', ref, data.amount, product.amount)
    return json(409, { error: 'Paid amount does not match the Music Academy pass.' })
  }

  const token = issueEntitlement(product, ref, appSecret)
  const cookie = `allegro_academy_entitlement=${encodeURIComponent(token)}; Max-Age=${product.days * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax`
  return json(200, {
    paid: true,
    status: providerStatus,
    accessUrl: '/music-academy/my-learning',
    product: { id: product.id, label: product.label, days: product.days }
  }, { 'Set-Cookie': cookie })
}
