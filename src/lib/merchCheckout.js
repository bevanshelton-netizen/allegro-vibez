const URL_MAP_ENV='VITE_IKHOKHA_MERCH_CHECKOUT_URLS'
const RUNTIME_CONFIG_URL='/runtime/merch-checkout.json'

function safeHttpsUrl(value){
  if(typeof value!=='string'||!value.trim())return null
  try{
    const url=new URL(value)
    return url.protocol==='https:'?url.toString():null
  }catch{
    return null
  }
}

function configuredEnvUrls(){
  const raw=import.meta.env?.[URL_MAP_ENV]
  if(!raw)return {}
  try{
    const parsed=JSON.parse(raw)
    return parsed&&typeof parsed==='object'?parsed:{}
  }catch{
    return {}
  }
}

async function configuredRuntimeUrls(){
  try{
    const response=await fetch(RUNTIME_CONFIG_URL,{cache:'no-store',headers:{Accept:'application/json'}})
    if(!response.ok)return {}
    const payload=await response.json()
    if(payload?.provider!=='iKhokha'||!payload?.products||typeof payload.products!=='object')return {}
    return payload.products
  }catch{
    return {}
  }
}

export async function getOfficialMerchCheckoutUrl(productId){
  const runtimeUrls=await configuredRuntimeUrls()
  const runtimeValue=safeHttpsUrl(runtimeUrls[productId])
  if(runtimeValue)return runtimeValue
  return safeHttpsUrl(configuredEnvUrls()[productId])
}

export { RUNTIME_CONFIG_URL }
