import crypto from 'node:crypto'
import {IKHOKHA_API,ORIGIN,PRODUCTS,credentials,parseBody,signatureFor} from '../_lib/ikhokha.js'

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})

  const {appId,appSecret,configured}=credentials()
  if(!configured)return res.status(503).json({error:'iKhokha is not yet connected to this deployment.',code:'IKHOKHA_NOT_CONFIGURED'})

  const {productId}=parseBody(req)
  const product=PRODUCTS[productId]
  if(!product)return res.status(400).json({error:'Invalid product.'})
  if(!product.payableNow)return res.status(409).json({error:'This radio package can be reserved now and becomes payable only after ALLEGRO confirms verified station activation.'})

  const tx=`${product.prefix}-${crypto.randomUUID()}`
  const returnBase=`${ORIGIN}/revenue?payment=`
  const callbackUrl=`${ORIGIN}/api/ikhokha/webhook`
  const payload={
    entityID:appId,
    externalEntityID:'IZAKHONO-AFRICA-ALLEGRO',
    amount:product.amount,
    currency:'ZAR',
    requesterUrl:`${ORIGIN}/revenue`,
    description:product.label,
    paymentReference:tx,
    mode:process.env.IKHOKHA_MODE==='test'?'test':'live',
    externalTransactionID:tx,
    urls:{
      callbackUrl,
      successPageUrl:`${returnBase}success&ref=${encodeURIComponent(tx)}`,
      failurePageUrl:`${returnBase}failed&ref=${encodeURIComponent(tx)}`,
      cancelUrl:`${returnBase}cancelled&ref=${encodeURIComponent(tx)}`
    }
  }

  const body=JSON.stringify(payload)
  const signature=signatureFor(IKHOKHA_API,body,appSecret)
  let response
  try{
    response=await fetch(IKHOKHA_API,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','IK-APPID':appId,'IK-SIGN':signature},body})
  }catch(error){
    console.error('iKhokha create-payment network error',error?.message)
    return res.status(502).json({error:'Could not reach iKhokha.'})
  }

  const raw=await response.text()
  let data={}
  try{data=JSON.parse(raw)}catch{data={message:raw}}
  if(!response.ok||data.responseCode!=='00'||!data.paylinkUrl){
    console.error('iKhokha create-payment rejected',response.status,data.responseCode,data.message)
    return res.status(502).json({error:'iKhokha could not create the payment link.',providerCode:data.responseCode||null})
  }

  return res.status(200).json({checkoutUrl:data.paylinkUrl,paylinkID:data.paylinkID,externalTransactionID:tx,product:{id:product.id,label:product.label,amount:product.amount}})
}
