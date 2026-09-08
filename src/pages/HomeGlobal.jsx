import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'

const regions=[
  ['AFRICA','Johannesburg · Lagos · Accra · Nairobi · Cape Town'],
  ['EUROPE','London · Paris · Berlin · Amsterdam'],
  ['AMERICAS','New York · Kingston · Toronto · São Paulo'],
  ['ASIA + MENA','Seoul · Tokyo · Dubai · Mumbai']
]

const pillars=[
  ['01','LIVE RADIO','24/7 format-driven radio with rights-aware playout, artist discovery and sponsor inventory.'],
  ['02','ARTIST PASSPORT','One global creator identity for music, rights, marketing, bookings and commercial growth.'],
  ['03','PROTECT','Splits, ownership, contract guardrails, evidence and clearance before monetisation.'],
  ['04','PROSPER','Transparent 90/10 creator economics by default, plus wallet, reporting and payout rails.']
]

function Pulse(){
  return <div className="future-orbit" aria-hidden="true">
    <div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/>
    <div className="future-core"><span>LIVE</span><strong>ALLEGRO</strong><small>AFRICA ↔ WORLD</small></div>
    <div className="wave-bars">{Array.from({length:32},(_,i)=><i key={i} style={{'--i':i}}/> )}</div>
  </div>
}

export default function HomeGlobal(){
  const[artists,setArtists]=useState([])
  useEffect(()=>{let active=true;(async()=>{if(!supabase)return
    const{data}=await supabase.from('profiles').select('id,stage_name,display_name,country,primary_genres,available_for_international_bookings').order('created_at',{ascending:false}).limit(8)
    if(active)setArtists(data||[])
  })();return()=>{active=false}},[])
  return <main className="future-home">
    <section className="future-hero">
      <div className="future-copy">
        <div className="future-badge"><span className="pulse-dot"/> LIVE CREATOR NETWORK · AFRICAN-BORN · GLOBAL</div>
        <h1>Hear the future.<br/><em>Own your sound.</em></h1>
        <p>ALLEGRO is a global music, radio and creator economy built from Africa—where artists protect their work, build their audience, get discovered, attract bookings and grow without surrendering the future.</p>
        <div className="future-actions"><Link className="neon-primary" to="/radio">Enter Live Radio</Link><Link className="neon-secondary" to="/join-artists">Join as an Artist</Link><Link className="ghost-link" to="/revenue">Advertise globally →</Link></div>
        <div className="future-stats"><div><strong>90%</strong><span>creator side by default</span></div><div><strong>24/7</strong><span>radio engine</span></div><div><strong>GLOBAL</strong><span>artist onboarding</span></div></div>
      </div>
      <Pulse/>
    </section>

    <section className="future-marquee"><div>ALLEGRO RADIO · ARTIST PROTECT · GLOBAL BOOKINGS · DISCOVERY · CREATOR WALLET · LIVE SHOWS · AFRICA TO THE WORLD · </div></section>

    <section className="future-section">
      <div className="future-section-head"><div><span>DISCOVER WITHOUT BORDERS</span><h2>Africa meets the world.</h2></div><Link to="/artists">Explore artists →</Link></div>
      <div className="region-grid">{regions.map(([name,cities])=><article key={name}><div className="region-glow"/><strong>{name}</strong><p>{cities}</p><span>DISCOVER REGION ↗</span></article>)}</div>
    </section>

    <section className="future-section">
      <div className="future-section-head"><div><span>THE ALLEGRO SYSTEM</span><h2>Built around the artist—not around extraction.</h2></div></div>
      <div className="future-pillars">{pillars.map(([n,t,d])=><article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="future-section">
      <div className="future-section-head"><div><span>GLOBAL CREATOR SIGNAL</span><h2>New artist spaces.</h2></div><Link to="/join-artists">Get your space →</Link></div>
      <div className="signal-grid">{artists.length?artists.map((a,i)=><Link className="signal-card" key={a.id} to={'/artist/'+a.id}><div className="signal-number">{String(i+1).padStart(2,'0')}</div><div><small>{a.country||'GLOBAL'} · {(a.primary_genres||[]).slice(0,2).join(' / ')||'CREATOR'}</small><h3>{a.stage_name||a.display_name||'ALLEGRO Artist'}</h3><span>{a.available_for_international_bookings?'GLOBAL BOOKINGS OPEN':'ARTIST SPACE'}</span></div></Link>):regions.map(([name],i)=><article className="signal-card placeholder" key={name}><div className="signal-number">{String(i+1).padStart(2,'0')}</div><div><small>FOUNDING CREATOR SPACE</small><h3>{name}</h3><span>ONBOARDING NOW</span></div></article>)}</div>
    </section>

    <section className="future-cta">
      <div><span>THE NEXT GLOBAL SOUND CAN COME FROM ANYWHERE.</span><h2>Make sure the artist owns the journey.</h2></div>
      <div className="future-actions"><Link className="neon-primary" to="/join-artists">Claim Artist Space</Link><Link className="neon-secondary" to="/radio">Listen to ALLEGRO</Link></div>
    </section>
  </main>
}
