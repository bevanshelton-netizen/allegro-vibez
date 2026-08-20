import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const encode=(value:string)=>encodeURIComponent(value.trim()).replace(/%20/g,'+')
function signed(params:URLSearchParams,passphrase:string){const received=params.get('signature')||'';const fields=[...params.entries()].filter(([k,v])=>k!=='signature'&&v!=='');const payload=fields.map(([k,v])=>`${k}=${encode(v)}`).join('&')+(passphrase?`&passphrase=${encode(passphrase)}`:'');return received===createHash('md5').update(payload).digest('hex')}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405})
  const params=new URLSearchParams(await req.text());if(!signed(params,Deno.env.get('PAYFAST_PASSPHRASE')||''))return new Response('Invalid signature',{status:400})
  if(params.get('merchant_id')!==Deno.env.get('PAYFAST_MERCHANT_ID'))return new Response('Invalid merchant',{status:400})
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);const merchantId=params.get('m_payment_id')||''
  const {data:payment}=await admin.from('payment_transactions').select('*').eq('merchant_payment_id',merchantId).single();if(!payment)return new Response('Unknown payment',{status:404})
  if(Number(params.get('amount_gross'))!==Number(payment.amount))return new Response('Amount mismatch',{status:400})
  const complete=params.get('payment_status')==='COMPLETE';const {data:updated,error}=await admin.from('payment_transactions').update({provider_payment_id:params.get('pf_payment_id'),status:complete?'complete':'failed',raw_notification:Object.fromEntries(params),updated_at:new Date().toISOString()}).eq('id',payment.id).select('id').single();if(error)return new Response('Update failed',{status:500})
  if(complete){const {error:activationError}=await admin.rpc('activate_paid_subscription',{p_transaction_id:updated.id});if(activationError)return new Response('Activation failed',{status:500})}
  return new Response('OK')
})
