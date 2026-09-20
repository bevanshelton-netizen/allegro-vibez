import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const req=(value,message)=>{if(!value)throw new Error(message)}

const lib=read('netlify/functions/lib/ikhokha-academy.mjs')
const create=read('netlify/functions/academy-create-payment.mjs')
const verify=read('netlify/functions/academy-verify-payment.mjs')
const access=read('netlify/functions/academy-access.mjs')
const webhook=read('netlify/functions/academy-webhook.mjs')
const page=read('src/pages/MusicAcademy.jsx')
const learner=read('src/pages/MusicAcademyLearner.jsx')
const routes=read('src/App.jsx')
const netlify=read('netlify.toml')
const terms=read('public/terms.html')
const privacy=read('public/privacy.html')
const refunds=read('public/refunds.html')

req(lib.includes("amount: 9900"),'Academy server price must be R99')
req(lib.includes("days: 30"),'Academy pass must be 30 days')
req(lib.includes("process.env.IKHOKHA_APP_ID") && lib.includes("process.env.IKHOKHA_APP_SECRET"),'iKhokha credentials must stay in server environment')
req(lib.includes("createHmac('sha256'"),'HMAC-SHA256 signing is required')
req(create.includes('PRODUCTS[input.productId]'),'Checkout must use the server product allowlist')
req(!create.includes('input.amount'),'Client must not control checkout amount')
req(create.includes("'IK-APPID'") && create.includes("'IK-SIGN'"),'iKhokha signed headers are required')
req(create.includes("process.env.IKHOKHA_MODE === 'live' ? 'live' : 'test'"),'Checkout must fail safe to test mode')
req(create.includes('IKHOKHA_NOT_CONFIGURED'),'Checkout must fail closed without production credentials')
req(verify.includes("providerStatus !== 'PAID'") && verify.includes("providerStatus !== 'SUCCESS'"),'Provider status must be verified')
req(verify.includes('Paid amount does not match'),'Payment amount mismatch protection is required')
req(verify.includes('HttpOnly; Secure; SameSite=Lax'),'Academy entitlement cookie must be secure')
req(access.includes('verifyEntitlement'),'Learner access must validate entitlement server-side')
req(webhook.includes('incomingSignature !== expected'),'Webhook signature validation is required')
req(page.includes("productId:'academy_30d'"),'Academy UI must request only the allowlisted product')
req(page.includes('R99') && page.includes('/ 30 days'),'Academy UI must show R99 / 30 days')
req(page.includes('renew manually'),'Academy must not imply automatic recurring billing')
req(learner.includes('/api/academy/access'),'Learner dashboard must check paid access')
for(const route of ['/music-academy/payment-success','/music-academy/payment-failed','/music-academy/payment-cancelled']) req(routes.includes(route),`Missing route ${route}`)
for(const route of ['/api/academy/checkout','/api/academy/verify','/api/academy/access','/api/academy/webhook']) req(netlify.includes(route),`Missing Netlify route ${route}`)
req(netlify.includes('microphone=(self)') && !netlify.includes('microphone=()'),'Music practice microphone must be allowed for self')
req(netlify.includes('https://pay.ikhokha.com'),'iKhokha must be permitted by the form-action policy')
for(const doc of [terms,privacy,refunds]){
  req(doc.includes('IZAKHONO AFRICA (PTY) LTD'),'Legal merchant missing from Academy payment policy')
  req(doc.includes('iKhokha'),'iKhokha disclosure missing from Academy payment policy')
}
req(terms.includes('R99 for 30 days') && refunds.includes('R99 for 30 days'),'30-day Academy product terms missing')
req(refunds.includes('does not automatically renew'),'Refund policy must disclose no automatic renewal')

for(const path of [
  'netlify/functions/lib/ikhokha-academy.mjs',
  'netlify/functions/academy-create-payment.mjs',
  'netlify/functions/academy-verify-payment.mjs',
  'netlify/functions/academy-access.mjs',
  'netlify/functions/academy-webhook.mjs'
]){
  execFileSync(process.execPath,['--check',path],{stdio:'pipe'})
}

console.log('ALLEGRO_MUSIC_ACADEMY_PAYMENT_GATE=PASS')
