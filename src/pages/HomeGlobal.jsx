import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'
import '../styles/home-showcase.css'

const regions=[
  ['AFRICA','🌍','Johannesburg · Lagos · Accra · Nairobi · Cape Town'],
  ['INDIA','🇮🇳','Mumbai · Delhi · Chennai · Hyderabad · Punjab'],
  ['KOREA','🇰🇷','Seoul · Busan · Incheon · Daegu'],
  ['CHINA','🇨🇳','Shanghai · Beijing · Shenzhen · Guangzhou'],
  ['GLOBAL','✦','London · New York · Toronto · São Paulo · Dubai']
]

const pillars=[
  ['01','LIVE RADIO','24/7 format-driven radio with rights-aware playout, artist discovery and sponsor inventory.'],
  ['02','ARTIST PASSPORT','One global creator identity for music, rights, marketing, bookings and commercial growth.'],
  ['03','PROTECT','Splits, ownership, contract guardrails, evidence and clearance before monetisation.'],
  ['04','PROSPER','Transparent creator economics by default, plus wallet, reporting and payout rails.']
]

const experiences=[
  ['STREAM','▶','Play music from published artists','/stream','/av-hero.webp','stream'],
  ['DISCOVER','✦','Find artists across Africa, India, Korea, China and beyond','/artists','/av-discover.webp','discover'],
  ['RADIO','◉','Tune into ALLEGRO Radio and programmed culture','/radio',null,'radio'],
  ['ARTISTS','♬','Create a profile, upload music and build an audience','/join-artists','/av-artists.webp','artists'],
  ['RIGHTS','◇','Keep ownership, splits and commercial records attached to the music','/sa/protocol',null,'rights'],
  ['EARN','↗','Track prosperity, wallet activity and creator opportunities','/prosperity',null,'earn']
]

function Equalizer(){
  return <div className="showcase-eq" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--bar':i}}/>)}</div>
}

