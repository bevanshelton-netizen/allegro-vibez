import { useEffect, useState } from 'react'
import '../styles/revenue.css'
import { ALLEGRO_LEAD_ENDPOINT } from '../lib/allegroLeadEndpoint'

const offers=[
  {
    code:'creator-launch',
    audience:'ARTISTS · DJS · PRODUCERS',
    name:'Creator Launch Pack',
    price:'R299',
    payableNow:true,
    lead:'Get professionally launch-ready on ALLEGRO.',
    items:['Creator onboarding review','Artist/profile launch checklist','Release and rights-readiness review','Priority consideration for ALLEGRO discovery once approved'],
  },
  {
    code:'featured-artist',
    audience:'FEATURED CREATOR',
    name:'Featured Artist Launch',
    price:'R599',
    payableNow:true,
    lead:'Turn one release into a focused launch campaign.',
    items:['Everything in Creator Launch','Featured launch placement on ALLEGRO web surfaces','Campaign copy + release positioning','Radio-clearance assessment; airplay only after rights approval and station activation'],
  },
  {
    code:'business-sponsor',
    audience:'BRANDS · SMEs · EVENTS',
    name:'Launch Sponsor',
    price:'R1,500',
    payableNow:true,
    lead:'Put your business in front of the ALLEGRO launch audience.',
    items:['Founding sponsor web placement','Sponsor profile/call-to-action','Launch campaign inclusion','Future radio inventory reserved only after station activation and campaign approval'],
  },
  {
    code:'founding-partner',
    audience:'STRATEGIC PARTNERS',
    name:'Founding Partner',
    price:'R5,000',
    payableNow:true,
    lead:'Own a bigger piece of the founding launch campaign.',
    items:['Premium founding-partner placement','Dedicated branded campaign feature','Priority launch-week inventory','Commercial planning session and proof-of-delivery report'],
  },
  {
    code:'radio-try',
    audience:'RADIO · FOUNDING TRIAL',
    name:'Try ALLEGRO Radio',
    price:'R750',
    payableNow:false,
    lead:'A low-risk 7-day radio trial with proof of delivery.',
    items:['20 × 30-second spots after verified station activation','Founding-advertiser web recognition','Creative script polish','Proof-of-play report','Make-good spots for missed booked plays'],
  },
  {
    code:'radio-grow',
    audience:'RADIO · GROWTH',
    name:'Grow with ALLEGRO',
    price:'R1,500',
    payableNow:false,
    lead:'A stronger 14-day launch package for brands that want repetition.',
    items:['50 × 30-second spots after verified activation','2 presenter-read mentions','Web sponsor placement','10 founding bonus spots','Proof-of-play + make-good guarantee'],
  },
  {
    code:'radio-daypart',
    audience:'RADIO · CATEGORY EXCLUSIVITY',
    name:'Own the Daypart',
    price:'R3,500',
    payableNow:false,
    lead:'Own a high-attention programme window while founding inventory lasts.',
    items:['120 × 30-second spots over 30 verified broadcast days','4 presenter reads','One approved branded recurring feature','Category exclusivity in one selected show/daypart','20 launch bonus spots + proof-of-play'],
  },
  {
    code:'radio-show-partner',
    audience:'RADIO · PREMIUM',
    name:'Founding Show Partner',
    price:'R7,500',
    payableNow:false,
    lead:'Attach your brand to one of ALLEGRO’s signature programmes.',
    items:['300 × 30-second spots over 30 verified broadcast days','Naming association with one agreed programme','8 presenter reads','Programme category exclusivity','50 launch bonus spots + premium web placement + proof-of-play'],
  },
]

