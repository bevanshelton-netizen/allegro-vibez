
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const H={apikey:SERVICE,authorization:"Bearer "+SERVICE};
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const safe=(s)=>String(s??"").slice(0,4000);
async function rows(){
 const r=await fetch(BASE+"/rest/v1/allegro_studio_campaign_posts?select=platform,headline,copy,cta,landing_url,status&order=platform.asc",{headers:H});
 return r.ok?await r.json():[];
}
async function rotation(){
 const r=await fetch(BASE+"/rest/v1/allegro_artist_campaign_rotation?campaign_code=eq.founding-artists&select=rotation_date,day_number,angle,headline,body_copy,cta,asset_kind,landing_url,status&order=rotation_date.asc",{headers:H});
 return r.ok?await r.json():[];
}
async function funnel(){
 const [l,u,a,t,m,ap]=await Promise.all([
  fetch(BASE+"/rest/v1/allegro_gateway_leads?form_name=eq.allegro-artist-interest&select=id",{headers:{...H,prefer:"count=exact"}}),
  fetch(BASE+"/rest/v1/allegro_funnel_events?event_name=eq.creator_authenticated&select=id",{headers:{...H,prefer:"count=exact"}}),
  fetch(BASE+"/rest/v1/allegro_artists?owner_id=not.is.null&select=id",{headers:{...H,prefer:"count=exact"}}),
  fetch(BASE+"/rest/v1/allegro_tracks?owner_id=not.is.null&select=id",{headers:{...H,prefer:"count=exact"}}),
  fetch(BASE+"/rest/v1/allegro_moderation_queue?status=eq.pending&select=id",{headers:{...H,prefer:"count=exact"}}),
  fetch(BASE+"/rest/v1/allegro_moderation_queue?status=eq.approved&select=id",{headers:{...H,prefer:"count=exact"}})
 ]);
 const count=r=>Number(r.headers.get("content-range")?.split("/")?.[1]||0);
 return {interest:count(l),authenticated:count(u),artists:count(a),tracks:count(t),pending:count(m),approved:count(ap)};
}
async function opsSnapshot(){
 const r=await fetch(BASE+"/rest/v1/allegro_ops_snapshots?select=*&order=captured_at.desc&limit=1",{headers:H});
 return r.ok?await r.json():[];
}
async function opsAlerts(){
 const r=await fetch(BASE+"/rest/v1/allegro_ops_alerts?select=created_at,message,current_state&order=created_at.desc&limit=5",{headers:H});
 return r.ok?await r.json():[];
}
Deno.serve(async(req)=>{
 if(req.method!=="GET"&&req.method!=="HEAD")return new Response("Method not allowed",{status:405});
 const [items,rotationRows,metrics,snapRows,alertRows]=await Promise.all([rows(),rotation(),funnel(),opsSnapshot(),opsAlerts()]);
 const snap=snapRows?.[0]||{};
 const genuineArtists=Math.max(0,Number(snap.artists||0)-1);
 const genuineTracks=Math.max(0,Number(snap.tracks||0)-1);
 const genuinePlays=Math.max(0,Number(snap.play_events||0)-1);
 const opsHtml='<div class="grid">'+
   '<article class="card"><div class="platform">AUTH USERS</div><h3>'+Number(snap.auth_users||0)+'</h3><p class="copy">Authenticated listener/creator accounts</p></article>'+
   '<article class="card"><div class="platform">GENUINE ARTISTS</div><h3>'+genuineArtists+'</h3><p class="copy">Artist profiles beyond seeded ALLEGRO Sound Lab</p></article>'+
   '<article class="card"><div class="platform">GENUINE TRACKS</div><h3>'+genuineTracks+'</h3><p class="copy">Tracks beyond the seeded demo</p></article>'+
   '<article class="card"><div class="platform">IN REVIEW</div><h3>'+Number(snap.tracks_in_review||0)+'</h3><p class="copy">Tracks currently awaiting review</p></article>'+
   '<article class="card"><div class="platform">PENDING MODERATION</div><h3>'+Number(snap.pending_reviews||0)+'</h3><p class="copy">Rights/moderation items waiting</p></article>'+
   '<article class="card"><div class="platform">GENUINE PLAYS</div><h3>'+genuinePlays+'</h3><p class="copy">Play events beyond verification traffic</p></article>'+
 '</div>';
 const alertHtml=(alertRows||[]).map(a=>'<article class="card"><div class="platform">GROWTH SIGNAL</div><h3>'+esc(a.message)+'</h3><p class="copy">'+esc(a.created_at)+'</p></article>').join("")||'<div class="note">No genuine creator-growth alerts yet. The owned monitor checks hourly.</div>';
 const cards=items.map((x,i)=>`
 <article class="card">
  <div class="topline"><span class="platform">${esc(x.platform)}</span><span class="status">${esc(x.status)}</span></div>
  <h3>${esc(x.headline)}</h3>
  <p class="copy" id="copy-${i}">${esc(x.copy)}</p>
  <div class="link" id="link-${i}">${esc(x.landing_url)}</div>
  <div class="actions">
   <button onclick="copyText('copy-${i}')">COPY CAPTION</button>
   <button onclick="copyText('link-${i}')">COPY LINK</button>
   <button onclick="sharePost(${i})">SHARE</button>
   <a href="${esc(x.landing_url)}" target="_blank" rel="noopener">TEST LINK</a>
   <a href="#" data-platform="${esc(x.platform)}" onclick="openPlatform(event,this.dataset.platform)">OPEN PLATFORM</a>
  </div>
 </article>`).join("");
 const payload=JSON.stringify(items.map(x=>({platform:safe(x.platform),headline:safe(x.headline),copy:safe(x.copy),cta:safe(x.cta),landing_url:safe(x.landing_url)})));
 const rotationHtml=rotationRows.map(x=>'<article class="card"><div class="topline"><span class="platform">DAY '+x.day_number+' · '+esc(x.rotation_date)+'</span><span class="status">'+esc(x.status)+'</span></div><h3>'+esc(x.headline)+'</h3><p class="copy">'+esc(x.body_copy)+'</p><div class="link">'+esc(x.angle)+' · '+esc(x.asset_kind)+'</div><div class="actions"><a href="'+esc(x.landing_url)+'" target="_blank" rel="noopener">'+esc(x.cta)+'</a></div></article>').join("");
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <title>ALLEGRO Founding Artists Launch Desk</title><meta name="theme-color" content="#070a12">
 <style>
 :root{--bg:#070a12;--panel:#101624;--line:#29364d;--text:#f7f8fb;--muted:#aab5c9;--gold:#f0be58;--cyan:#45ead4;--violet:#8d70ff}
 *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 88% -5%,#28194c,transparent 32%),radial-gradient(circle at 5% 10%,#0b332d,transparent 30%),var(--bg);color:var(--text)}.wrap{width:min(1180px,92vw);margin:auto}
 header{border-bottom:1px solid #ffffff14;background:#070a12e8;backdrop-filter:blur(16px);position:sticky;top:0;z-index:10}.head{height:70px;display:flex;align-items:center;gap:14px}.brand{font-weight:1000;letter-spacing:.08em}.brand b{color:var(--gold)}.badge{margin-left:auto;font-size:.7rem;border:1px solid #2e6c51;background:#15382a;color:#baffdf;padding:7px 10px;border-radius:999px}
 main{padding:44px 0 80px}.eyebrow{color:var(--cyan);font-size:.72rem;letter-spacing:.17em;font-weight:950}.hero{display:grid;grid-template-columns:.85fr 1.15fr;gap:26px;align-items:center}.hero h1{font-size:clamp(50px,7vw,86px);line-height:.88;letter-spacing:-.055em;margin:12px 0 18px}.lead{color:#c5cedd;line-height:1.6}.btn{display:inline-block;border-radius:999px;padding:11px 15px;font-weight:900;border:1px solid #3a4760;background:#151c2d;color:white;text-decoration:none;cursor:pointer}.btn.primary{border:0;background:linear-gradient(135deg,var(--gold),#ffdc8c);color:#111}.row{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}
 .poster{background:linear-gradient(145deg,#111827,#091019);border:1px solid #ffffff18;border-radius:28px;padding:12px;box-shadow:0 30px 90px #0008}.poster svg{display:block;width:100%;height:auto;border-radius:20px}
 .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:30px}.card{background:#101624;border:1px solid var(--line);border-radius:20px;padding:18px}.topline{display:flex;justify-content:space-between;gap:10px}.platform{text-transform:uppercase;font-weight:950;color:var(--cyan);letter-spacing:.08em;font-size:.72rem}.status{font-size:.65rem;background:#173728;color:#baffdf;padding:5px 8px;border-radius:999px;font-weight:900;text-transform:uppercase}.card h3{font-size:1.2rem;margin:11px 0}.copy{white-space:pre-wrap;color:#d1d7e2;line-height:1.5}.link{font-size:.78rem;color:#93a1b7;word-break:break-all;background:#090e18;border:1px solid #273348;border-radius:9px;padding:9px}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.actions button,.actions a{border:1px solid #35435d;background:#151c2d;color:#fff;border-radius:999px;padding:8px 11px;font-size:.76rem;font-weight:900;text-decoration:none;cursor:pointer}
 .note{margin-top:26px;background:#171d2b;border:1px solid #3b4961;border-left:4px solid var(--gold);padding:14px 16px;border-radius:13px;color:#c5cedd;line-height:1.55}.score{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:24px 0}.metric{background:#101624;border:1px solid var(--line);border-radius:16px;padding:14px}.metric strong{display:block;font-size:1.7rem;color:var(--gold)}.metric span{font-size:.72rem;color:var(--muted)}.leadform{margin-top:20px;background:#101624;border:1px solid var(--line);border-radius:20px;padding:18px}.leadform .fields{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.leadform input{width:100%;background:#090e18;color:white;border:1px solid #35435d;border-radius:10px;padding:11px}.consent{display:flex;gap:8px;align-items:flex-start;color:var(--muted);font-size:.8rem;margin:10px 0}.consent input{width:auto;margin-top:3px}.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#111827;border:1px solid #344157;padding:10px 14px;border-radius:999px;display:none}
 @media(max-width:850px){.hero,.grid,.leadform .fields{grid-template-columns:1fr}.score{grid-template-columns:repeat(2,1fr)}.badge{display:none}}
 </style></head><body>
 <header><div class="wrap head"><div class="brand"><b>ALLEGRO</b> FOUNDING ARTISTS LAUNCH DESK</div><div class="badge">● CAMPAIGN READY</div></div></header>
 <main class="wrap"><section class="hero"><div><div class="eyebrow">ARTIST ACQUISITION CAMPAIGN</div><h1>Find the artists.<br>Grow the catalogue.</h1><p class="lead">Everything on this page is built to recruit ALLEGRO’s founding artists. Use the share buttons immediately, or connect official publishing accounts in IZAKHONO Social Command for direct automation.</p><div class="row"><a class="btn primary" href="https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/allegro-creator-portal">OPEN CREATOR PORTAL</a><a class="btn" href="https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/social-command-app">OPEN SOCIAL COMMAND</a></div><div class="leadform"><div class="eyebrow">QUICK CAPTURE</div><h3 style="margin:8px 0">Musician interested, but not ready to upload?</h3><div class="fields"><input id="liName" placeholder="Artist / stage name"><input id="liEmail" type="email" placeholder="Email"><input id="liPhone" placeholder="Phone / WhatsApp"><input id="liGenre" placeholder="Genre / sound"></div><label class="consent"><input id="liConsent" type="checkbox">I agree that ALLEGRO may contact me about the Founding Artists programme.</label><button class="btn primary" id="liSubmit">JOIN FOUNDING ARTISTS LIST</button><div id="liMsg" style="margin-top:8px;color:#9cf4d2;font-size:.85rem"></div></div></div>
 <div class="poster"><svg viewBox="0 0 1200 675" role="img" aria-label="ALLEGRO Founding Artists Wanted">
 <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080d16"/><stop offset=".55" stop-color="#13213a"/><stop offset="1" stop-color="#0a2b25"/></linearGradient><linearGradient id="acc" x1="0" x2="1"><stop stop-color="#f0be58"/><stop offset=".5" stop-color="#45ead4"/><stop offset="1" stop-color="#8d70ff"/></linearGradient><radialGradient id="vin"><stop stop-color="#f0be58"/><stop offset=".15" stop-color="#151515"/><stop offset=".2" stop-color="#292929"/><stop offset="1" stop-color="#050505"/></radialGradient></defs>
 <rect width="1200" height="675" rx="32" fill="url(#bg)"/><path d="M0 520c170-90 300 60 470-20s310-50 480 10 170-10 250-30" fill="none" stroke="#45ead4" stroke-width="5" opacity=".35"/>
 <text x="62" y="82" fill="#45ead4" font-size="28" font-weight="900" letter-spacing="4">ALLEGRO VIBEZ</text><text x="62" y="182" fill="#fff" font-size="77" font-weight="1000">FOUNDING ARTISTS</text><text x="62" y="260" fill="#f0be58" font-size="77" font-weight="1000">WANTED.</text><text x="62" y="316" fill="#d6dce8" font-size="28">Your music. Your profile. Your creator journey.</text>
 <g transform="translate(60 380)"><rect width="500" height="188" rx="22" fill="#09101a" stroke="#364761"/><circle cx="115" cy="95" r="70" fill="url(#vin)"/><circle cx="115" cy="95" r="18" fill="#f0be58"/><path d="M207 44q65 20 27 105" fill="none" stroke="#d8dee8" stroke-width="8" stroke-linecap="round"/><g stroke="#2c3d55" stroke-width="10" stroke-linecap="round"><path d="M300 55v90"/><path d="M340 35v110"/><path d="M380 70v75"/><path d="M420 45v100"/><path d="M460 65v80"/></g><g fill="#45ead4"><circle cx="300" cy="93" r="9"/><circle cx="340" cy="82" r="9"/><circle cx="380" cy="107" r="9"/><circle cx="420" cy="79" r="9"/><circle cx="460" cy="101" r="9"/></g></g>
 <g transform="translate(650 120)"><rect width="455" height="390" rx="26" fill="#0b111b" stroke="#3b4962"/><rect x="55" y="48" width="160" height="155" rx="18" fill="#10151e" stroke="#f0be58"/><circle cx="135" cy="103" r="43" fill="#070707" stroke="#f0be58" stroke-width="7"/><circle cx="135" cy="168" r="23" fill="#0b0b0b" stroke="#45ead4" stroke-width="5"/><rect x="240" y="55" width="170" height="122" rx="14" fill="#111c2d"/><path d="M258 110c22-35 42 30 65-4s37 25 64-2" fill="none" stroke="#45ead4" stroke-width="7"/><rect x="54" y="245" width="350" height="95" rx="16" fill="#141d2d"/><g stroke="#485972" stroke-width="8"><path d="M85 267v52M125 252v67M165 275v44M205 260v59M245 272v47M285 255v64M325 278v41M365 262v57"/></g><rect x="273" y="193" width="80" height="36" rx="12" fill="#f0be58"/><text x="313" y="217" text-anchor="middle" fill="#111" font-size="19" font-weight="900">ON AIR</text></g>
 <text x="62" y="625" fill="#fff" font-size="27" font-weight="800">Upload • Rights • Releases • Discovery • Radio • Studios • Opportunity</text></svg></div></section>
 <section><div class="eyebrow" style="margin-top:36px">OPERATIONS PULSE</div>${opsHtml}<div class="eyebrow" style="margin-top:36px">CONVERSION SCORECARD</div><div class="score"><div class="metric"><strong>${metrics.interest}</strong><span>INTEREST LEADS</span></div><div class="metric"><strong>${metrics.authenticated}</strong><span>AUTHENTICATED</span></div><div class="metric"><strong>${metrics.artists}</strong><span>ARTIST PROFILES</span></div><div class="metric"><strong>${metrics.tracks}</strong><span>CREATOR TRACKS</span></div><div class="metric"><strong>${metrics.pending}</strong><span>IN REVIEW</span></div><div class="metric"><strong>${metrics.approved}</strong><span>APPROVED</span></div></div><div class="eyebrow" style="margin-top:36px">RECENT GROWTH SIGNALS</div><div class="grid">${alertHtml}</div><div class="eyebrow" style="margin-top:36px">7-DAY ROTATION</div><div class="grid">${rotationHtml}</div><div class="eyebrow" style="margin-top:36px">PLATFORM CAPTIONS</div><div class="grid">${cards}</div><div class="note"><strong>Publishing status:</strong> these campaign assets are ready for immediate manual distribution. Automatic posting activates only after each network’s official developer credentials and publishing permissions are connected in Social Command.</div></section></main>
 <div class="toast" id="toast">Copied</div>
 <script>
 const posts=${payload};
 const homes={facebook:"https://www.facebook.com/",instagram:"https://www.instagram.com/",tiktok:"https://www.tiktok.com/",linkedin:"https://www.linkedin.com/feed/",x:"https://x.com/compose/post",threads:"https://www.threads.net/",pinterest:"https://www.pinterest.com/",whatsapp:"https://web.whatsapp.com/"};
 function toast(t){const x=document.getElementById("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",1400)}
 async function copyText(id){try{await navigator.clipboard.writeText(document.getElementById(id).textContent.trim());toast("Copied")}catch{toast("Copy failed")}}
 function openPlatform(e,p){e.preventDefault();window.open(homes[p]||"https://www.google.com/","_blank","noopener")}
 document.getElementById("liSubmit").onclick=async()=>{const m=document.getElementById("liMsg");try{if(!document.getElementById("liConsent").checked)throw new Error("Please consent to contact first.");const q=new URLSearchParams(location.search);const payload={"form-name":"allegro-artist-interest","bot-field":"","artist_name":document.getElementById("liName").value.trim(),"email":document.getElementById("liEmail").value.trim(),"phone":document.getElementById("liPhone").value.trim(),"genre":document.getElementById("liGenre").value.trim(),"consent_contact":"yes","utm_source":q.get("utm_source")||"campaign_launch","utm_medium":q.get("utm_medium")||"owned","utm_campaign":q.get("utm_campaign")||"allegro_founding_artists"};const r=await fetch("https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/allegro-lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Could not save interest.");m.textContent="Captured. Welcome to the Founding Artists list.";document.getElementById("liSubmit").disabled=true}catch(e){m.style.color="#ff9f9f";m.textContent=e.message}}
 async function sharePost(i){const p=posts[i];const data={title:p.headline,text:p.copy,url:p.landing_url};try{if(navigator.share){await navigator.share(data)}else{await navigator.clipboard.writeText(p.copy+"\n\n"+p.landing_url);toast("Caption + link copied")}}catch{}}
 </script></body></html>`;
 return new Response(req.method==="HEAD"?null:html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=60","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin"}});
});