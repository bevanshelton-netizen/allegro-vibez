import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/musician-marketplace.css'

const GENRES=['Amapiano','Afrobeats','Afro House','Afro Pop','Blues','Choral','Classical','Country','Electronic','Folk','Gospel','Gqom','Hip-Hop','House','Isicathamiya','Jazz','Kwaito','Maskandi','Pop','R&B','Reggae','Rock','Soul','Traditional','World','Other']
const ROLES=['Singer / vocalist','Lead guitarist','Rhythm guitarist','Bass guitarist','Drummer','Keyboard / piano','Percussionist','DJ','Producer','Songwriter','Rapper / MC','Choir singer','Backing vocalist','Violinist / strings','Brass / wind','Sound engineer','Band / group','Other']
const TYPES=['collaboration','band_member','session_work','gig','tour','recording','songwriting','production','choir','other']

function money(value,currency='ZAR'){if(value==null)return 'Open to offers';try{return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(value))}catch{return currency+' '+Number(value).toFixed(2)}}
function Badge({children,tone='neutral'}){return <span className={'market-badge market-badge-'+tone}>{children}</span>}

export default function MusicianMarketplace({session}){
  const[ads,setAds]=useState([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[message,setMessage]=useState('')
  const[vetting,setVetting]=useState(null)
  const[genre,setGenre]=useState('')
  const[role,setRole]=useState('')
  const[place,setPlace]=useState('')
  const[remoteOnly,setRemoteOnly]=useState(false)
  const[showPost,setShowPost]=useState(false)
  const[saving,setSaving]=useState(false)
  const[form,setForm]=useState({title:'',description:'',posterRole:'Singer / vocalist',lookingFor:[],genres:[],country:'South Africa',city:'',remoteOk:false,engagementType:'collaboration',compensation:'negotiable',budgetAmount:'',budgetCurrency:'ZAR',auditionRequired:false})

  async function load(){
    if(!supabase){setLoading(false);return}
    setLoading(true);setError('')
    const{data,error:e}=await supabase.from('musician_ads').select('id,owner_id,title,description,poster_role,looking_for,genres,country,city,remote_ok,engagement_type,compensation,budget_amount,budget_currency,audition_required,created_at,expires_at').eq('status','published').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100)
    if(e)setError(e.message)
    setAds(data||[])
    if(session?.user?.id){
      const{data:v}=await supabase.from('musician_vetting').select('status,verification_level,identity_checked,contact_checked,profile_checked,references_checked,organisation_checked,expires_at').eq('user_id',session.user.id).maybeSingle()
      setVetting(v||null)
    } else setVetting(null)
    setLoading(false)
  }

  useEffect(()=>{load()},[session?.user?.id])
  const vetted=vetting?.status==='approved'&&(!vetting.expires_at||new Date(vetting.expires_at)>new Date())
  const filtered=useMemo(()=>ads.filter(ad=>{
    if(genre&&!(ad.genres||[]).includes(genre))return false
    if(role&&!(ad.looking_for||[]).includes(role))return false
    if(place&&!((ad.city||'')+' '+(ad.country||'')).toLowerCase().includes(place.toLowerCase()))return false
    if(remoteOnly&&!ad.remote_ok)return false
    return true
  }),[ads,genre,role,place,remoteOnly])

  function toggle(key,value){setForm(current=>({...current,[key]:current[key].includes(value)?current[key].filter(x=>x!==value):[...current[key],value]}))}

  async function requestVetting(){
    if(!session){setMessage('Log in or create an ALLEGRO account first.');return}
    setSaving(true);setMessage('')
    const{error:e}=await supabase.from('musician_vetting').insert({user_id:session.user.id,status:'pending',verification_level:'basic',safety_declaration_accepted:true})
    setSaving(false)
    if(e){setMessage(e.code==='23505'?'A verification request already exists for this account.':e.message);return}
    setMessage('Verification request received. ALLEGRO will complete identity, contact and creator-profile checks through the secure review process.')
    load()
  }

  async function createAd(e){
    e.preventDefault()
    if(!vetted){setMessage('Only approved, vetted accounts can publish musician adverts.');return}
    if(!form.lookingFor.length||!form.genres.length){setMessage('Choose at least one role and one genre.');return}
    setSaving(true);setMessage('')
    const{error:e2}=await supabase.from('musician_ads').insert({
      owner_id:session.user.id,title:form.title.trim(),description:form.description.trim(),poster_role:form.posterRole,
      looking_for:form.lookingFor,genres:form.genres,country:form.country.trim()||null,city:form.city.trim()||null,
      remote_ok:form.remoteOk,engagement_type:form.engagementType,compensation:form.compensation,
      budget_amount:form.budgetAmount?Number(form.budgetAmount):null,budget_currency:form.budgetCurrency,
      audition_required:form.auditionRequired,status:'published'
    })
    setSaving(false)
    if(e2){setMessage(e2.message);return}
    setMessage('Advert published. Personal contact details remain private; responses stay inside ALLEGRO.')
    setShowPost(false);setForm({...form,title:'',description:'',lookingFor:[],genres:[],city:'',budgetAmount:''});load()
  }

  async function respond(ad){
    if(!session){setMessage('Log in to respond safely through ALLEGRO.');return}
    if(!vetted){setMessage('Responses are limited to vetted accounts. Request verification first.');return}
    const intro=window.prompt('Write a short introduction (minimum 20 characters). Do not include banking details, passwords or ID numbers.')
    if(!intro)return
    if(intro.trim().length<20){setMessage('Your introduction must be at least 20 characters.');return}
    const portfolio=window.prompt('Optional: add a public portfolio or music link. Leave blank if none.')||''
    const amount=window.prompt('Optional: proposed fee in '+(ad.budget_currency||'ZAR')+'. Leave blank to discuss later.')||''
    const{error:e}=await supabase.from('musician_ad_responses').insert({ad_id:ad.id,applicant_id:session.user.id,message:intro.trim(),portfolio_url:portfolio.trim()||null,proposed_amount:amount?Number(amount):null,proposed_currency:ad.budget_currency||'ZAR'})
    setMessage(e?(e.code==='23505'?'You have already responded to this advert.':e.message):'Response sent privately through ALLEGRO.')
  }

  async function report(ad){
    if(!session){setMessage('Log in to report a safety concern.');return}
    const reason=window.prompt('Brief reason for the report.')
    if(!reason)return
    const details=window.prompt('Please describe what happened. Do not post sensitive identity documents here.')
    if(!details)return
    const{error:e}=await supabase.from('musician_safety_reports').insert({reporter_id:session.user.id,ad_id:ad.id,reported_user_id:ad.owner_id,reason:reason.trim(),details:details.trim()})
    setMessage(e?e.message:'Safety report submitted for review.')
  }

  return <main className="page musician-market">
    <div className="eyebrow">ALLEGRO INTERNAL MARKETPLACE</div>
    <h2>Find musicians. Hire talent. Keep the deal inside ALLEGRO.</h2>
    <p className="market-lead">Search singers, musicians, bands, producers and session players by genre, role and location. Vetted users can advertise, respond and move a paid engagement through ALLEGRO with a transparent 10% platform fee.</p>

    <section className="market-money-strip">
      <div><strong>100%</strong><span>Agreed marketplace price</span></div>
      <div><strong>10%</strong><span>ALLEGRO platform fee</span></div>
      <div><strong>90%</strong><span>Creator / service-provider net</span></div>
    </section>

    <section className="market-safety panel">
      <div><div className="eyebrow">SAFETY GATE</div><h3>Vetting is mandatory before participation.</h3><p>People may browse the marketplace publicly, but posting, responding and paid work are restricted to approved accounts. Direct personal contact details stay off the public board and safety reports remain traceable.</p></div>
      <div className="market-checks"><Badge tone="good">Identity check</Badge><Badge tone="good">Contact verification</Badge><Badge tone="good">Creator profile review</Badge><Badge tone="good">Reference / portfolio checks</Badge><Badge tone="good">Organisation check where needed</Badge></div>
    </section>

    <section className="market-toolbar">
      <select value={genre} onChange={e=>setGenre(e.target.value)}><option value="">All genres</option>{GENRES.map(g=><option key={g}>{g}</option>)}</select>
      <select value={role} onChange={e=>setRole(e.target.value)}><option value="">All roles needed</option>{ROLES.map(r=><option key={r}>{r}</option>)}</select>
      <input value={place} onChange={e=>setPlace(e.target.value)} placeholder="City or country"/>
      <label className="market-toggle"><input type="checkbox" checked={remoteOnly} onChange={e=>setRemoteOnly(e.target.checked)}/> Remote / online only</label>
    </section>

    <section className="market-actions panel">
      <div><strong>{session?(vetted?'Vetted account ready to participate.':'Vetting status: '+(vetting?.status||'not requested')):'Browse freely. Log in to post or respond.'}</strong><p>Payments should be routed through ALLEGRO so the agreed gross, 10% fee and 90% creator net are recorded before settlement.</p></div>
      <div className="actions">{!session?<><Link className="primary" to="/login">Log in</Link><Link className="secondary" to="/register">Create account</Link></>:!vetted?<button className="primary" onClick={requestVetting} disabled={saving||Boolean(vetting)}>{vetting?'Verification in progress':'Request verification'}</button>:<button className="primary" onClick={()=>setShowPost(v=>!v)}>{showPost?'Close form':'Post musician advert'}</button>}</div>
    </section>

    {message&&<div className="notice">{message}</div>}
    {error&&<div className="notice">{error}</div>}

    {showPost&&vetted&&<form className="panel market-form" onSubmit={createAd}>
      <div className="eyebrow">CREATE A VETTED ADVERT</div>
      <label>Advert title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} minLength="5" maxLength="140" required placeholder="Gospel band looking for keyboard player"/></label>
      <label>Tell musicians what you need<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} minLength="20" maxLength="3000" rows="6" required/></label>
      <div className="market-form-grid">
        <label>I am a<select value={form.posterRole} onChange={e=>setForm({...form,posterRole:e.target.value})}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></label>
        <label>Engagement<select value={form.engagementType} onChange={e=>setForm({...form,engagementType:e.target.value})}>{TYPES.map(t=><option value={t} key={t}>{t.replaceAll('_',' ')}</option>)}</select></label>
        <label>Compensation<select value={form.compensation} onChange={e=>setForm({...form,compensation:e.target.value})}><option value="paid">Paid</option><option value="negotiable">Negotiable</option><option value="royalty_split">Royalty split</option><option value="expenses_only">Expenses only</option><option value="unpaid">Unpaid / voluntary</option></select></label>
        <label>Budget<div className="money-input"><select value={form.budgetCurrency} onChange={e=>setForm({...form,budgetCurrency:e.target.value})}><option>ZAR</option><option>USD</option><option>EUR</option><option>GBP</option></select><input type="number" min="0" step="0.01" value={form.budgetAmount} onChange={e=>setForm({...form,budgetAmount:e.target.value})} placeholder="Optional"/></div></label>
        <label>City<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
        <label>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label>
      </div>
      <div><strong>Looking for</strong><div className="market-chip-grid">{ROLES.map(r=><button type="button" key={r} className={form.lookingFor.includes(r)?'selected':''} onClick={()=>toggle('lookingFor',r)}>{r}</button>)}</div></div>
      <div><strong>Genres</strong><div className="market-chip-grid">{GENRES.map(g=><button type="button" key={g} className={form.genres.includes(g)?'selected':''} onClick={()=>toggle('genres',g)}>{g}</button>)}</div></div>
      <label className="market-toggle"><input type="checkbox" checked={form.remoteOk} onChange={e=>setForm({...form,remoteOk:e.target.checked})}/> Remote / online collaboration accepted</label>
      <label className="market-toggle"><input type="checkbox" checked={form.auditionRequired} onChange={e=>setForm({...form,auditionRequired:e.target.checked})}/> Audition / sample required</label>
      <button className="primary" disabled={saving}>{saving?'Publishing…':'Publish vetted advert'}</button>
    </form>}

    <div className="market-results-head"><h3>{loading?'Loading marketplace…':filtered.length+' active opportunities'}</h3><span>All paid marketplace engagements: 10% ALLEGRO / 90% provider</span></div>
    <section className="market-grid">
      {filtered.map(ad=><article className="market-card" key={ad.id}>
        <div className="market-card-top"><div><div className="eyebrow">{ad.engagement_type.replaceAll('_',' ')}</div><h3>{ad.title}</h3></div><Badge tone="good">VETTED POSTER</Badge></div>
        <p>{ad.description}</p>
        <div className="market-meta"><span>{ad.poster_role}</span><span>{(ad.city||ad.remote_ok?'Remote':'')}{ad.city&&ad.country?' · ':''}{ad.city||''}{ad.country?' · '+ad.country:''}</span><span>{money(ad.budget_amount,ad.budget_currency)}</span></div>
        <div className="market-tags">{(ad.genres||[]).map(g=><span key={g}>{g}</span>)}{(ad.looking_for||[]).slice(0,4).map(r=><span key={r}>{r}</span>)}</div>
        <div className="market-fee-preview">{ad.budget_amount?<><span>Gross {money(ad.budget_amount,ad.budget_currency)}</span><span>ALLEGRO fee {money(Number(ad.budget_amount)*.10,ad.budget_currency)}</span><strong>Provider net {money(Number(ad.budget_amount)*.90,ad.budget_currency)}</strong></>:<span>Final fee split shown before a paid engagement is accepted.</span>}</div>
        <div className="actions"><button className="primary" onClick={()=>respond(ad)} disabled={session?.user?.id===ad.owner_id}>Respond inside ALLEGRO</button><button className="text-button danger" onClick={()=>report(ad)}>Report concern</button></div>
      </article>)}
      {!loading&&!filtered.length&&<div className="empty">No opportunities match these filters yet. Vetted creators can publish the first one.</div>}
    </section>

    <section className="market-rules panel">
      <div className="eyebrow">MARKETPLACE RULES</div>
      <h3>Keep the opportunity, agreement and payment trail on-platform.</h3>
      <ul><li>Do not publish ID numbers, home addresses, banking credentials or passwords.</li><li>Meet first in public/professional spaces or verified studios/venues where practical.</li><li>Paid work should be accepted through an ALLEGRO marketplace order so the 10% fee and 90% provider balance are recorded.</li><li>ALLEGRO can suspend marketplace access when safety, fraud or identity concerns are under review.</li><li>A marketplace payment hold is not described as escrow unless a legally appropriate provider is actually connected.</li></ul>
    </section>
  </main>
}
