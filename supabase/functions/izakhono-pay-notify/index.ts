import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual(a:string,b:string){
  const aa=Buffer.from(a);const bb=Buffer.from(b)
  return aa.length===bb.length&&timingSafeEqual(aa,bb)
}

function signature(raw:string,timestamp:string,secret:string){
  return createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex')
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405})
  try{
    if(Deno.env.get('PAYMENT_ORCHESTRATOR')!=='izakhono')return new Response('Not enabled',{status:404})
    const secret=Deno.env.get('IZAKHONO_PAY_WEBHOOK_SECRET')||''
    if(!secret)return new Response('Not configured',{status:503})
    const timestamp=req.headers.get('x-izakhono-timestamp')||''
    const supplied=req.headers.get('x-izakhono-signature')||''
    const eventName=req.headers.get('x-izakhono-event')||''
    const eventHeaderId=req.headers.get('x-izakhono-event-id')||''
    const unix=Number(timestamp);const now=Math.floor(Date.now()/1000)
    if(!Number.isInteger(unix)||Math.abs(now-unix)>300)return new Response('Stale webhook',{status:401})
    const raw=await req.text()
    if(!supplied||!safeEqual(signature(raw,timestamp,secret),supplied))return new Response('Invalid signature',{status:401})
    if(eventName!=='payment.paid')return new Response('Ignored',{status:202})

    const payload=JSON.parse(raw)
    if(payload?.event!=='payment.paid'||payload?.merchant!=='allegro-vibez'||payload?.event_id!==eventHeaderId)return new Response('Invalid event',{status:400})
    const intent=payload?.intent
    const meta=intent?.metadata
    if(!intent||intent.status!=='paid'||intent.currency!=='ZAR'||intent.provider!=='payfast')return new Response('Unsupported settlement',{status:409})
    if(meta?.kind!=='creator_subscription')return new Response('Invalid payment kind',{status:409})
    const transactionId=String(meta?.transaction_id||'')
    const merchantPaymentId=String(meta?.merchant_payment_id||'')
    const planCode=String(meta?.plan_code||'')
    const providerPaymentId=String(intent.provider_reference||'')
    if(!transactionId||!merchantPaymentId||!planCode||!providerPaymentId)return new Response('Incomplete event',{status:400})

    const url=Deno.env.get('SUPABASE_URL')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin=createClient(url,service)
    const {data:payment,error:paymentError}=await admin.from('payment_transactions')
      .select('id,owner_id,plan_code,merchant_payment_id,provider_payment_id,amount,currency,status,activated_at')
      .eq('id',transactionId)
      .eq('merchant_payment_id',merchantPaymentId)
      .single()
    if(paymentError||!payment)return new Response('Unknown payment',{status:404})
    if(payment.plan_code!==planCode||payment.currency!=='ZAR')return new Response('Payment metadata mismatch',{status:409})
    const receivedAmount=Number(intent.amount_minor)/100
    if(!Number.isFinite(receivedAmount)||Math.abs(receivedAmount-Number(payment.amount))>0.009)return new Response('Amount mismatch',{status:409})
    if(payment.status==='complete'){
      if(payment.provider_payment_id&&payment.provider_payment_id!==providerPaymentId)return new Response('Provider reference mismatch',{status:409})
      return new Response('OK')
    }

    const {data:updated,error:updateError}=await admin.from('payment_transactions').update({
      provider_payment_id:providerPaymentId,
      status:'complete',
      raw_notification:{source:'izakhono-pay',event_id:payload.event_id,intent_id:intent.id,reference:intent.reference},
      updated_at:new Date().toISOString(),
    }).eq('id',payment.id).in('status',['created','pending','failed']).select('id').single()
    if(updateError||!updated)return new Response('Update failed',{status:500})
    const {error:activationError}=await admin.rpc('activate_paid_subscription',{p_transaction_id:updated.id})
    if(activationError)return new Response('Activation failed',{status:500})
    return new Response('OK')
  }catch(error){
    console.error('IZAKHONO PAY notification failed',error)
    return new Response('Notification processing failed',{status:500})
  }
})
