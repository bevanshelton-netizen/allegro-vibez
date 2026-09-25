
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"content-type":"application/json"}});
const safe=(v,n=200)=>String(v??"").trim().slice(0,n);
const slugify=s=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"artist";
const fileName=s=>String(s||"").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,150);
const svcH={apikey:SERVICE,authorization:"Bearer "+SERVICE,"content-type":"application/json"};
async function user(req){
 const auth=req.headers.get("authorization")||"";if(!auth.startsWith("Bearer "))return null;
 const r=await fetch(BASE+"/auth/v1/user",{headers:{apikey:SERVICE,authorization:auth}});
 if(!r.ok)return null;const u=await r.json();return u?.id?{...u,auth}:null;
}
async function call(path,auth,opt={}){
 const r=await fetch(BASE+"/rest/v1/"+path,{...opt,headers:{apikey:SERVICE,authorization:auth,"content-type":"application/json",...(opt.headers||{})}});
 const t=await r.text();let body=null;try{body=t?JSON.parse(t):null}catch{body=t}
 if(!r.ok)throw new Error("DB "+r.status+" "+String(t).slice(0,280));return body;
}
async function service(path,opt={}){
 const r=await fetch(BASE+"/rest/v1/"+path,{...opt,headers:{...svcH,...(opt.headers||{})}});
 const t=await r.text();let body=null;try{body=t?JSON.parse(t):null}catch{body=t}
 if(!r.ok)throw new Error("DB "+r.status+" "+String(t).slice(0,280));return body;
}
const one=x=>Array.isArray(x)?x[0]||null:x;
async function funnel(eventName,me,extra={}){
 try{
  await service("allegro_funnel_events",{method:"POST",headers:{prefer:"return=minimal"},body:JSON.stringify({
   event_name:eventName,user_id:me?.id||null,artist_id:extra.artist_id||null,track_id:extra.track_id||null,
   source:"allegro-creator-api",metadata:extra.metadata||{}
  })});
 }catch(_){}
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const me=await user(req);if(!me)return json({error:"Authentication required"},401);
 const auth=me.auth,u=new URL(req.url),action=safe(u.searchParams.get("action"),50);
 const roles=Array.isArray(me?.app_metadata?.roles)?me.app_metadata.roles:[];
 const admin=me?.app_metadata?.allegro_admin===true||me?.app_metadata?.role==="allegro_admin"||roles.includes("allegro_admin");
 try{
  if(req.method==="GET"&&action==="dashboard"){
   const queries=[
    call("allegro_artists?"+new URLSearchParams({select:"*",owner_id:"eq."+me.id,order:"updated_at.desc"}),auth),
    call("allegro_releases?"+new URLSearchParams({select:"*",owner_id:"eq."+me.id,order:"updated_at.desc"}),auth),
    call("allegro_tracks?"+new URLSearchParams({select:"*",owner_id:"eq."+me.id,order:"updated_at.desc"}),auth),
    call("allegro_playlists?"+new URLSearchParams({select:"*",owner_id:"eq."+me.id,order:"updated_at.desc"}),auth),
    call("allegro_creator_wallets?"+new URLSearchParams({select:"*",user_id:"eq."+me.id,order:"currency.asc"}),auth),
    call("allegro_royalty_ledger?"+new URLSearchParams({select:"*",order:"created_at.desc",limit:"100"}),auth)
   ];
   const [artists,releases,tracks,playlists,wallets,royalties]=await Promise.all(queries);
   await funnel("creator_authenticated",me,{metadata:{portal:"creator"}});
   return json({ok:true,user:{id:me.id,email:me.email,admin},artists,releases,tracks,playlists,wallets,royalties});
  }
  if(req.method==="GET"&&action==="admin_review_queue"){
   if(!admin)return json({error:"ALLEGRO admin role required"},403);
   const queue=await service("allegro_moderation_queue?"+new URLSearchParams({select:"*",status:"eq.pending",order:"submitted_at.asc",limit:"100"}));
   const out=[];
   for(const item of (queue||[])){
    let entity=null,rights=[];
    if(item.entity_type==="track"){
     entity=one(await service("allegro_tracks?"+new URLSearchParams({select:"*",id:"eq."+item.entity_id,limit:"1"})));
     if(entity){
      rights=await service("allegro_track_rights?"+new URLSearchParams({select:"*",track_id:"eq."+item.entity_id,order:"right_type.asc"}));
      entity.artist=one(await service("allegro_artists?"+new URLSearchParams({select:"id,stage_name,slug,status",id:"eq."+entity.artist_id,limit:"1"})));
      if(entity.release_id)entity.release=one(await service("allegro_releases?"+new URLSearchParams({select:"id,title,release_type,status",id:"eq."+entity.release_id,limit:"1"})));
     }
    }
    out.push({...item,entity,rights});
   }
   return json({ok:true,queue:out});
  }
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const b=await req.json().catch(()=>({}));
  if(action==="admin_decide"){
   if(!admin)return json({error:"ALLEGRO admin role required"},403);
   const moderationId=safe(b.moderation_id,60),decision=safe(b.decision,40),notes=safe(b.notes,2000);
   if(!moderationId||!["approved","changes_requested","rejected"].includes(decision))return json({error:"Valid moderation_id and decision required"},400);
   const mq=one(await service("allegro_moderation_queue?"+new URLSearchParams({select:"*",id:"eq."+moderationId,status:"eq.pending",limit:"1"})));
   if(!mq)return json({error:"Pending moderation item not found"},404);
   if(mq.entity_type!=="track")return json({error:"Only track moderation is enabled in this release"},409);
   const tr=one(await service("allegro_tracks?"+new URLSearchParams({select:"*",id:"eq."+mq.entity_id,limit:"1"})));
   if(!tr)return json({error:"Track not found"},404);
   const rights=await service("allegro_track_rights?"+new URLSearchParams({select:"right_type,share_bps,claimant_name,territory,status",track_id:"eq."+tr.id}));
   const master=(rights||[]).filter(r=>r.right_type==="master").reduce((s,r)=>s+Number(r.share_bps||0),0);
   if(decision==="approved"){
    if(!tr.audio_object_path)return json({error:"Cannot approve without an uploaded master"},409);
    if(master!==10000)return json({error:"Cannot approve until master-right shares total 100%",master_share_bps:master},409);
    await service("allegro_tracks?"+new URLSearchParams({id:"eq."+tr.id}),{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({status:"published",streaming_enabled:true,rights_confirmed:true})});
    await service("allegro_artists?"+new URLSearchParams({id:"eq."+tr.artist_id}),{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({status:"published"})});
    if(tr.release_id)await service("allegro_releases?"+new URLSearchParams({id:"eq."+tr.release_id}),{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({status:"published"})});
   }else{
    await service("allegro_tracks?"+new URLSearchParams({id:"eq."+tr.id}),{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({status:"draft",streaming_enabled:false,rights_confirmed:false})});
   }
   await service("allegro_moderation_queue?"+new URLSearchParams({id:"eq."+moderationId}),{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({status:decision,reviewer_notes:notes||null,reviewed_at:new Date().toISOString(),reviewed_by:me.id})});
   await service("allegro_moderation_audit",{method:"POST",headers:{prefer:"return=minimal"},body:JSON.stringify({moderation_id:moderationId,entity_type:"track",entity_id:tr.id,reviewer_id:me.id,decision,notes:notes||null,evidence:{audio_master_present:Boolean(tr.audio_object_path),master_share_bps:master,rights_count:(rights||[]).length}})});
   await funnel("moderation_"+decision,me,{artist_id:tr.artist_id,track_id:tr.id,metadata:{moderation_id:moderationId}});
   return json({ok:true,decision,track_id:tr.id,published:decision==="approved"});
  }
  if(action==="create_artist"){
   const stage=safe(b.stage_name,120);if(!stage)return json({error:"Stage name required"},400);
   const existing=await call("allegro_artists?"+new URLSearchParams({select:"id,slug",owner_id:"eq."+me.id,limit:"1"}),auth);
   if(existing?.length)return json({error:"This account already has an artist profile",artist:existing[0]},409);
   let slug=slugify(stage);
   const ck=await fetch(BASE+"/functions/v1/allegro-music-api?action=artist&slug="+encodeURIComponent(slug));
   if(ck.status===200)slug+="-"+crypto.randomUUID().slice(0,6);
   const rows=await call("allegro_artists",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({owner_id:me.id,stage_name:stage,slug,bio:safe(b.bio,2000)||null,country_code:safe(b.country_code,8)||null,city:safe(b.city,100)||null,status:"draft"})},auth);
   await service("allegro_creator_wallets?on_conflict=user_id,currency",{method:"POST",headers:{prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:me.id,currency:"ZAR"})});
   const created=one(rows);await funnel("artist_profile_created",me,{artist_id:created?.id||null,metadata:{stage_name:stage}});
   return json({ok:true,artist:created},201);
  }
  if(action==="create_release"){
   const artistId=safe(b.artist_id,60),title=safe(b.title,200);if(!artistId||!title)return json({error:"artist_id and title required"},400);
   const ar=await call("allegro_artists?"+new URLSearchParams({select:"id",id:"eq."+artistId,limit:"1"}),auth);if(!ar?.length)return json({error:"Artist not found or not owned by you"},403);
   const type=["single","ep","album","live","compilation"].includes(b.release_type)?b.release_type:"single";
   const rows=await call("allegro_releases",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({artist_id:artistId,owner_id:me.id,title,release_type:type,release_date:b.release_date||null,copyright_line:safe(b.copyright_line,250)||null,explicit:Boolean(b.explicit),status:"draft"})},auth);
   return json({ok:true,release:one(rows)},201);
  }
  if(action==="create_track"){
   const artistId=safe(b.artist_id,60),releaseId=safe(b.release_id,60),title=safe(b.title,200);if(!artistId||!title)return json({error:"artist_id and title required"},400);
   const ar=await call("allegro_artists?"+new URLSearchParams({select:"id",id:"eq."+artistId,limit:"1"}),auth);if(!ar?.length)return json({error:"Artist not found or not owned by you"},403);
   if(releaseId){const rr=await call("allegro_releases?"+new URLSearchParams({select:"id",id:"eq."+releaseId,limit:"1"}),auth);if(!rr?.length)return json({error:"Release not found or not owned by you"},403)}
   const genres=Array.isArray(b.genre_tags)?b.genre_tags.map(x=>safe(x,60)).filter(Boolean).slice(0,12):[];
   const rows=await call("allegro_tracks",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({artist_id:artistId,release_id:releaseId||null,owner_id:me.id,title,track_number:Number(b.track_number)||null,disc_number:Math.max(1,Number(b.disc_number)||1),duration_ms:Number.isFinite(Number(b.duration_ms))?Math.max(0,Number(b.duration_ms)):null,isrc:safe(b.isrc,40)||null,genre_tags:genres,explicit:Boolean(b.explicit),audio_kind:"uploaded",rights_confirmed:false,streaming_enabled:false,status:"draft"})},auth);
   const created=one(rows);await funnel("track_created",me,{artist_id:artistId,track_id:created?.id||null,metadata:{title}});
   return json({ok:true,track:created},201);
  }
  if(action==="add_right"){
   const trackId=safe(b.track_id,60),rt=["master","composition","publishing","performer","other"].includes(b.right_type)?b.right_type:null,claimant=safe(b.claimant_name,180),share=Math.round(Number(b.share_bps));
   if(!trackId||!rt||!claimant||!Number.isFinite(share)||share<0||share>10000)return json({error:"Valid track_id, right_type, claimant_name and share_bps required"},400);
   const tr=await call("allegro_tracks?"+new URLSearchParams({select:"id",id:"eq."+trackId,limit:"1"}),auth);if(!tr?.length)return json({error:"Track not found or not owned by you"},403);
   const rows=await call("allegro_track_rights",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({track_id:trackId,owner_id:me.id,right_type:rt,claimant_name:claimant,share_bps:share,territory:safe(b.territory,30)||"WORLD",status:"pending"})},auth);
   return json({ok:true,right:one(rows)},201);
  }
  if(action==="request_review"){
   const id=safe(b.track_id,60);const tr=await call("allegro_tracks?"+new URLSearchParams({select:"id,status,audio_object_path",id:"eq."+id,limit:"1"}),auth);if(!tr?.length)return json({error:"Track not found or not owned by you"},403);
   if(!tr[0].audio_object_path)return json({error:"Upload audio before review"},409);
   const rights=await call("allegro_track_rights?"+new URLSearchParams({select:"right_type,share_bps",track_id:"eq."+id}),auth);
   const master=(rights||[]).filter(r=>r.right_type==="master").reduce((s,r)=>s+Number(r.share_bps||0),0);if(master!==10000)return json({error:"Master-right shares must total 100% before review",master_share_bps:master},409);
   const rows=await call("allegro_tracks?"+new URLSearchParams({id:"eq."+id}),auth,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify({status:"review"})});
   await service("allegro_moderation_queue",{method:"POST",headers:{prefer:"return=minimal"},body:JSON.stringify({entity_type:"track",entity_id:id,submitted_by:me.id,status:"pending",reason:"Creator submitted track for rights and streaming review"})});
   await funnel("track_submitted_for_review",me,{track_id:id,metadata:{master_share_bps:master}});
   return json({ok:true,track:one(rows),moderation:"queued"});
  }
  if(action==="create_playlist"){
   const title=safe(b.title,160);if(!title)return json({error:"Playlist title required"},400);
   const visibility=["private","unlisted","public"].includes(b.visibility)?b.visibility:"private";
   const rows=await call("allegro_playlists",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({owner_id:me.id,title,description:safe(b.description,1000)||null,visibility})},auth);
   return json({ok:true,playlist:one(rows)},201);
  }
  if(action==="add_playlist_track"){
   const pid=safe(b.playlist_id,60),tid=safe(b.track_id,60),position=Math.max(1,Number(b.position)||1);if(!pid||!tid)return json({error:"playlist_id and track_id required"},400);
   const rows=await call("allegro_playlist_tracks",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify({playlist_id:pid,track_id:tid,position,added_by:me.id})},auth);return json({ok:true,item:one(rows)},201);
  }
  if(action==="save_track"||action==="follow_artist"){
   const isTrack=action==="save_track",table=isTrack?"allegro_library_tracks":"allegro_artist_follows",payload=isTrack?{user_id:me.id,track_id:safe(b.track_id,60)}:{user_id:me.id,artist_id:safe(b.artist_id,60)};
   if(!(payload.track_id||payload.artist_id))return json({error:isTrack?"track_id required":"artist_id required"},400);
   await call(table,{method:"POST",headers:{prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)},auth);return json({ok:true});
  }
  if(action==="remove_saved_track"||action==="unfollow_artist"){
   const isTrack=action==="remove_saved_track",table=isTrack?"allegro_library_tracks":"allegro_artist_follows",col=isTrack?"track_id":"artist_id",val=safe(isTrack?b.track_id:b.artist_id,60);
   await call(table+"?"+new URLSearchParams({user_id:"eq."+me.id,[col]:"eq."+val}),auth,{method:"DELETE",headers:{prefer:"return=minimal"}});return json({ok:true});
  }
  if(action==="upload_target"){
   const kind=safe(b.kind,20),original=fileName(safe(b.filename,180));if(!original)return json({error:"filename required"},400);
   const bucket=kind==="cover"?"allegro-covers":kind==="audio"?"allegro-audio":null;if(!bucket)return json({error:"kind must be cover or audio"},400);
   const path=me.id+"/"+new Date().toISOString().slice(0,10)+"/"+crypto.randomUUID()+"-"+original;
   const projectRef=new URL(BASE).hostname.split(".")[0];
   return json({ok:true,bucket,path,upload:{mode:kind==="audio"?"tus_resumable":"standard",standard_url:BASE+"/storage/v1/object/"+bucket+"/"+path.split("/").map(encodeURIComponent).join("/"),tus_url:"https://"+projectRef+".storage.supabase.co/storage/v1/upload/resumable",metadata:{bucketName:bucket,objectName:path}}});
  }
  if(action==="attach_cover"){
   const path=safe(b.path,500),entity=safe(b.entity,20),id=safe(b.id,60);if(!path.startsWith(me.id+"/"))return json({error:"Invalid object path"},400);
   const map={artist:["allegro_artists","avatar_object_path"],release:["allegro_releases","cover_object_path"],playlist:["allegro_playlists","cover_object_path"]};const m=map[entity];if(!m)return json({error:"Unsupported entity"},400);
   const rows=await call(m[0]+"?"+new URLSearchParams({id:"eq."+id}),auth,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify({[m[1]]:path})});return json({ok:true,item:one(rows)});
  }
  if(action==="attach_audio"){
   const path=safe(b.path,500),id=safe(b.track_id,60);if(!path.startsWith(me.id+"/"))return json({error:"Invalid object path"},400);
   const rows=await call("allegro_tracks?"+new URLSearchParams({id:"eq."+id}),auth,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify({audio_object_path:path,audio_kind:"uploaded"})});return json({ok:true,track:one(rows)});
  }
  return json({error:"Unknown action"},404);
 }catch(e){console.error(e);return json({error:"Creator service error",detail:String(e?.message||e).slice(0,180)},500)}
});