export default function HomeGlobal(){
  const[artists,setArtists]=useState([])
  useEffect(()=>{let active=true;(async()=>{if(!supabase)return
    const{data}=await supabase.from('profiles').select('id,stage_name,display_name,country,primary_genres,available_for_international_bookings').order('created_at',{ascending:false}).limit(8)
    if(active)setArtists(data||[])
  })();return()=>{active=false}},[])

  return <main className="future-home product-first-home showcase-home">
    <section className="showcase-hero">
      <div className="showcase-copy">
        <div className="showcase-kicker"><span/> GLOBAL MUSIC · RADIO · CREATOR ECONOMY</div>
        <div className="showcase-brand">ALLEGRO</div>
        <h1>The world is listening.<br/><em>Make your sound travel.</em></h1>
        <p>Stream music. Discover artists. Tune into live radio. Upload your work. Protect your rights. Build a creator business — all from one global platform born in Africa.</p>
        <div className="showcase-actions">
          <Link className="showcase-primary" to="/stream">▶ Start Listening</Link>
          <Link className="showcase-secondary" to="/join-artists">♬ Join as an Artist</Link>
          <Link className="showcase-text" to="/radio">Listen to ALLEGRO Radio →</Link>
        </div>
        <div className="showcase-proof">
          <span>24/7 RADIO</span><span>GLOBAL DISCOVERY</span><span>ARTIST RIGHTS</span><span>CREATOR WALLET</span>
        </div>
      </div>

      <div className="showcase-collage" aria-label="ALLEGRO music, artist and discovery experience">
        <figure className="showcase-photo showcase-photo-main"><img src="/av-hero.webp" alt="ALLEGRO music experience"/></figure>
        <figure className="showcase-photo showcase-photo-artists"><img src="/av-artists.webp" alt="Artists building on ALLEGRO"/></figure>
        <figure className="showcase-photo showcase-photo-discover"><img src="/av-discover.webp" alt="Music discovery on ALLEGRO"/></figure>
        <div className="showcase-now"><span className="showcase-live-dot"/> NOW PLAYING <b>ALLEGRO GLOBAL</b></div>
        <div className="showcase-radio-chip"><small>LIVE</small><strong>ALLEGRO RADIO</strong><span>24/7</span></div>
        <div className="showcase-rights-chip"><strong>YOUR MUSIC.</strong><span>YOUR RIGHTS.</span></div>
        <Equalizer/>
      </div>
    </section>

    <section className="showcase-ticker" aria-label="ALLEGRO platform capabilities">
      <div>STREAM <b>✦</b> DISCOVER <b>✦</b> RADIO <b>✦</b> ARTISTS <b>✦</b> RIGHTS <b>✦</b> BOOKINGS <b>✦</b> EARN <b>✦</b> STREAM <b>✦</b> DISCOVER <b>✦</b> RADIO <b>✦</b></div>
    </section>

    <section className="showcase-offers">
      <div className="showcase-section-head">
        <div><span>WHAT YOU CAN DO HERE</span><h2>More than streaming.<br/><em>A complete music ecosystem.</em></h2></div>
        <p>Whether you came to listen, discover talent, build an artist career or advertise around music culture, Allegro gives you a clear place to start.</p>
      </div>
      <div className="showcase-offer-grid">
        {experiences.map(([title,icon,desc,to,image,kind],i)=><Link key={title} to={to} className={'showcase-offer showcase-offer-'+kind+(i===0?' showcase-offer-featured':'')} style={image?{'--offer-image':'url("'+image+'")'}:undefined}>
          <div className="showcase-offer-bg"/>
          <div className="showcase-offer-top"><span className="showcase-offer-icon">{icon}</span><small>{String(i+1).padStart(2,'0')}</small></div>
          <div className="showcase-offer-copy"><h3>{title}</h3><p>{desc}</p><span>OPEN {title} →</span></div>
        </Link>)}
      </div>
    </section>

    <section className="showcase-audience">
      <Link to="/stream" className="showcase-audience-card showcase-listeners">
        <div className="showcase-audience-label">FOR LISTENERS</div>
        <div><h2>Press play.<br/><em>Meet the world.</em></h2><p>New releases, culture, global discovery and ALLEGRO Radio in one place.</p><span>START LISTENING →</span></div>
      </Link>
      <Link to="/join-artists" className="showcase-audience-card showcase-creators">
        <div className="showcase-audience-label">FOR CREATORS</div>
        <div><h2>Upload. Protect.<br/><em>Build. Earn.</em></h2><p>Your catalogue, artist identity, rights, bookings and prosperity journey connected.</p><span>BUILD YOUR ARTIST SPACE →</span></div>
      </Link>
    </section>

    <section className="future-section showcase-regions">
      <div className="future-section-head"><div><span>DISCOVER WITHOUT BORDERS</span><h2>Africa meets India, Korea, China and the world.</h2></div><Link to="/artists">Explore artists →</Link></div>
      <div className="region-grid showcase-region-grid">{regions.map(([name,flag,cities])=><article key={name}><div className="region-glow"/><div className="showcase-region-flag">{flag}</div><strong>{name}</strong><p>{cities}</p><span>DISCOVER REGION ↗</span></article>)}</div>
    </section>

    <section className="future-section showcase-system">
      <div className="future-section-head"><div><span>THE ALLEGRO SYSTEM</span><h2>Built around the artist — not around extraction.</h2></div></div>
      <div className="future-pillars showcase-pillars">{pillars.map(([n,t,d])=><article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="future-section showcase-signal">
      <div className="future-section-head"><div><span>GLOBAL CREATOR SIGNAL</span><h2>Artists are building here.</h2></div><Link to="/join-artists">Get your space →</Link></div>
      <div className="signal-grid">{artists.length?artists.map((a,i)=><Link className="signal-card" key={a.id} to={'/artist/'+a.id}><div className="signal-number">{String(i+1).padStart(2,'0')}</div><div><small>{a.country||'GLOBAL'} · {(a.primary_genres||[]).slice(0,2).join(' / ')||'CREATOR'}</small><h3>{a.stage_name||a.display_name||'ALLEGRO Artist'}</h3><span>{a.available_for_international_bookings?'GLOBAL BOOKINGS OPEN':'ARTIST SPACE'}</span></div></Link>):regions.map(([name],i)=><article className="signal-card placeholder" key={name}><div className="signal-number">{String(i+1).padStart(2,'0')}</div><div><small>FOUNDING CREATOR SPACE</small><h3>{name}</h3><span>ONBOARDING NOW</span></div></article>)}</div>
    </section>

    <section className="showcase-final">
      <div><span>BUILT IN AFRICA · PLAYED BY THE WORLD</span><h2>Your next favourite artist could come from anywhere.</h2><p>Listen globally. Build visibly. Protect the work. Let the creator own the journey.</p></div>
      <div className="showcase-final-actions"><Link className="showcase-primary" to="/stream">Open ALLEGRO Stream</Link><Link className="showcase-secondary" to="/join-artists">Claim Artist Space</Link></div>
    </section>
  </main>
}
