import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const encode=(value:string)=>encodeURIComponent(value.trim()).replace(/%20/g,'+')

function parameterString(params:URLSearchParams){
  return [...params.entries()]
    .filter(([key,value])=>key!=='signature'&&value!=='')
    .map(([key,value])=>`${key}=${encode(value)}`)
    .join('&')
}

function signed(params:URLSearchParams,passphrase:string){
  const received=params.get('signature')||''
  const payload=parameterString(params)+(passphrase?`&passphrase=${encode(passphrase)}`:'')
  return received===createHash('md5').update(payload).digest('hex')
}

async function validatedByPayFast(params:URLSearchParams,sandbox:boolean){
  const host=sandbox?'sandbox.payfast.co.za':'www.payfast.co.za'
  const response=await fetch(`https://${host}/eng/query/validate`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:parameterString(params),
  })
  if(!response.ok)return false
  return (await response.text()).trim()==='VALID'
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405})
  try{
    const params=new URLSearchParams(await req.text())
    const passphrase=Deno.env.get('PAYFAST_PASSPHRASE')||''
    if(!signed(params,passphrase))return new Response('Invalid signature',{status:400})
    if(params.get('merchant_id')!==Deno.env.get('PAYFAST_MERCHANT_ID'))return new Response('Invalid merchant',{status:400})

    const sandbox=Deno.env.get('PAYFAST_SANDBOX')==='true'
    if(!(await validatedByPayFast(params,sandbox)))return new Response('PayFast validation failed',{status:400})

    const url=Deno.env.get('SUPABASE_URL')!
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin=createClient(url,service)
    const merchantId=params.get('m_payment_id')||''
    const {data:payment,error:paymentError}=await admin.from('payment_transactions').select('*').eq('merchant_payment_id',merchantId).single()
    if(paymentError||!payment)return new Response('Unknown payment',{status:404})

    const receivedAmount=Number(params.get('amount_gross'))
    const expectedAmount=Number(payment.amount)
    if(!Number.isFinite(receivedAmount)||Math.abs(receivedAmount-expectedAmount)>0.009)return new Response('Amount mismatch',{status:400})

    const complete=params.get('payment_status')==='COMPLETE'
    const providerPaymentId=params.get('pf_payment_id')||null
    const {data:updated,error}=await admin.from('payment_transactions').update({
      provider_payment_id:providerPaymentId,
      status:complete?'complete':'failed',
      raw_notification:Object.fromEntries(params),
      updated_at:new Date().toISOString(),
    }).eq('id',payment.id).select('id').single()
    if(error)return new Response('Update failed',{status:500})

    if(complete){
      const {error:activationError}=await admin.rpc('activate_paid_subscription',{p_transaction_id:updated.id})
      if(activationError)return new Response('Activation failed',{status:500})
    }
    return new Response('OK')
  }catch(error){
    console.error('PayFast ITN processing failed',error)
    return new Response('Notification processing failed',{status:500})
  }
})
