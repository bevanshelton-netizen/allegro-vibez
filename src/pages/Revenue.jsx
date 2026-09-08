import { useState } from 'react'
import '../styles/revenue.css'

const offers=[
  {
    code:'creator-launch',
    audience:'ARTISTS · DJS · PRODUCERS',
    name:'Creator Launch Pack',
    price:'R299',
    lead:'Get professionally launch-ready on ALLEGRO.',
    items:['Creator onboarding review','Artist/profile launch checklist','Release and rights-readiness review','Priority consideration for ALLEGRO discovery once approved'],
  },
  {
    code:'featured-artist',
    audience:'FEATURED CREATOR',
    name:'Featured Artist Launch',
    price:'R599',
    lead:'Turn one release into a focused launch campaign.',
    items:['Everything in Creator Launch','Featured launch placement on ALLEGRO web surfaces','Campaign copy + release positioning','Radio-clearance assessment; airplay only after rights approval and station activation'],
  },
  {
    code:'business-sponsor',
    audience:'BRANDS · SMEs · EVENTS',
    name:'Launch Sponsor',
    price:'R1,500',
    lead:'Put your business in front of the ALLEGRO launch audience.',
    items:['Founding sponsor web placement','Sponsor profile/call-to-action','Launch campaign inclusion','Future radio inventory reserved only after station activation and campaign approval'],
  },
  {
    code:'founding-partner',
    audience:'STRATEGIC PARTNERS',
    name:'Founding Partner',
    price:'R5,000',
    lead:'Own a bigger piece of the founding launch campaign.',
    items:['Premium founding-partner placement','Dedicated branded campaign feature','Priority launch-week inventory','Commercial planning session and proof-of-delivery report'],
  },
]

export default function Revenue(){
  const[selected,setSelected]=useState(offers[0].code)
  const[state,setState]=useState('idle')
  const[message,setMessage]=useState('')

  async function submit(e){
    e.preventDefault()
    setState('saving')
    setMessage('')
    const form=e.currentTarget
    const data=new FormData(form)
    data.set('form-name','allegro-revenue-desk')
    try{
      const body=new URLSearchParams()
      for(const [key,value] of data.entries())body.append(key,String(value))
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})
      if(!response.ok)throw new Error('Reservation could not be submitted.')
      setState('done')
      setMessage('Reservation received. ALLEGRO will confirm scope, delivery date and invoice before payment is requested.')
      form.reset()
      setSelected(offers[0].code)
    }catch(error){
      setState('error')
      setMessage(error.message||'Could not submit. Please try again.')
    }
  }

  return <main className="revenue-page">
    <section className="revenue-hero">
      <div className="eyebrow">ALLEGRO REVENUE DESK · FOUNDING LAUNCH</div>
      <h1>Get seen.<br/><em>Get heard. Get moving.</em></h1>
      <p>Book launch services that ALLEGRO can deliver now. Secure payment is requested only after your booking is accepted, scope and delivery date are confirmed, and an invoice is issued.</p>
      <div className="revenue-trust"><span>NO CARD DETAILS COLLECTED HERE</span><span>LAUNCH RATES</span><span>LIMITED FOUNDING INVENTORY</span></div>
    </section>

    <section className="revenue-offers">
      {offers.map(o=><article key={o.code} className={selected===o.code?'revenue-card selected':'revenue-card'}>
        <div className="eyebrow">{o.audience}</div>
        <h2>{o.name}</h2>
        <div className="revenue-price">{o.price}</div>
        <p>{o.lead}</p>
        <ul>{o.items.map(item=><li key={item}>{item}</li>)}</ul>
        <button className="primary" onClick={()=>{setSelected(o.code);document.getElementById('reserve')?.scrollIntoView({behavior:'smooth'})}}>Reserve {o.name}</button>
      </article>)}
    </section>

    <section id="reserve" className="revenue-reserve">
      <div>
        <div className="eyebrow">RESERVE YOUR PLACE</div>
        <h2>Start the sale now.</h2>
        <p>This is a booking request, not an automatic charge. We confirm the deliverables and payment method before any money is due.</p>
        <div className="revenue-note"><strong>Radio boundary:</strong> paid packages do not guarantee airplay. Radio placement remains subject to rights clearance, editorial approval and verified station activation.</div>
      </div>
      <form name="allegro-revenue-desk" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submit}>
        <input type="hidden" name="form-name" value="allegro-revenue-desk"/>
        <p className="hidden-field"><label>Do not fill this out<input name="bot-field"/></label></p>
        <label>Package
          <select name="package" value={selected} onChange={e=>setSelected(e.target.value)} required>
            {offers.map(o=><option key={o.code} value={o.code}>{o.name} — {o.price}</option>)}
          </select>
        </label>
        <label>Name / business<input name="name" required maxLength="120"/></label>
        <label>Email<input type="email" name="email" required/></label>
        <label>Phone / WhatsApp<input name="phone" inputMode="tel" required maxLength="40"/></label>
        <label>What are you promoting?<textarea name="campaign" required maxLength="1500" placeholder="Artist/release, business, event, product or campaign objective"/></label>
        <label className="consent"><input type="checkbox" name="consent" value="yes" required/><span>I want ALLEGRO to contact me about this booking and understand that submission does not guarantee radio airplay or constitute payment.</span></label>
        {message&&<div className={state==='done'?'revenue-success':'notice'}>{message}</div>}
        <button className="primary" disabled={state==='saving'}>{state==='saving'?'Submitting…':'Reserve & request invoice'}</button>
      </form>
    </section>
  </main>
}
