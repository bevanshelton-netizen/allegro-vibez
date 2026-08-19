import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const cors={
  'Access-Control-Allow-Origin':Deno.env.get('APP_ORIGIN')||'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const encode=(value:string)=>encodeURIComponent(value.trim()).replace(/%20/g,'+')
const signature=(fields:Record<string,string>,passphrase:string)=>createHash('md5').update(Object.entries(fields).filter(([,v])=>v!=='').map(([k,v])=>`${k}=${encode(v)}`).join('&')+(passphrase?`&passphrase=${encode(passphrase)}`:'')).digest('hex')

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const auth=req.headers.get('Authorization');if(!auth)throw new Error('Authentication required')
    const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await userClient.auth.getUser();if(!user)throw new Error('Authentication required')
    const {planCode}=await req.json();const admin=createClient(url,service)
    const {data:plan,error}=await admin.from('subscription_plans').select('code,name,monthly_price,currency').eq('code',planCode).eq('active',true).single();if(error||!plan)throw new Error('Plan not found')
    if(plan.currency!=='ZAR')throw new Error('PayFast checkout currently supports ZAR plans only')
    const merchantPaymentId=`av-${crypto.randomUUID()}`;const origin=Deno.env.get('APP_ORIGIN')!;const sandbox=Deno.env.get('PAYFAST_SANDBOX')==='true'
    const fields:Record<string,string>={merchant_id:Deno.env.get('PAYFAST_MERCHANT_ID')!,merchant_key:Deno.env.get('PAYFAST_MERCHANT_KEY')!,return_url:`${origin}/billing?payment=success`,cancel_url:`${origin}/billing?payment=cancelled`,notify_url:`${url}/functions/v1/payfast-notify`,m_payment_id:merchantPaymentId,amount:Number(plan.monthly_price).toFixed(2),item_name:`ALLEGRO-VIBEZ ${plan.name}`}
    if(!fields.merchant_id||!fields.merchant_key)throw new Error('PayFast merchant configuration is incomplete')
    fields.signature=signature(fields,Deno.env.get('PAYFAST_PASSPHRASE')||'')
    const {error:insertError}=await admin.from('payment_transactions').insert({owner_id:user.id,plan_code:plan.code,merchant_payment_id:merchantPaymentId,amount:plan.monthly_price,currency:plan.currency});if(insertError)throw insertError
    return Response.json({action:sandbox?'https://sandbox.payfast.co.za/eng/process':'https://www.payfast.co.za/eng/process',fields},{headers:{...cors,'Content-Type':'application/json'}})
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Checkout failed'},{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
