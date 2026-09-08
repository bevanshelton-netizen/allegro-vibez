import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedTypes=new Set([
  'music_video','live_session','concert_film','artist_documentary','revival_documentary',
  'tour_diary','behind_the_scenes','music_biopic','music_movie','launch_film','interview_special'
])

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405})
  try{
    const auth=req.headers.get('authorization')||''
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const{data:{user}}=await supabase.auth.getUser()
    if(!user)return new Response(JSON.stringify({error:'Authentication required'}),{status:401,headers:{'content-type':'application/json'}})

    const body=await req.json()
    const contentType=String(body?.content_type||'').trim()
    if(!allowedTypes.has(contentType))return new Response(JSON.stringify({error:'Unsupported content type'}),{status:422,headers:{'content-type':'application/json'}})

    const{data:profile}=await supabase.from('profiles').select('id,kora_link_status,kora_creator_reference').eq('id',user.id).maybeSingle()
    if(!profile||profile.kora_link_status!=='linked'||!profile.kora_creator_reference){
      return new Response(JSON.stringify({error:'Link your KORA creator identity before video handoff'}),{status:409,headers:{'content-type':'application/json'}})
    }

    const base=Deno.env.get('KORA_INTERNAL_URL')||''
    const key=Deno.env.get('ALLEGRO_KORA_INTEGRATION_KEY')||''
    if(!base||!key)return new Response(JSON.stringify({error:'KORA integration is not active yet'}),{status:503,headers:{'content-type':'application/json'}})
    const url=new URL('/api/internal/allegro-video-handoff',base)
    if(url.protocol!=='https:')return new Response(JSON.stringify({error:'Unsafe KORA integration URL'}),{status:503,headers:{'content-type':'application/json'}})

    const payload={
      ...body,
      allegro_creator_ref:profile.kora_creator_reference,
      source_reference:`allegro:${user.id}:${crypto.randomUUID()}`
    }
    const r=await fetch(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-allegro-kora-key':key},body:JSON.stringify(payload)})
    const text=await r.text()
    return new Response(text,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json'}})
  }catch(error){
    console.error('KORA handoff failed',error)
    return new Response(JSON.stringify({error:'Video handoff failed'}),{status:500,headers:{'content-type':'application/json'}})
  }
})
