import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const cors={
  'Access-Control-Allow-Origin':Deno.env.get('APP_ORIGIN')||'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const encode=(value:string)=>encodeURIComponent(value.trim()).replace(/%20/g,'+')
const signature=(fields:Record<string,string>,passphrase:string)=>createHash('md5').update(Object.entries(fields).filter(([,v])=>v!=='').map(([k,v])=>`${k}=${encode(v)}`).join('&')+(passphrase?`&passphrase=${encode(passphrase)}`:'')).digest('hex')

function httpsOrigin(raw:string|undefined,name:string){
  if(!raw)throw new Error(`${name} is not configured`)
  const url=new URL(raw)
  if(url.protocol!=='https:'||url.username||url.password)throw new Error(`${name} must be a clean HTTPS URL`)
  return url.origin
}

async function izakhonoCheckout(input:{
  transactionId:string
  merchantPaymentId:string
  plan:{code:string;name:string;monthly_price:number|string;currency:string}
  email:string
}){
  const portal=httpsOrigin(Deno.env.get('IZAKHONO_PAY_URL'),'IZAKHONO_PAY_URL')
  const origin=httpsOrigin(Deno.env.get('APP_ORIGIN'),'APP_ORIGIN')
  const key=Deno.env.get('IZAKHONO_PAY_API_KEY')||''
  if(!key)throw new Error('IZAKHONO PAY merchant key is not configured')
  const response=await fetch(`${portal}/api/v1/intents`,{
    method:'POST',
    redirect:'error',
    headers:{
      'Content-Type':'application/json',
      'Accept':'application/json',
      'x-izakhono-key':key,
      'x-izakhono-app':'allegro-vibez',
      'idempotency-key':`allegro:subscription:${input.transactionId}`,
    },
    body:JSON.stringify({
      amount_minor:Math.round(Number(input.plan.monthly_price)*100),
      currency:'ZAR',
      email:input.email,
      description:`ALLEGRO-VIBEZ ${input.plan.name}`.slice(0,180),
      // Preserve the existing PayFast-specific entitlement ledger on first rollout.
      provider:'payfast',
      return_url:`${origin}/billing?payment=success`,
      cancel_url:`${origin}/billing?payment=cancelled`,
      metadata:{
        kind:'creator_subscription',
        transaction_id:input.transactionId,
        merchant_payment_id:input.merchantPaymentId,
        plan_code:input.plan.code,
      },
    }),
  })
  const payload=await response.json().catch(()=>null)
  if(!response.ok||!payload?.ok||!payload?.intent)throw new Error(payload?.error?.message||`IZAKHONO PAY checkout failed (${response.status})`)
  const intent=payload.intent
  if(intent.routed_provider!=='payfast'||intent.checkout_method!=='form_post'||!intent.checkout_url||!intent.form_fields){
    throw new Error('IZAKHONO PAY returned an unsupported ALLEGRO-VIBEZ checkout method')
  }
  const checkout=new URL(intent.checkout_url)
  if(checkout.protocol!=='https:'||!['www.payfast.co.za','sandbox.payfast.co.za'].includes(checkout.hostname))throw new Error('IZAKHONO PAY returned an unsafe checkout URL')
  if(checkout.hostname==='www.payfast.co.za'&&Deno.env.get('ALLEGRO_IZAKHONO_PAY_LIVE_APPROVED')!=='true'){
    throw new Error('IZAKHONO PAY live ALLEGRO-VIBEZ payments are not approved')
  }
  return {action:checkout.toString(),fields:intent.form_fields,izakhono_intent_id:intent.id,izakhono_reference:intent.reference}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const auth=req.headers.get('Authorization');if(!auth)throw new Error('Authentication required')
    const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await userClient.auth.getUser();if(!user||!user.email)throw new Error('Authentication required')
    const {planCode}=await req.json();const admin=createClient(url,service)
    const {data:plan,error}=await admin.from('subscription_plans').select('code,name,monthly_price,currency').eq('code',planCode).eq('active',true).single();if(error||!plan)throw new Error('Plan not found')
    if(plan.currency!=='ZAR')throw new Error('Checkout currently supports ZAR plans only')

    const merchantPaymentId=`av-${crypto.randomUUID()}`
    const {data:transaction,error:insertError}=await admin.from('payment_transactions').insert({
      owner_id:user.id,
      plan_code:plan.code,
      merchant_payment_id:merchantPaymentId,
      amount:plan.monthly_price,
      currency:plan.currency,
    }).select('id,merchant_payment_id').single()
    if(insertError||!transaction)throw insertError||new Error('Could not create payment transaction')

    if(Deno.env.get('PAYMENT_ORCHESTRATOR')==='izakhono'){
      try{
        const checkout=await izakhonoCheckout({
          transactionId:transaction.id,
          merchantPaymentId:transaction.merchant_payment_id,
          plan,
          email:user.email,
        })
        return Response.json(checkout,{headers:{...cors,'Content-Type':'application/json'}})
      }catch(error){
        await admin.from('payment_transactions').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',transaction.id).eq('status','created')
        throw error
      }
    }

    const origin=Deno.env.get('APP_ORIGIN')!;const sandbox=Deno.env.get('PAYFAST_SANDBOX')==='true'
    const fields:Record<string,string>={merchant_id:Deno.env.get('PAYFAST_MERCHANT_ID')!,merchant_key:Deno.env.get('PAYFAST_MERCHANT_KEY')!,return_url:`${origin}/billing?payment=success`,cancel_url:`${origin}/billing?payment=cancelled`,notify_url:`${url}/functions/v1/payfast-notify`,m_payment_id:merchantPaymentId,amount:Number(plan.monthly_price).toFixed(2),item_name:`ALLEGRO-VIBEZ ${plan.name}`}
    if(!fields.merchant_id||!fields.merchant_key)throw new Error('PayFast merchant configuration is incomplete')
    fields.signature=signature(fields,Deno.env.get('PAYFAST_PASSPHRASE')||'')
    return Response.json({action:sandbox?'https://sandbox.payfast.co.za/eng/process':'https://www.payfast.co.za/eng/process',fields},{headers:{...cors,'Content-Type':'application/json'}})
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Checkout failed'},{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
