const OWNED_DEFAULT='https://fabric.izakhonoafrica.co.za'
const EXTERNAL_BRIDGE='https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/izakhono-gateway-event'

function ownedBase(){
  return String(import.meta.env.VITE_IZAKHONO_FABRIC_URL||OWNED_DEFAULT).replace(/\/$/,'')
}
async function postWithTimeout(url,body,timeoutMs=2400){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal})
    const data=await response.json().catch(()=>({}))
    if(response.ok||response.status===202)return {ok:true,status:response.status,...data}
    return {ok:false,status:response.status,error:data?.error||'APP FABRIC rejected event'}
  }catch(error){
    return {ok:false,status:null,error:error?.name==='AbortError'?'timeout':String(error?.message||error)}
  }finally{clearTimeout(timer)}
}
export async function emitAppFabricLead({subjectRef,contact,opportunity,note,platformId='allegro-vibez'}){
  const body={platform_id:platformId,event_type:'lead.created',subject_ref:String(subjectRef||'').slice(0,180),contact,opportunity,note}
  if(!body.subject_ref)return {ok:false,error:'subject_ref_required'}
  const primary=await postWithTimeout(ownedBase()+'/api/fabric/intake',body)
  if(primary.ok)return {...primary,route:'owned-primary'}
  const external=await postWithTimeout(EXTERNAL_BRIDGE,{...body,fabric_bridge:true},4000)
  if(external.ok)return {...external,route:'external-resilience',primary_error:primary.error}
  return {ok:false,route:'unavailable',primary_error:primary.error,external_error:external.error}
}
