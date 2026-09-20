import crypto from 'node:crypto'
import {
  IKHOKHA_API,
  PRODUCTS,
  credentials,
  json,
  origin,
  signatureFor
} from './lib/ikhokha-academy.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const { appId, appSecret, configured } = credentials()
  if (!configured) {
    return json(503, {
      error: 'iKhokha production credentials have not yet been added to this deployment.',
      code: 'IKHOKHA_NOT_CONFIGURED'
    })
  }

  let input = {}
  try { input = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid request.' }) }

  const product = PRODUCTS[input.productId]
  if (!product) return json(400, { error: 'Invalid product.' })

  const tx = `${product.prefix}-${crypto.randomUUID()}`
  const appOrigin = origin()
  const successUrl = `${appOrigin}/music-academy/payment-success?ref=${encodeURIComponent(tx)}`
  const failureUrl = `${appOrigin}/music-academy/payment-failed?ref=${encodeURIComponent(tx)}`
  const cancelUrl = `${appOrigin}/music-academy/payment-cancelled?ref=${encodeURIComponent(tx)}`
  const callbackUrl = `${appOrigin}/api/academy/webhook`

  const payload = {
    entityID: appId,
    externalEntityID: 'IZAKHONO-ALLEGRO-ACADEMY',
    amount: product.amount,
    currency: 'ZAR',
    requesterUrl: `${appOrigin}/music-academy#pricing`,
    description: product.label,
    paymentReference: tx,
    mode: process.env.IKHOKHA_MODE === 'live' ? 'live' : 'test',
    externalTransactionID: tx,
    urls: {
      callbackUrl,
      successPageUrl: successUrl,
      failurePageUrl: failureUrl,
      cancelUrl
    }
  }

  const body = JSON.stringify(payload)
  const signature = signatureFor(IKHOKHA_API, body, appSecret)

  let response
  try {
    response = await fetch(IKHOKHA_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'IK-APPID': appId,
        'IK-SIGN': signature
      },
      body
    })
  } catch (error) {
    console.error('iKhokha create-payment network error', error?.message)
    return json(502, { error: 'Could not reach iKhokha.' })
  }

  const raw = await response.text()
  let data = {}
  try { data = JSON.parse(raw) } catch { data = { message: raw } }

  if (!response.ok || data.responseCode !== '00' || !data.paylinkUrl) {
    console.error('iKhokha create-payment rejected', response.status, data.responseCode, data.message)
    return json(502, {
      error: 'Payment link could not be created.',
      providerCode: data.responseCode || null
    })
  }

  return json(200, {
    checkoutUrl: data.paylinkUrl,
    externalTransactionID: tx,
    product: { id: product.id, label: product.label, amount: product.amount, days: product.days }
  })
}
