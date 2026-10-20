import { useEffect,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getArtistBookingRequestById, getArtistBookingSettings } from '../lib/creatorWorkflow'
import { bookingContractRequirements, bookingSettlementGate, creatorBookingQuotePreview } from '../lib/creatorOsBridge'
import '../styles/artist-launch.css'

function moneyMinor(value,currency='ZAR'){
  return currency+' '+(Number(value||0)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
}

function yesNo(value){return value===true?'Yes':value===false?'No':'Not specified'}

export default function BookingContractShield({session}){
  const{bookingId}=useParams()
  const[booking,setBooking]=useState(null)
  const[profile,setProfile]=useState(null)
  const[settings,setSettings]=useState(null)
  const[loading,setLoading]=useState(true)
  const[message,setMessage]=useState('')

  useEffect(()=>{let active=true;(async()=>{
    if(!session){setLoading(false);return}
    try{
      const row=await getArtistBookingRequestById(bookingId)
      if(!row)throw new Error('Booking request not found.')
      const[{data:p},s]=await Promise.all([
        supabase.from('profiles').select('id,display_name,stage_name,booking_email,booking_phone,country,city').eq('id',row.artist_id).maybeSingle(),
        getArtistBookingSettings(row.artist_id).catch(()=>null)
      ])
      if(active){setBooking(row);setProfile(p||null);setSettings(s)}
    }catch(error){if(active)setMessage(error.message||'Could not load this booking agreement.')}
    finally{if(active)setLoading(false)}
  })();return()=>{active=false}},[bookingId,session])

  if(!session)return <main className="page"><div className="eyebrow">IZAKHONO ARTIST PROTECT</div><h2>Log in to open Contract Shield</h2><Link className="primary inline" to="/login">Log in</Link></main>
  if(loading)return <main className="page"><div className="empty">Preparing Contract Shield…</div></main>
  if(message||!booking)return <main className="page"><div className="eyebrow">IZAKHONO ARTIST PROTECT</div><h2>Contract unavailable</h2><div className="notice">{message||'Booking request not found.'}</div><Link to="/bookings">Back to Booking Desk</Link></main>

  const name=profile?.stage_name||profile?.display_name||'ALLEGRO Creator'
  const requirements=bookingContractRequirements()
  const quoted=booking.quoted_gross_amount!=null
  const preview=quoted?creatorBookingQuotePreview(booking.quoted_gross_amount,booking.quote_currency||'ZAR',booking.deposit_percent??50):null
  const settlement=bookingSettlementGate(booking)
  const balanceMinor=preview?Math.max(0,preview.gross_minor-preview.deposit_minor):0
  const rights=[]
  if(booking.livestream_rights_requested)rights.push('livestream')
  if(booking.recording_rights_requested)rights.push('recording / broadcast')

  return <main className="contract-shield-page">
    <section className="contract-shield-head">
      <div><div className="eyebrow">IZAKHONO ARTIST PROTECT · CONTRACT SHIELD</div><h1>Live Performance Agreement</h1><p>Generated from ALLEGRO booking {booking.request_code}. Status: <strong>DRAFT — REVIEW</strong>.</p></div>
      <div className="contract-head-actions"><button className="secondary" type="button" onClick={()=>window.print()}>Print / Save PDF</button><Link className="secondary inline" to="/bookings">Back to Booking Desk</Link></div>
    </section>

    {!quoted&&<div className="contract-warning"><strong>QUOTE REQUIRED</strong><span>Create the commercial quote in the Booking Desk before this agreement is ready for review.</span></div>}

    <section className="creator-os-contract-rails">
      <article><div className="eyebrow">IZAKHONO REVENUE</div><strong>{quoted?moneyMinor(preview.gross_minor,preview.currency):'Quote pending'}</strong><span>{quoted?(preview.platform_percent+'% ALLEGRO · '+moneyMinor(preview.creator_minor,preview.currency)+' creator side'):'Commercial split activates from the approved quote.'}</span></article>
      <article><div className="eyebrow">ARTIST PROTECT</div><strong>{requirements[0]?.title||'Live booking agreement'}</strong><span>Standard review. Recording, broadcast and endorsement rights are never implied.</span></article>
      <article><div className="eyebrow">CLEARSET</div><strong>{settlement.status}</strong><span>{settlement.reason}</span></article>
    </section>

    <article className="contract-paper">
      <header><div className="contract-mark">ALLEGRO × IZAKHONO ARTIST PROTECT</div><h2>LIVE PERFORMANCE / BOOKING AGREEMENT</h2><p>Draft generated for review. This document is not signed and does not confirm payment.</p></header>

      <section><h3>Parties and event</h3>
        <dl>
          <div><dt>Artist / Act</dt><dd>{name}</dd></div>
          <div><dt>Promoter / Client</dt><dd>{booking.company_name}</dd></div>
          <div><dt>Contact</dt><dd>{booking.contact_name} · {booking.contact_email} · {booking.contact_phone}</dd></div>
          <div><dt>Engagement</dt><dd>{booking.performance_type}{booking.performance_other?' — '+booking.performance_other:''}</dd></div>
          <div><dt>Venue / Date / Time</dt><dd>{booking.venue_name||'Venue to be confirmed'} · {booking.venue_address} · {booking.event_date} {booking.event_time||''}</dd></div>
        </dl>
      </section>

      <section><h3>1. Performance</h3>
        <p>Indicative set length: <strong>{settings?.default_set_minutes||60} minutes</strong>. Final call time, soundcheck and performance timing must be confirmed by both parties before signature.</p>
      </section>

      <section><h3>2. Fee</h3>
        {quoted?<>
          <p>Guaranteed client fee: <strong>{moneyMinor(preview.gross_minor,preview.currency)}</strong>.</p>
          <p>Deposit target: <strong>{moneyMinor(preview.deposit_minor,preview.currency)}</strong> ({booking.deposit_percent??50}%). Balance target: <strong>{moneyMinor(balanceMinor,preview.currency)}</strong>.</p>
          <p>ALLEGRO creator-platform share: <strong>{preview.platform_percent}%</strong>. Creator side before separate tax/reserve choices: <strong>{moneyMinor(preview.creator_minor,preview.currency)}</strong>.</p>
          <p className="contract-note">Payment is not recorded as collected merely because this draft shows a deposit target.</p>
        </>:<p>Commercial quote has not yet been recorded.</p>}
      </section>

      <section><h3>3. Cancellation / rescheduling</h3>
        <p>Artist cancellation terms, promoter cancellation terms, force-majeure and rescheduling terms must be completed before signature. Deposit and cancellation consequences must be stated expressly.</p>
      </section>

      <section><h3>4. Production / hospitality</h3>
        <ul>
          <li>Backline / sound / necessary equipment provided by promoter: <strong>{yesNo(booking.backline_provided)}</strong></li>
          <li>Flights and hotel provided: <strong>{yesNo(booking.flights_hotel_provided)}</strong></li>
          <li>Ground transport provided: <strong>{yesNo(booking.ground_transport_provided)}</strong></li>
          <li>Visa / permit support requested: <strong>{booking.visa_support_required?'Yes':'No'}</strong></li>
          {settings?.rider_summary&&<li>Artist rider summary: {settings.rider_summary}</li>}
          {settings?.travel_policy&&<li>Artist travel policy: {settings.travel_policy}</li>}
        </ul>
      </section>

      <section><h3>5. Recording / broadcast</h3>
        <p>{rights.length?('The promoter requested '+rights.join(' and ')+' rights. These requests are NOT authorised by the booking enquiry and must be separately selected, priced and written into the signed agreement.'):'No livestream, commercial recording, broadcast or later reuse is authorised by default.'}</p>
      </section>

      <section><h3>6. Branding and endorsement</h3>
        <p>The artist is not deemed to endorse a sponsor, product or service merely because it is associated with the event. Any endorsement requires separate written approval.</p>
      </section>

      <section><h3>7. Safety</h3>
        <p>The promoter is responsible for reasonable venue, crowd and production safety within its control. The artist may stop or delay performance where conditions present a serious safety risk.</p>
      </section>

      <section><h3>8. Tax / invoices</h3>
        <p>Each party remains responsible for its own tax obligations. CLEARSET may classify reserves and obligations after verified receipts; it does not replace a registered tax practitioner.</p>
      </section>

      <section><h3>9. Disputes</h3>
        <p>Parties should give written notice and attempt good-faith resolution. Urgent safety or intellectual-property matters may be escalated immediately.</p>
      </section>

      <section className="contract-signatures"><h3>Signatures</h3>
        <div><span>Artist / authorised representative</span><b>____________________________</b><span>Date: ____________</span></div>
        <div><span>Promoter / Client</span><b>____________________________</b><span>Date: ____________</span></div>
      </section>

      <footer>ARTIST PROTECT templates are artist-protection starting points and deal checklists. They are not a substitute for individual legal advice. High-risk rights or long-term economic transfers require appropriate professional review.</footer>
    </article>
  </main>
}
