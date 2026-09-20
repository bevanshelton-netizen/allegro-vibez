import { credentials, json, origin, signatureFor } from './lib/ikhokha-academy.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const { appId, appSecret, configured } = credentials()
  if (!configured) return json(503, { error: 'Gateway not configured' })

  const body = event.body || ''
  const incomingAppId = String(event.headers?.['ik-appid'] || '').trim()
  const incomingSignature = String(event.headers?.['ik-sign'] || '').trim().toLowerCase()
  const callbackUrl = `${origin()}/api/academy/webhook`
  const expected = signatureFor(callbackUrl, body, appSecret).toLowerCase()

  if (!incomingAppId || incomingAppId !== appId || !incomingSignature || incomingSignature !== expected) {
    console.warn('Rejected iKhokha webhook signature')
    return json(403, { error: 'Forbidden' })
  }

  let eventData = {}
  try { eventData = JSON.parse(body) } catch { return json(400, { error: 'Invalid JSON' }) }

  console.log('Verified iKhokha Academy webhook', JSON.stringify({
    paylinkID: eventData.paylinkID || null,
    status: eventData.status || null,
    externalTransactionID: eventData.externalTransactionID || null,
    responseCode: eventData.responseCode || null
  }))

  return json(200, { received: true })
}
