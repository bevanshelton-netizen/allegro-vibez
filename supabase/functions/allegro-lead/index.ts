const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const allowedOrigins=new Set([
  "https://allegro-vibez.vercel.app",
  "https://allegro-vibez-bevan2.vercel.app",
  "https://yfawrenhudjomhnglfhq.supabase.co",
  "https://allegro.izakhonoafrica.co.za"
]);
function cors(origin:string|null){
  const allow=origin&&allowedOrigins.has(origin)?origin:"https://allegro-vibez.vercel.app";
  return {
    "access-control-allow-origin":allow,
    "access-control-allow-headers":"content-type",
    "access-control-allow-methods":"POST, OPTIONS",
    "vary":"Origin",
    "content-type":"application/json",
    "x-content-type-options":"nosniff"
  };
}
function str(v:unknown,max=3000){return String(v??"").trim().slice(0,max)}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  const headers=cors(origin);
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});
  if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"Origin not allowed"}),{status:403,headers});
  const len=Number(req.headers.get("content-length")||0);
  if(len>32768)return new Response(JSON.stringify({error:"Submission too large"}),{status:413,headers});
  try{
    const type=req.headers.get("content-type")||"";
    let raw:Record<string,string>={};
    if(type.includes("application/x-www-form-urlencoded")){
      const body=await req.text();
      if(body.length>32768)throw new Error("Submission too large");
      const p=new URLSearchParams(body);
      for(const [k,v] of p.entries()) if(Object.keys(raw).length<60) raw[str(k,80)]=str(v,3000);
    }else if(type.includes("application/json")){
      const b=await req.json();
      if(!b||typeof b!=="object"||Array.isArray(b))throw new Error("Invalid payload");
      for(const [k,v] of Object.entries(b)) if(Object.keys(raw).length<60) raw[str(k,80)]=str(v,3000);
    }else{
      return new Response(JSON.stringify({error:"Unsupported content type"}),{status:415,headers});
    }

    const formName=str(raw["form-name"]||raw.form_name,80);
    const allowed=new Set(["allegro-revenue-desk","allegro-artist-interest","allegro-artist-booking"]);
    if(!allowed.has(formName))return new Response(JSON.stringify({error:"Unknown form"}),{status:400,headers});

    // Honeypot spam receives a neutral success response without persistence.
    if(str(raw["bot-field"],200))return new Response(JSON.stringify({ok:true}),{status:202,headers});

    const email=str(raw.email||raw.contact_email,320);
    if(email&&(!email.includes("@")||email.length>320))return new Response(JSON.stringify({error:"Invalid email"}),{status:400,headers});

    const contactName=str(raw.name||raw.contact_name||raw.artist_name||raw.company_name,180);
    const phone=str(raw.phone||raw.contact_phone,80);
    if(formName==="allegro-artist-interest"){
      if(!email&&!phone)return new Response(JSON.stringify({error:"Email or phone is required"}),{status:400,headers});
      if(str(raw.consent_contact,20)!=="yes")return new Response(JSON.stringify({error:"Contact consent is required"}),{status:400,headers});
    }
    const sourceUrl=str(req.headers.get("referer"),1000);
    const userAgent=str(req.headers.get("user-agent"),500);

    const insert=await fetch(SUPABASE_URL+"/rest/v1/allegro_gateway_leads",{
      method:"POST",
      headers:{
        apikey:SERVICE,
        authorization:"Bearer "+SERVICE,
        "content-type":"application/json",
        prefer:"return=representation"
      },
      body:JSON.stringify({
        form_name:formName,
        contact_name:contactName||null,
        email:email||null,
        phone:phone||null,
        payload:raw,
        source_url:sourceUrl||null,
        user_agent:userAgent||null,
        status:"new"
      })
    });
    const data=await insert.json().catch(()=>null);
    if(!insert.ok)throw new Error("Lead persistence failed");
    if(formName==="allegro-artist-interest"){
      await fetch(SUPABASE_URL+"/rest/v1/allegro_funnel_events",{
        method:"POST",
        headers:{apikey:SERVICE,authorization:"Bearer "+SERVICE,"content-type":"application/json",prefer:"return=minimal"},
        body:JSON.stringify({event_name:"artist_interest_captured",source:"allegro-lead",metadata:{lead_id:data?.[0]?.id||null,source_url:sourceUrl||null,campaign:str(raw.utm_campaign,120)||null,genre:str(raw.genre,120)||null}})
      }).catch(()=>null);
    }
    return new Response(JSON.stringify({ok:true,id:data?.[0]?.id||null}),{status:201,headers});
  }catch(e){
    return new Response(JSON.stringify({error:e instanceof Error?e.message:"Submission failed"}),{status:500,headers});
  }
});