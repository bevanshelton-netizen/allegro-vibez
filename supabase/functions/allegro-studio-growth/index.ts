
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=(()=>{try{const x=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");if(x.default)return x.default}catch{}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""})();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
const emailOk=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:cors});
function hex(buffer){return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha(value){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))}
async function ownerAccess(token){
 const hash=await sha(clean(token,240));
 const rows=await db("allegro_studio_owner_keys?select=token_hash,active&token_hash=eq."+encodeURIComponent(hash)+"&active=eq.true&limit=1");
 if(!rows?.[0])throw new Error("Owner access denied.");
}
async function db(path,method="GET",body){
 const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{method,headers:{apikey:SERVICE,authorization:"Bearer "+SERVICE,"Content-Type":"application/json",Prefer:"return=representation"},body:body?JSON.stringify(body):undefined});
 const t=await r.text(); let d=null; try{d=t?JSON.parse(t):null}catch{d=t}
 if(!r.ok)throw new Error(typeof d==="object"?(d?.message||JSON.stringify(d)):String(d)); return d;
}
function refCode(){const b=crypto.getRandomValues(new Uint8Array(5));return "ASR-"+[...b].map(x=>x.toString(36).padStart(2,"0")).join("").toUpperCase().slice(0,10)}
const offers={
 "VOCAL999":{label:"Founding Vocal Starter",audience:"artist"},
 "POD1650":{label:"Podcast Launch Session",audience:"podcaster"},
 "CREATOR4200":{label:"Creator Half-Day",audience:"creator"},
 "PARTNER":{label:"Partner / Organisation",audience:"partner"},
 "FOUNDING100":{label:"Founding Creator Club",audience:"creator"},
 "PODMONTHLY":{label:"Podcast Monthly",audience:"podcaster"},
 "SCHOOLPARTNER":{label:"School / Academy Partner",audience:"school"},
 "CHOIRPARTNER":{label:"Choir / Church Partner",audience:"choir"},
 "BRANDMEDIA":{label:"Brand Media Partner",audience:"business"}
};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST only"},405);
 try{
  if(!SERVICE)return json({error:"Growth backend unavailable"},503);
  const b=await req.json(); const action=clean(b.action||"lead",30);
  if(clean(b.website,80))return json({ok:true,ignored:true});
  if(action==="lead"){
    const name=clean(b.name,180),mobile=clean(b.mobile,60),email=clean(b.email,180).toLowerCase(),audience=clean(b.audience,60),source=clean(b.source||"studio-growth",120),offer=clean(b.offer_code,40).toUpperCase(),message=clean(b.message,1500),referral=clean(b.referral_code,40).toUpperCase();
    if(!name||(!mobile&&!email)||!emailOk(email)||!audience)return json({error:"Add your name, audience and at least one contact method."},400);
    if(offer&&!(offer in offers))return json({error:"Unknown offer code."},400);
    if(offer==="FOUNDING100"){
      const existing=await db("allegro_studio_offer_redemptions?select=id&offer_code=eq.FOUNDING100&status=in.(reserved,applied)&limit=100");
      if((existing||[]).length>=100)return json({error:"The first 100 Founding Creator Club places have been reserved. Join the general creator list instead."},409);
    }
    if(referral){const refs=await db("allegro_studio_referrals?select=id,referral_code&referral_code=eq."+encodeURIComponent(referral)+"&status=eq.active&limit=1");if(!refs?.[0])return json({error:"Referral code not found."},400)}
    const rows=await db("allegro_studio_growth_leads","POST",{name,mobile:mobile||null,email:email||null,audience,source,offer_code:offer||null,message:message||null,status:"new"});
    const lead=rows?.[0];
    if(offer)await db("allegro_studio_offer_redemptions","POST",{offer_code:offer,referral_code:referral||null,lead_id:lead.id,status:"reserved"});
    return json({ok:true,lead_id:lead.id,offer:offer?offers[offer]:null,message:"Thanks. Your studio enquiry is in the growth desk."});
  }
  if(action==="referral_join"){
    const name=clean(b.referrer_name,180),contact=clean(b.referrer_contact,180),type=clean(b.referrer_type||"client",40);
    if(!name||!contact)return json({error:"Name and contact are required."},400);
    let code=refCode(),created=null;
    for(let i=0;i<3;i++){try{const rows=await db("allegro_studio_referrals","POST",{referral_code:code,referrer_name:name,referrer_contact:contact,referrer_type:type,status:"active",reward_cents:15000});created=rows?.[0];break}catch(e){if(String(e.message||e).includes("referral_code"))code=refCode();else throw e}}
    if(!created)throw new Error("Could not create referral code.");
    return json({ok:true,referral_code:code,reward_cents:created.reward_cents,message:"Referral code created. Credit applies after a referred paid session is completed."});
  }
  if(action==="owner_pipeline"){
    await ownerAccess(b.owner_token);
    const [leads,refs,redemptions,clicks,bookings]=await Promise.all([
      db("allegro_studio_growth_leads?select=*&order=created_at.desc&limit=100"),
      db("allegro_studio_referrals?select=*&order=created_at.desc&limit=100"),
      db("allegro_studio_offer_redemptions?select=*&order=created_at.desc&limit=100"),
      db("allegro_studio_campaign_clicks?select=id,source,created_at&order=created_at.desc&limit=5000"),
      db("allegro_studio_bookings?select=id,status,payment_status,created_at&order=created_at.desc&limit=1000")
    ]);
    const newLeads=(leads||[]).filter(x=>x.status==="new").length;
    const booked=(leads||[]).filter(x=>["booked","won"].includes(x.status)).length;
    const paid=(bookings||[]).filter(x=>x.payment_status==="paid").length;
    const clickCount=(clicks||[]).length,leadCount=(leads||[]).length;
    const clickToLead=clickCount?Math.round((leadCount/clickCount)*1000)/10:0;
    const leadToBooked=leadCount?Math.round((booked/leadCount)*1000)/10:0;
    return json({ok:true,summary:{clicks:clickCount,leads:leadCount,new_leads:newLeads,booked_or_won:booked,paid_bookings:paid,referrers:(refs||[]).length,redemptions:(redemptions||[]).length,click_to_lead_pct:clickToLead,lead_to_booked_pct:leadToBooked},leads:leads||[],referrals:refs||[],redemptions:redemptions||[]});
  }
  if(action==="owner_update_lead"){
    await ownerAccess(b.owner_token);
    const id=clean(b.lead_id,80),status=clean(b.status,30);
    if(!["new","contacted","qualified","booked","won","lost"].includes(status))return json({error:"Invalid lead status."},400);
    const patch={status};
    if(b.next_follow_up_at!==undefined)patch.next_follow_up_at=b.next_follow_up_at||null;
    if(b.owner_note!==undefined)patch.owner_note=clean(b.owner_note,1500)||null;
    if(status==="contacted"){
      patch.last_contacted_at=new Date().toISOString();
      const existing=await db("allegro_studio_growth_leads?select=follow_up_count&id=eq."+encodeURIComponent(id)+"&limit=1");
      patch.follow_up_count=Number(existing?.[0]?.follow_up_count||0)+1;
    }
    const rows=await db("allegro_studio_growth_leads?id=eq."+encodeURIComponent(id),"PATCH",patch);
    if(!rows?.[0])return json({error:"Lead not found."},404);
    return json({ok:true,lead:rows[0]});
  }
  return json({error:"Unsupported action"},400);
 }catch(e){return json({error:e?.message||"Growth request failed"},500)}
});