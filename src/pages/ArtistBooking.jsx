import { useCallback,useEffect,useMemo,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import {
  createArtistBookingRequest,
  getArtistBookingRequests,
  getArtistBookingSettings,
  quoteArtistBooking,
  saveArtistBookingSettings,
  setArtistBookingStatus,
} from '../lib/creatorWorkflow'
import '../styles/artist-launch.css'

const yesNo=[['','Select an option'],['true','Yes'],['false','No']]
const defaultTypes=['Live performance','Festival','Corporate event','Private event','Club / venue','Livestream']

function boolValue(value){return value===''?'':value==='true'}
function money(value,currency='ZAR'){return value==null?'—':currency+' '+Number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}

async function netlifyFallback(payload){
  const body=new URLSearchParams({'form-name':'allegro-artist-booking',...Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,Array.isArray(value)?value.join(', '):String(value??'')]))})
  const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})
  if(!response.ok)throw new Error('Booking request could not be delivered.')
}

export function ArtistBookingRequest(){
  const{artistId}=useParams()
  const[profile,setProfile]=useState(null)
  const[settings,setSettings]=useState(null)
  const[loading,setLoading]=useState(true)
  const[state,setState]=useState('idle')
  const[message,setMessage]=useState('')
  const[requestCode,setRequestCode]=useState('')
  const[form,setForm]=useState({
    company_name:'',contact_name:'',contact_email:'',contact_phone:'',preferred_contact:'email',
    performance_type:'Live performance',performance_other:'',event_date:'',event_time:'',event_visibility:'public',
    venue_name:'',venue_address:'',city:'',country:'South Africa',event_description:'',expected_audience:'',
    proposed_budget:'',budget_currency:'ZAR',backline_provided:'',flights_hotel_provided:'',
    ground_transport_provided:'',visa_support_required:false,livestream_rights_requested:false,
    recording_rights_requested:false,merchandise_opportunity:false,special_requests:'',privacy_consent:false
  })

  useEffect(()=>{let active=true;(async()=>{
    if(!supabase){setLoading(false);return}
    const[{data:p},bookingSettings]=await Promise.all([
      supabase.from('profiles').select('id,display_name,stage_name,country,city,press_headline,bio,available_for_international_bookings,booking_regions').eq('id',artistId).maybeSingle(),
      getArtistBookingSettings(artistId).catch(()=>null)
    ])
    if(active){setProfile(p||null);setSettings(bookingSettings);setLoading(false)}
  })();return()=>{active=false}},[artistId])

  function set(key,value){setForm(current=>({...current,[key]:value}))}

  async function submit(e){
    e.preventDefault();setState('saving');setMessage('')
    const payload={...form,
      backline_provided:boolValue(form.backline_provided),
      flights_hotel_provided:boolValue(form.flights_hotel_provided),
      ground_transport_provided:boolValue(form.ground_transport_provided)
    }
    try{
      if(supabase){
        const result=await createArtistBookingRequest(artistId,payload)
        setRequestCode(result?.request_code||result?.[0]?.request_code||'')
      }else{
        await netlifyFallback({artist_id:artistId,artist_name:profile?.stage_name||profile?.display_name||'',...payload})
      }
      setState('done')
      setMessage('Your request has been received. This is an enquiry, not a confirmed booking. No payment has been taken.')
    }catch(error){
      try{
        await netlifyFallback({artist_id:artistId,artist_name:profile?.stage_name||profile?.display_name||'',...payload})
        setState('done');setMessage('Your request has been received for manual routing. This is an enquiry, not a confirmed booking. No payment has been taken.')
      }catch{
        setState('error');setMessage(error.message||'Could not submit this booking request.')
      }
    }
  }

  if(loading)return <main className="page"><div className="empty">Loading booking desk…</div></main>
  if(!profile)return <main className="page"><div className="eyebrow">ALLEGRO ARTIST BOOKINGS</div><h2>Artist not available</h2><Link to="/artists">Browse artists</Link></main>
  if(settings?.booking_enabled===false)return <main className="page"><div className="eyebrow">ALLEGRO ARTIST BOOKINGS</div><h2>Bookings currently closed</h2><p>This artist is not accepting new performance enquiries right now.</p><Link to={'/artist/'+artistId}>Back to artist space</Link></main>

  const name=profile.stage_name||profile.display_name||'ALLEGRO Artist'
  const types=settings?.performance_types?.length?settings.performance_types:defaultTypes

  if(state==='done')return <main className="booking-page"><section className="booking-success"><div className="eyebrow">REQUEST RECEIVED</div><h1>Thank you.</h1>{requestCode&&<strong className="booking-code">{requestCode}</strong>}<p>{message}</p><p>The artist or authorised representative can now qualify the event, issue a quote and move it through the ALLEGRO booking workflow.</p><Link className="primary inline" to={'/artist/'+artistId}>Return to {name}</Link></section></main>

  return <main className="booking-page">
    <section className="booking-hero">
      <div className="eyebrow">ALLEGRO ARTIST BOOKING ENGINE™</div>
      <h1>Book <em>{name}</em></h1>
      <p>{profile.press_headline||profile.bio||'Submit a professional live-performance booking request.'}</p>
      <div className="booking-trust-row">
        <span>Direct artist routing</span><span>Transparent quote</span><span>10% ALLEGRO platform share</span><span>No payment taken at enquiry</span>
      </div>
    </section>
    <form className="booking-form" onSubmit={submit}>
      <div className="booking-form-head"><div><div className="eyebrow">BOOKING REQUEST</div><h2>Tell us about the engagement</h2></div><p>Required fields are marked *. A request does not reserve the date until the artist confirms it.</p></div>

      <fieldset><legend>Contact information</legend>
        <div className="form-grid"><label>Name / Company / Organisation *<input value={form.company_name} onChange={e=>set('company_name',e.target.value)} required maxLength="180"/></label><label>Contact person *<input value={form.contact_name} onChange={e=>set('contact_name',e.target.value)} required maxLength="180"/></label></div>
        <div className="form-grid"><label>Email address *<input type="email" value={form.contact_email} onChange={e=>set('contact_email',e.target.value)} required/></label><label>Cell / WhatsApp *<input value={form.contact_phone} onChange={e=>set('contact_phone',e.target.value)} required maxLength="60"/></label></div>
        <label>Preferred contact<select value={form.preferred_contact} onChange={e=>set('preferred_contact',e.target.value)}><option value="email">Email</option><option value="phone">Phone call</option><option value="text">Text message</option><option value="whatsapp">WhatsApp</option></select></label>
      </fieldset>

      <fieldset><legend>Event details</legend>
        <label>Type of performance *<select value={form.performance_type} onChange={e=>set('performance_type',e.target.value)}>{types.map(type=><option key={type}>{type}</option>)}<option>Other</option></select></label>
        {form.performance_type==='Other'&&<label>Please explain *<input value={form.performance_other} onChange={e=>set('performance_other',e.target.value)} required maxLength="1000"/></label>}
        <div className="form-grid"><label>Date of event *<input type="date" value={form.event_date} onChange={e=>set('event_date',e.target.value)} min={new Date().toISOString().slice(0,10)} required/></label><label>Event / show time<input type="time" value={form.event_time} onChange={e=>set('event_time',e.target.value)}/></label></div>
        <label>Public or private event?<select value={form.event_visibility} onChange={e=>set('event_visibility',e.target.value)}><option value="public">Public</option><option value="private">Private</option></select></label>
        <div className="form-grid"><label>Venue name<input value={form.venue_name} onChange={e=>set('venue_name',e.target.value)} maxLength="180"/></label><label>City<input value={form.city} onChange={e=>set('city',e.target.value)} maxLength="120"/></label></div>
        <label>Venue address *<input value={form.venue_address} onChange={e=>set('venue_address',e.target.value)} required maxLength="500"/></label>
        <label>Country *<input value={form.country} onChange={e=>set('country',e.target.value)} required maxLength="120"/></label>
        <label>Description of event *<textarea rows="5" value={form.event_description} onChange={e=>set('event_description',e.target.value)} required minLength="10" maxLength="3000" placeholder="Audience, event purpose, programme, other performers and anything the artist should know."/></label>
        <div className="form-grid"><label>Expected audience<input type="number" min="0" value={form.expected_audience} onChange={e=>set('expected_audience',e.target.value)}/></label><label>Proposed budget<div className="money-input"><select value={form.budget_currency} onChange={e=>set('budget_currency',e.target.value)}><option>ZAR</option><option>USD</option><option>EUR</option><option>GBP</option></select><input type="number" min="0" step="0.01" value={form.proposed_budget} onChange={e=>set('proposed_budget',e.target.value)}/></div></label></div>
      </fieldset>

      <fieldset><legend>Artist questions</legend>
        <label>Will you provide backline, sound system and necessary equipment? *<select value={form.backline_provided} onChange={e=>set('backline_provided',e.target.value)} required>{yesNo.map(([v,l])=><option key={l} value={v}>{l}</option>)}</select></label>
        <label>Are flights and hotel accommodations provided? *<select value={form.flights_hotel_provided} onChange={e=>set('flights_hotel_provided',e.target.value)} required>{yesNo.map(([v,l])=><option key={l} value={v}>{l}</option>)}</select></label>
        <label>Will ground transportation be provided for the artist and crew? *<select value={form.ground_transport_provided} onChange={e=>set('ground_transport_provided',e.target.value)} required>{yesNo.map(([v,l])=><option key={l} value={v}>{l}</option>)}</select></label>
        <div className="booking-checks">
          <label><input type="checkbox" checked={form.visa_support_required} onChange={e=>set('visa_support_required',e.target.checked)}/>Visa / permit support required</label>
          <label><input type="checkbox" checked={form.livestream_rights_requested} onChange={e=>set('livestream_rights_requested',e.target.checked)}/>Livestream rights requested</label>
          <label><input type="checkbox" checked={form.recording_rights_requested} onChange={e=>set('recording_rights_requested',e.target.checked)}/>Recording / broadcast rights requested</label>
          <label><input type="checkbox" checked={form.merchandise_opportunity} onChange={e=>set('merchandise_opportunity',e.target.checked)}/>Artist merchandise opportunity available</label>
        </div>
        <label>Special requests / additional information<textarea rows="4" value={form.special_requests} onChange={e=>set('special_requests',e.target.value)} maxLength="3000"/></label>
      </fieldset>

      {settings?.minimum_fee!=null&&<div className="booking-commercial-note"><strong>Artist booking guide</strong><span>Minimum engagement from {money(settings.minimum_fee,settings.base_currency||'ZAR')}</span><span>Typical set {settings.default_set_minutes||60} min</span></div>}
      <label className="consent"><input type="checkbox" checked={form.privacy_consent} onChange={e=>set('privacy_consent',e.target.checked)} required/><span>I consent to ALLEGRO sharing these details with the artist and authorised representatives for this booking enquiry. I understand this is not a confirmed booking and no payment is taken by submitting this form.</span></label>
      {message&&<div className="notice">{message}</div>}
      <button className="booking-submit" disabled={state==='saving'}>{state==='saving'?'Sending request…':'REQUEST BOOKING'}</button>
    </form>
  </main>
}

