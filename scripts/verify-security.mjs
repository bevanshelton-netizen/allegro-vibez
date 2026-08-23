/* global console, process */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(dir){
  const output=[]
  for(const entry of readdirSync(dir)){
    const path=join(dir,entry)
    if(statSync(path).isDirectory()) output.push(...files(path))
    else output.push(path)
  }
  return output
}

const frontendFiles=files('src').filter(file=>/\.(js|jsx|ts|tsx|css|html)$/.test(file))
const forbidden=[
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYFAST_MERCHANT_KEY',
  'PAYFAST_PASSPHRASE',
  'PAYFAST_MERCHANT_ID',
]

const findings=[]
for(const file of frontendFiles){
  const text=readFileSync(file,'utf8')
  for(const token of forbidden){if(text.includes(token))findings.push(`${file}: contains ${token}`)}
}

const envExample=readFileSync('.env.example','utf8')
if(/SERVICE_ROLE|PAYFAST_MERCHANT_KEY|PAYFAST_PASSPHRASE/.test(envExample)) findings.push('.env.example: server-only secret name exposed in frontend env template')

const checkout=readFileSync('supabase/functions/payfast-checkout/index.ts','utf8')
const notify=readFileSync('supabase/functions/payfast-notify/index.ts','utf8')
for(const check of [
  ['checkout authenticates user',checkout.includes('auth.getUser')],
  ['checkout prices from database',checkout.includes("from('subscription_plans')")],
  ['notify verifies signature',notify.includes('signed(params,passphrase)')],
  ['notify verifies merchant',notify.includes("params.get('merchant_id')")],
  ['notify validates with PayFast',notify.includes('validatedByPayFast')],
  ['notify verifies amount',notify.includes('Amount mismatch')],
  ['notify activates through RPC',notify.includes('activate_paid_subscription')],
]) if(!check[1]) findings.push(`PayFast check failed: ${check[0]}`)

if(findings.length){
  console.error('Security verification failed:\n'+findings.map(item=>`- ${item}`).join('\n'))
  process.exit(1)
}
console.log('ALLEGRO VIBEZ frontend secret boundary and PayFast guards verified.')
