import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/artist-launch.css'

const benefits=[
  ['Protect your work','Rights declarations, contributor splits, clearance checks and a documented release trail.'],
  ['Get played','Rights-cleared music becomes eligible for ALLEGRO discovery and radio programming—subject to editorial and station activation gates.'],
  ['Own your space','Every approved creator gets a dedicated public home for music, story, campaign assets and booking information.'],
  ['Grow globally','Marketing-ready profile, regional discovery, international booking availability, release features and radio consideration across ALLEGRO.'],
  ['Know your money','Transparent royalty/wallet infrastructure, payout records and creator-prosperity tools as commercial services activate.'],
  ['Avoid bad deals','Contract guidance, red-flag checks and artist-protection workflows before major rights are signed away.']
]

export default function ArtistJoin(){
  const[state,setState]=useState('idle')
  const[message,setMessage]=useState('')
  async function submit(e){
    e.preventDefault();setState('saving');setMessage('')
    const data=new FormData(e.currentTarget);data.set('form-name','allegro-artist-interest')
    try{
      const body=new URLSearchParams()
      for(const[k,v]of data.entries())body.append(k,String(v))
      const r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})
      if(!r.ok)throw new Error('Could not reserve your artist place.')
      setState('done');setMessage('You are on the ALLEGRO artist onboarding list. We will contact you with the next step.');e.currentTarget.reset()
    }catch(err){setState('error');setMessage(err.message||'Please try again.')}
  }
  return <main className="artist-launch">
    <section className="artist-launch-hero">
      <div className="eyebrow">AFRICA ↔ WORLD · ARTISTS · DJS · PRODUCERS · SONGWRITERS · BANDS · CHOIRS</div>
      <h1>Bring your sound.<br/><em>Reach the world.</em></h1>
      <p>ALLEGRO gives creators anywhere in the world a protected home for music, marketing, rights, bookings and growth—while keeping Africa at the heart of the network.</p>
      <div className="actions"><Link className="primary" to="/register">Create your free creator account</Link><a className="secondary" href="#reserve">Reserve onboarding</a></div>
    </section>

    <section className="artist-benefits">
      {benefits.map(([title,text],i)=><article key={title}><span>{String(i+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></article>)}
    </section>

    <section className="artist-space-preview">
      <div><div className="eyebrow">YOUR DESIGNATED CREATOR SPACE</div><h2>Music. Marketing. Bookings. Rights.</h2><p>Your ALLEGRO space is built around four things artists actually need—not vanity metrics.</p></div>
      <div className="artist-space-grid">
        <article><strong>MUSIC</strong><p>Singles, EPs, albums, DJ mixes, artwork, release status and radio-clearance readiness.</p></article>
        <article><strong>MARKETING</strong><p>Bio, press headline, campaign message, social links, media kit and featured releases.</p></article>
        <article><strong>GLOBAL BOOKINGS</strong><p>Booking email, home territory, languages, preferred regions and international availability.</p></article>
        <article><strong>PROTECTION</strong><p>Rights records, splits, contributor history, contract assistance and dispute evidence.</p></article>
      </div>
    </section>

    <section id="reserve" className="artist-reserve">
      <div><div className="eyebrow">FOUNDING CREATOR ONBOARDING</div><h2>Get onto the list now.</h2><p>If account signup is temporarily unavailable, this reservation keeps your place and gives ALLEGRO permission to contact you about onboarding.</p></div>
      <form name="allegro-artist-interest" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submit}>
        <input type="hidden" name="form-name" value="allegro-artist-interest"/>
        <p className="hidden-field"><label>Do not fill this<input name="bot-field"/></label></p>
        <label>Artist / creator name<input name="artist_name" required maxLength="120"/></label>
        <label>Contact name<input name="contact_name" required maxLength="120"/></label>
        <label>Email<input type="email" name="email" required/></label>
        <label>Phone / WhatsApp<input name="phone" required maxLength="40"/></label>
        <label>Creator type<select name="creator_type" required><option>Artist</option><option>DJ</option><option>Producer</option><option>Songwriter</option><option>Band</option><option>Choir</option><option>Label</option></select></label>
        <div className="form-grid"><label>Country<input name="country" required maxLength="80" placeholder="South Africa, Nigeria, UK, USA…"/></label><label>Home region<select name="home_region" required><option>Africa</option><option>Europe</option><option>Americas</option><option>Asia</option><option>MENA</option><option>Oceania</option></select></label></div>
        <div className="form-grid"><label>Primary genres<input name="genres" maxLength="180" placeholder="Amapiano, Afrobeats, R&B"/></label><label>Languages<input name="languages" maxLength="180" placeholder="English, isiZulu, French…"/></label></div>
        <label className="consent"><input type="checkbox" name="international_bookings" value="yes"/><span>I am open to international booking enquiries and collaborations.</span></label>
        <label>What do you want ALLEGRO to help you achieve?<textarea name="goal" required maxLength="1200" placeholder="Radio, discovery, bookings, marketing, rights protection, distribution…"/></label>
        <label className="consent"><input type="checkbox" name="consent" value="yes" required/><span>I want ALLEGRO to contact me about creator onboarding and understand that radio airplay is subject to rights clearance and editorial approval.</span></label>
        {message&&<div className={state==='done'?'revenue-success':'notice'}>{message}</div>}
        <button className="primary" disabled={state==='saving'}>{state==='saving'?'Submitting…':'Reserve artist onboarding'}</button>
      </form>
    </section>
  </main>
}