export function ArtistBookingDesk({session}){
  const[settings,setSettings]=useState({booking_enabled:true,base_currency:'ZAR',minimum_fee:'',deposit_percent:50,default_set_minutes:60,performance_types:defaultTypes.join(', '),travel_policy:'',rider_summary:'',quote_valid_days:7})
  const[requests,setRequests]=useState([])
  const[loading,setLoading]=useState(true)
  const[message,setMessage]=useState('')
  const[quotes,setQuotes]=useState({})

  const load=useCallback(async()=>{
    if(!session){setLoading(false);return}
    setLoading(true)
    try{
      const[s,r]=await Promise.all([getArtistBookingSettings(session.user.id),getArtistBookingRequests(session.user.id)])
      if(s)setSettings({
        booking_enabled:s.booking_enabled,base_currency:s.base_currency||'ZAR',minimum_fee:s.minimum_fee??'',
        deposit_percent:s.deposit_percent??50,default_set_minutes:s.default_set_minutes??60,
        performance_types:(s.performance_types||defaultTypes).join(', '),travel_policy:s.travel_policy||'',
        rider_summary:s.rider_summary||'',quote_valid_days:s.quote_valid_days??7
      })
      setRequests(r)
    }catch(error){setMessage(error.message||'Booking desk is not available yet.')}finally{setLoading(false)}
  },[session])
  useEffect(()=>{load()},[load])

  async function saveSettings(e){
    e.preventDefault();setMessage('')
    try{await saveArtistBookingSettings(session.user.id,settings);setMessage('Booking settings saved.')}catch(error){setMessage(error.message||'Could not save booking settings.')}
  }
  async function quote(row){
    const amount=Number(quotes[row.id]||row.quoted_gross_amount||0)
    if(!amount){setMessage('Enter a quote amount first.');return}
    try{await quoteArtistBooking(row.id,amount,settings.base_currency||'ZAR',Number(settings.deposit_percent||50));setMessage('Quote recorded. No payment has been collected.');await load()}catch(error){setMessage(error.message||'Could not create quote.')}
  }
  async function move(row,status){
    try{await setArtistBookingStatus(row.id,status);setMessage('Booking moved to '+status+'.');await load()}catch(error){setMessage(error.message||'Could not update booking.')}
  }

  if(!session)return <main className="page"><div className="eyebrow">ALLEGRO BOOKING DESK</div><h2>Log in to manage bookings</h2><Link className="primary inline" to="/login">Log in</Link></main>

  return <main className="booking-desk">
    <section className="booking-desk-head"><div><div className="eyebrow">ALLEGRO ARTIST BOOKING ENGINE™</div><h1>Booking Desk</h1><p>Qualify enquiries, quote transparently, confirm engagements and keep the commercial trail in one place.</p></div><Link className="secondary inline" to={'/artist/'+session.user.id}>View my public artist space</Link></section>
    <div className="booking-payment-gate"><strong>PAYMENT GATE</strong><span>Quote and deposit amounts are calculated now. Deposit collection stays off until an approved payment gateway is verified and connected.</span></div>
    {message&&<div className="notice booking-notice">{message}</div>}
    <section className="booking-settings">
      <div><div className="eyebrow">ARTIST CONTROLS</div><h2>Your booking rules</h2></div>
      <form onSubmit={saveSettings}>
        <label className="consent"><input type="checkbox" checked={settings.booking_enabled} onChange={e=>setSettings(s=>({...s,booking_enabled:e.target.checked}))}/><span>Accept new booking enquiries</span></label>
        <div className="form-grid"><label>Base currency<select value={settings.base_currency} onChange={e=>setSettings(s=>({...s,base_currency:e.target.value}))}><option>ZAR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Minimum booking fee<input type="number" min="0" step="0.01" value={settings.minimum_fee} onChange={e=>setSettings(s=>({...s,minimum_fee:e.target.value}))}/></label></div>
        <div className="form-grid"><label>Standard deposit %<input type="number" min="0" max="100" value={settings.deposit_percent} onChange={e=>setSettings(s=>({...s,deposit_percent:e.target.value}))}/></label><label>Typical set length (min)<input type="number" min="10" max="360" value={settings.default_set_minutes} onChange={e=>setSettings(s=>({...s,default_set_minutes:e.target.value}))}/></label></div>
        <label>Performance types<input value={settings.performance_types} onChange={e=>setSettings(s=>({...s,performance_types:e.target.value}))} placeholder="Live performance, Festival, Corporate event"/></label>
        <label>Travel policy<textarea rows="3" value={settings.travel_policy} onChange={e=>setSettings(s=>({...s,travel_policy:e.target.value}))}/></label>
        <label>Rider summary<textarea rows="3" value={settings.rider_summary} onChange={e=>setSettings(s=>({...s,rider_summary:e.target.value}))}/></label>
        <button className="primary">Save booking rules</button>
      </form>
    </section>

    <section className="booking-inbox"><div className="section-heading"><h2>Booking pipeline</h2><span>{requests.length} enquiries</span></div>
      {loading?<div className="empty">Loading bookings…</div>:requests.length?requests.map(row=><article className="booking-request-card" key={row.id}>
        <div className="booking-request-top"><div><div className="eyebrow">{row.request_code}</div><h3>{row.company_name} · {row.performance_type}</h3><p>{row.event_date} {row.event_time||''} · {row.city||row.country} · {row.event_visibility}</p></div><span className={'booking-stage stage-'+row.status}>{row.status.replace('_',' ')}</span></div>
        <div className="booking-request-grid">
          <div><strong>Promoter</strong><span>{row.contact_name}</span><a href={'mailto:'+row.contact_email}>{row.contact_email}</a><a href={'tel:'+row.contact_phone}>{row.contact_phone}</a></div>
          <div><strong>Venue</strong><span>{row.venue_name||'Venue not named'}</span><span>{row.venue_address}</span></div>
          <div><strong>Logistics</strong><span>Backline: {row.backline_provided===true?'Yes':row.backline_provided===false?'No':'—'}</span><span>Flights/hotel: {row.flights_hotel_provided===true?'Yes':row.flights_hotel_provided===false?'No':'—'}</span><span>Ground transport: {row.ground_transport_provided===true?'Yes':row.ground_transport_provided===false?'No':'—'}</span></div>
          <div><strong>Budget</strong><span>{money(row.proposed_budget,row.budget_currency)}</span>{row.expected_audience!=null&&<span>{row.expected_audience} expected audience</span>}</div>
        </div>
        <p className="booking-description">{row.event_description}</p>
        {(row.livestream_rights_requested||row.recording_rights_requested||row.merchandise_opportunity)&&<div className="booking-flags">{row.livestream_rights_requested&&<span>Livestream rights</span>}{row.recording_rights_requested&&<span>Recording rights</span>}{row.merchandise_opportunity&&<span>Merch opportunity</span>}</div>}
        {row.quoted_gross_amount!=null?<div className="booking-split"><span><small>Client quote</small><strong>{money(row.quoted_gross_amount,row.quote_currency)}</strong></span><span><small>ALLEGRO {Number(row.platform_fee_bps||1000)/100}%</small><strong>{money(row.platform_fee_amount,row.quote_currency)}</strong></span><span><small>Artist net</small><strong>{money(row.creator_net_amount,row.quote_currency)}</strong></span><span><small>Deposit target</small><strong>{money(row.deposit_amount,row.quote_currency)}</strong></span></div>:<div className="booking-quote-box"><label>Quote amount ({settings.base_currency})<input type="number" min="0" step="0.01" value={quotes[row.id]||''} onChange={e=>setQuotes(q=>({...q,[row.id]:e.target.value}))}/></label><button type="button" onClick={()=>quote(row)}>Create transparent quote</button></div>}
        <div className="booking-actions">
          {row.status==='new'&&<button onClick={()=>move(row,'qualified')}>Qualify</button>}
          {['qualified','quoted','negotiating'].includes(row.status)&&<button onClick={()=>move(row,'negotiating')}>Negotiating</button>}
          {['quoted','negotiating','deposit_due'].includes(row.status)&&<button onClick={()=>move(row,'confirmed')}>Confirm booking</button>}
          {row.status==='confirmed'&&<button onClick={()=>move(row,'completed')}>Mark completed</button>}
          {!['completed','declined','cancelled'].includes(row.status)&&<button className="danger-button" onClick={()=>move(row,'declined')}>Decline</button>}
        </div>
      </article>):<div className="empty">No booking enquiries yet. Your public artist page will route new requests here.</div>}
    </section>
  </main>
}
