import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'

const regions=[
  ['AFRICA','Johannesburg · Lagos · Accra · Nairobi · Cape Town'],
  ['INDIA','Mumbai · Delhi · Chennai · Hyderabad · Punjab'],
  ['KOREA','Seoul · Busan · Incheon · Daegu'],
  ['CHINA','Shanghai · Beijing · Shenzhen · Guangzhou'],
  ['GLOBAL','London · New York · Toronto · São Paulo · Dubai']
]

const pillars=[
  ['01','LIVE RADIO','24/7 format-driven radio with rights-aware playout, artist discovery and sponsor inventory.'],
  ['02','ARTIST PASSPORT','One global creator identity for music, rights, marketing, bookings and commercial growth.'],
  ['03','PROTECT','Splits, ownership, contract guardrails, evidence and clearance before monetisation.'],
  ['04','PROSPER','Transparent 90/10 creator economics by default, plus wallet, reporting and payout rails.']
]

const experiences=[
  ['STREAM','Play music from published artists','/stream','/av-hero.webp'],
  ['DISCOVER','Find artists across Africa, India, Korea, China and beyond','/artists','/av-discover.webp'],
  ['RADIO','Tune into ALLEGRO Radio and programmed culture','/radio',null],
  ['ARTISTS','Create a profile, upload music and build an audience','/join-artists','/av-artists.webp'],
  ['RIGHTS','Keep ownership, splits and commercial records attached to the music','/sa/protocol',null],
  ['EARN','Track prosperity, wallet activity and creator opportunities','/prosperity',null]
]

export default function HomeGlobal(){
  const[artists,setArtists]=useState([])
  useEffect(()=>{let active=true;(async()=>{if(!supabase)return
    const{data}=await supabase.from('profiles').select('id,stage_name,display_name,country,primary_genres,available_for_international_bookings').order('created_at',{ascending:false}).limit(8)
    if(active)setArtists(data||[])
  })();return()=>{active=false}},[])
  return <main className="future-home product-first-home">
    <section className="allegro-explainer product-first">
      <div className="product-first-head">
        <div>
          <span className="product-kicker">ALLEGRO · BUILT IN AFRICA · PLAYED BY THE WORLD</span>
          <h1>Listen. Discover.<br/><em>Upload. Earn.</em></h1>
          <p>ALLEGRO is a global music platform for listeners and a business engine for artists—streaming, radio, discovery, rights, bookings and creator prosperity in one place.</p>
        </div>
        <div className="product-first-actions">
          <Link className="neon-primary" to="/stream">▶ Start Streaming</Link>
          <Link className="neon-secondary" to="/join-artists">Artists: Join ALLEGRO</Link>
          <Link className="ghost-link" to="/radio">Live Radio →</Link>
        </div>
      </div>
      <div className="market-chips" aria-label="ALLEGRO markets">
        <span>AFRICA</span><span>INDIA</span><span>KOREA</span><span>CHINA</span><span>GLOBAL</span>
      </div>
      <div className="experience-grid">
        {experiences.map(([title,desc,to,image],i)=><Link key={title} to={to} className={'experience-card exp-'+i} style={image?{'--exp-image':'url("'+image+'")'}:undefined}>
          <div className="experience-shade"/>
          <div className="experience-copy"><small>{String(i+1).padStart(2,'0')}</small><h3>{title}</h3><p>{desc}</p><span>OPEN →</span></div>
        </Link>)}
      </div>
      <div className="audience-split">
        <Link to="/stream" className="audience-card listener-card">
          <div><small>FOR LISTENERS</small><h3>Press play. Meet the world.</h3><p>Stream new releases, move between cultures, discover artists and listen to ALLEGRO Radio.</p><span>START LISTENING →</span></div>
        </Link>
        <Link to="/join-artists" className="audience-card artist-card">
          <div><small>FOR ARTISTS</small><h3>Upload. Build. Earn.</h3><p>Your music, artist identity, rights, bookings and prosperity journey in one place.</p><span>JOIN ALLEGRO →</span></div>
        </Link>
      </div>
    </section>

    <section className="future-marquee"><div>ALLEGRO STREAM · AFRICA · INDIA · KOREA · CHINA · GLOBAL · LIVE RADIO · ARTIST RIGHTS · BOOKINGS · CREATOR WALLET · </div></section>

    <section className="future-section">
      <div className="future-section-head"><div><span>DISCOVER WITHOUT BORDERS</span><h2>Africa meets India, Korea, China and the world.</h2></div><Link to="/artists">Explore artists →</Link></div>
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
      <div><span>THE NEXT GLOBAL SOUND CAN COME FROM ANYWHERE.</span><h2>Listen globally. Let the artist own the journey.</h2></div>
      <div className="future-actions"><Link className="neon-primary" to="/join-artists">Claim Artist Space</Link><Link className="neon-secondary" to="/stream">Open ALLEGRO Stream</Link></div>
    </section>
  </main>
}
