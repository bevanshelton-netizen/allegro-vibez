import { credentials, json, verifyEntitlement } from './lib/ikhokha-academy.mjs'

function cookieValue(header, name) {
  const cookies = String(header || '').split(';')
  for (const item of cookies) {
    const [key, ...rest] = item.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('=') || '')
  }
  return ''
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })
  const { appSecret, configured } = credentials()
  if (!configured) return json(200, { active: false, gatewayConfigured: false })

  const token = cookieValue(event.headers?.cookie || event.headers?.Cookie, 'allegro_academy_entitlement')
  const entitlement = verifyEntitlement(token, appSecret)
  if (!entitlement) return json(200, { active: false, gatewayConfigured: true })

  return json(200, {
    active: true,
    gatewayConfigured: true,
    product: entitlement.product.id,
    expiresAt: new Date(entitlement.payload.exp * 1000).toISOString()
  })
}