export default function Revenue(){
  const[selected,setSelected]=useState(offers[0].code)
  const[state,setState]=useState('idle')
  const[message,setMessage]=useState('')
  const[gatewayReady,setGatewayReady]=useState(false)
  const[paymentCode,setPaymentCode]=useState('')

  useEffect(()=>{
    let active=true
    fetch('/api/ikhokha/config',{headers:{Accept:'application/json'}})
      .then(r=>r.ok?r.json():Promise.reject(new Error('Gateway status unavailable')))
      .then(data=>{if(active)setGatewayReady(Boolean(data.configured))})
      .catch(()=>{if(active)setGatewayReady(false)})

    const params=new URLSearchParams(window.location.search)
    const payment=params.get('payment')
    const ref=params.get('ref')
    if(payment==='success'&&ref){
      setState('verifying')
      setMessage('Payment returned from iKhokha. Verifying the transaction…')
      fetch(`/api/ikhokha/status?ref=${encodeURIComponent(ref)}`,{headers:{Accept:'application/json'}})
        .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Payment verification failed.');return data})
        .then(data=>{
          if(!active)return
          setState(data.paid?'paid':'pending')
          setMessage(data.paid?`Payment verified for ${data.product.label}. ALLEGRO will begin fulfilment from this confirmed transaction.`:'iKhokha has not yet confirmed settlement. Keep this page and refresh shortly.')
        })
        .catch(error=>{if(active){setState('error');setMessage(error.message||'Could not verify payment.')}})
    }else if(payment==='failed'){
      setState('error');setMessage('The iKhokha payment was not completed. No ALLEGRO package has been activated.')
    }else if(payment==='cancelled'){
      setState('idle');setMessage('Payment was cancelled. You can choose a package again whenever you are ready.')
    }
    return()=>{active=false}
  },[])

  async function pay(code){
    setPaymentCode(code)
    setMessage('')
    try{
      const response=await fetch('/api/ikhokha/create-payment',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({productId:code})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Could not start secure checkout.')
      if(!data.checkoutUrl)throw new Error('iKhokha did not return a checkout link.')
      window.location.assign(data.checkoutUrl)
    }catch(error){
      setState('error')
      setMessage(error.message||'Could not start iKhokha checkout.')
      setPaymentCode('')
    }
  }

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
      const response=await fetch(ALLEGRO_LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})
      if(!response.ok)throw new Error('Reservation could not be submitted.')
      setState('done')
      setMessage('Reservation received. ALLEGRO will confirm scope and delivery. Radio inventory becomes payable only after verified activation and campaign confirmation.')
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
      <p>Creator and launch-partner packages can move straight into secure iKhokha checkout. Radio inventory can be reserved now and becomes payable only after ALLEGRO confirms verified station activation and the booked campaign.</p>
      <div className="revenue-trust"><span>{gatewayReady?'IKHOKHA CHECKOUT CONNECTED':'SECURE CHECKOUT ACTIVATING'}</span><span>IZAKHONO AFRICA (PTY) LTD</span><span>LAUNCH RATES</span></div>
      {message&&<div className={state==='paid'||state==='done'?'revenue-success':'notice'}>{message}</div>}
    </section>

    <section className="revenue-offers">
      {offers.map(o=><article key={o.code} className={selected===o.code?'revenue-card selected':'revenue-card'}>
        <div className="eyebrow">{o.audience}</div>
        <h2>{o.name}</h2>
        <div className="revenue-price">{o.price}</div>
        <p>{o.lead}</p>
        <ul>{o.items.map(item=><li key={item}>{item}</li>)}</ul>
        {o.payableNow?<button className="primary" disabled={!gatewayReady||paymentCode===o.code} onClick={()=>pay(o.code)}>{paymentCode===o.code?'Opening iKhokha…':gatewayReady?`Pay ${o.price} with iKhokha`:'iKhokha secure connection pending'}</button>:<button className="primary" onClick={()=>{setSelected(o.code);document.getElementById('reserve')?.scrollIntoView({behavior:'smooth'})}}>Reserve {o.name}</button>}
      </article>)}
    </section>

    <section id="reserve" className="revenue-reserve">
      <div>
        <div className="eyebrow">RESERVE RADIO / REQUEST CONTACT</div>
        <h2>Start the sale now.</h2>
        <p>Use this form for radio packages, tailored campaigns or if you want ALLEGRO to contact you before paying. Creator and launch-partner packages above use direct iKhokha checkout once the secure server connection reports ready.</p>
        <div className="revenue-note"><strong>Radio boundary:</strong> paid packages do not guarantee airplay. Radio placement remains subject to rights clearance, editorial approval and verified station activation.</div>
        <p className="revenue-note">Payments are processed by iKhokha for <strong>IZAKHONO AFRICA (PTY) LTD</strong>. <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · <a href="/refunds.html">Refund & cancellation</a></p>
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
        <label className="consent"><input type="checkbox" name="consent" value="yes" required/><span>I want ALLEGRO to contact me about this booking and understand that radio submission does not guarantee airplay.</span></label>
        <button className="primary" disabled={state==='saving'}>{state==='saving'?'Submitting…':'Reserve / request contact'}</button>
      </form>
    </section>
  </main>
}
