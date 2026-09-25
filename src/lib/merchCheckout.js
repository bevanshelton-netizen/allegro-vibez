const URL_MAP_ENV='VITE_IKHOKHA_MERCH_CHECKOUT_URLS'

function configuredUrls(){
  const raw=import.meta.env?.[URL_MAP_ENV]
  if(!raw)return {}
  try{
    const parsed=JSON.parse(raw)
    return parsed&&typeof parsed==='object'?parsed:{}
  }catch{
    return {}
  }
}

export function getOfficialMerchCheckoutUrl(productId){
  const value=configuredUrls()[productId]
  if(typeof value!=='string')return null
  try{
    const url=new URL(value)
    return url.protocol==='https:'?url.toString():null
  }catch{
    return null
  }
}
