import {IKHOKHA_STATUS_EXTERNAL,credentials,productFromReference,signatureFor} from '../_lib/ikhokha.js'

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})

  const {appId,appSecret,configured}=credentials()
  if(!configured)return res.status(503).json({error:'iKhokha is not configured.',code:'IKHOKHA_NOT_CONFIGURED'})

  const ref=String(req.query?.ref||'').trim()
  const product=productFromReference(ref)
  if(!product)return res.status(400).json({error:'Invalid payment reference.'})

  const statusUrl=`${IKHOKHA_STATUS_EXTERNAL}?externalReference=${encodeURIComponent(ref)}`
  const signature=signatureFor(statusUrl,'',appSecret)
  let response
  try{
    response=await fetch(statusUrl,{method:'GET',headers:{Accept:'application/json','IK-APPID':appId,'IK-SIGN':signature}})
  }catch(error){
    console.error('iKhokha status network error',error?.message)
    return res.status(502).json({error:'Could not verify payment with iKhokha.'})
  }

  const raw=await response.text()
  let data={}
  try{data=JSON.parse(raw)}catch{data={message:raw}}
  if(!response.ok)return res.status(502).json({error:'Payment status lookup failed.'})

  const providerStatus=String(data.status||'').toUpperCase()
  const paid=providerStatus==='PAID'||providerStatus==='SUCCESS'
  if(paid&&Number.isFinite(Number(data.amount))&&Number(data.amount)!==product.amount){
    console.error('iKhokha amount mismatch',ref,data.amount,product.amount)
    return res.status(409).json({error:'Paid amount does not match the selected ALLEGRO package.'})
  }

  return res.status(200).json({paid,status:providerStatus||'PENDING',product:{id:product.id,label:product.label,amount:product.amount}})
}
