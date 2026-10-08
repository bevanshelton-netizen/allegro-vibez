import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'
import '../styles/home-showcase.css'
import '../styles/allegro-dusk.css'
import StudioLaunchPromo from '../components/StudioLaunchPromo'

const regions=[
  ['MUSIC','◉','Streaming · discovery · releases'],
  ['RADIO','◌','Live programming · culture · shows'],
  ['ARTISTS','♬','Profiles · catalogue · audience'],
  ['RIGHTS','◇','Ownership records · splits · metadata'],
  ['GLOBAL','✦','Bookings · opportunities · creator tools']
]

const pillars=[
  ['01','LISTEN','Stream music, discover artists and explore programmed radio.'],
  ['02','CREATE','Build an artist profile, organise releases and connect with audiences.'],
  ['03','PROTECT','Keep rights, ownership, contributor and music information connected to the work.'],
  ['04','GROW','Support bookings, creator opportunities, reporting and commercial activity.']
]

const experiences=[
  ['STREAM','▶','Play published music and explore the listening experience','/stream','/av-hero.webp','stream'],
  ['DISCOVER','✦','Find artists, releases and music across the platform','/artists','/av-discover.webp','discover'],
  ['RADIO','◉','Tune into programmed radio and music culture','/radio',null,'radio'],
  ['ARTISTS','♬','Create a profile, upload music and build an audience','/join-artists','/av-artists.webp','artists'],
  ['RIGHTS','◇','Connect ownership, splits, metadata and music records','/sa/protocol',null,'rights'],
  ['EARN','↗','Explore creator reporting, opportunities and commercial tools','/prosperity',null,'earn']
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

  return <main className="future-home product-first-home showcase-home allegro-rainbow-home">
    <StudioLaunchPromo source="home"/>
    <section className="showcase-hero allegro-dusk-hero">
      <div className="allegro-dusk-backdrop" aria-hidden="true"><img src="/allegro-dusk-hero.svg" alt=""/></div>
      <div className="allegro-marquee" aria-hidden="true"><div className="allegro-marquee-spin"><span className="allegro-marquee-face">ALLEGRO VIBEZ</span><span className="allegro-marquee-face allegro-marquee-back">ALLEGRO VIBEZ</span></div></div>
      <div className="showcase-copy">
        <div className="showcase-kicker"><span/> MUSIC · RADIO · ARTISTS · CREATOR TOOLS</div>
        <div className="showcase-brand">ALLEGRO</div>
        <h1>Listen. Discover.<br/><em>Build your music journey.</em></h1>
        <p>A music platform designed for streaming, radio, artist profiles, rights records, bookings and creator tools — in one vibrant experience.</p>
        <div className="showcase-actions">
          <Link className="showcase-primary" to="/stream">▶ Start Listening</Link>
          <Link className="showcase-secondary" to="/join-artists">♬ Join as an Artist</Link>
          <Link className="showcase-text" to="/radio">Listen to Radio →</Link>
        </div>
        <div className="showcase-proof">
          <span>MUSIC</span><span>RADIO</span><span>ARTIST PROFILES</span><span>RIGHTS RECORDS</span><span>BOOKINGS</span>
        </div>
      </div>

      <div className="showcase-collage" aria-label="ALLEGRO music and creator experience">
        <figure className="showcase-photo showcase-photo-main"><img src="/av-hero.webp" alt="ALLEGRO music experience"/></figure>
        <figure className="showcase-photo showcase-photo-artists"><img src="/av-artists.webp" alt="Artists on ALLEGRO"/></figure>
        <figure className="showcase-photo showcase-photo-discover"><img src="/av-discover.webp" alt="Music discovery on ALLEGRO"/></figure>
        <div className="showcase-now"><span className="showcase-live-dot"/> NOW PLAYING <b>ALLEGRO</b></div>
        <div className="showcase-radio-chip"><small>LIVE</small><strong>ALLEGRO RADIO</strong><span>24/7</span></div>
        <div className="showcase-rights-chip"><strong>MUSIC RECORDS.</strong><span>CONNECTED.</span></div>
        <Equalizer/>
      </div>
    </section>

    <section className="showcase-ticker" aria-label="ALLEGRO platform capabilities">
      <div>STREAM <b>✦</b> DISCOVER <b>✦</b> RADIO <b>✦</b> ARTISTS <b>✦</b> RIGHTS <b>✦</b> BOOKINGS <b>✦</b> CREATOR TOOLS <b>✦</b> STREAM <b>✦</b> DISCOVER <b>✦</b> RADIO <b>✦</b></div>
    </section>

    <section className="showcase-offers">
      <div className="showcase-section-head">
        <div><span>WHAT ALLEGRO IS DESIGNED TO DO</span><h2>More than streaming.<br/><em>One connected music experience.</em></h2></div>
        <p>Listen, discover, create, organise music information, manage artist activity and explore opportunities from one place.</p>
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
        <div><h2>Press play.<br/><em>Discover more.</em></h2><p>Music, releases, discovery and radio in one place.</p><span>START LISTENING →</span></div>
      </Link>
      <Link to="/join-artists" className="showcase-audience-card showcase-creators">
        <div className="showcase-audience-label">FOR CREATORS</div>
        <div><h2>Upload. Organise.<br/><em>Build. Grow.</em></h2><p>Artist identity, catalogue, rights records, bookings and creator tools connected.</p><span>BUILD YOUR ARTIST SPACE →</span></div>
      </Link>
    </section>

    <section className="showcase-merch">
      <div className="showcase-merch-copy">
        <span>ALLEGRO-VIBEZ ATELIER</span>
        <h2>Wear the movement.</h2>
        <p>Official ALLEGRO-VIBEZ streetwear for creators, artists and fans. Start with the confirmed 300gsm oversized tee drop, then preview hoodies, jackets, caps, bucket hats and accessories.</p>
        <div className="showcase-merch-actions"><Link className="showcase-primary" to="/merch">Shop official merch</Link><Link className="showcase-text" to="/merch#lookbook">View the lookbook →</Link></div>
        <div className="showcase-merch-proof"><span>300GSM TEES</span><span>OVERSIZED FIT</span><span>OFFICIAL ALLEGRO DESIGNS</span></div>
      </div>
      <Link to="/merch" className="showcase-merch-visual" aria-label="Open ALLEGRO-VIBEZ merch store">
        <img src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ merchandise collection"/>
        <div><small>THE FIRST DROP</small><strong>ALLEGRO-VIBEZ</strong><span>OFFICIAL MERCH →</span></div>
      </Link>
    </section>

    <section className="future-section showcase-regions">
      <div className="future-section-head"><div><span>THE PLATFORM EXPERIENCE</span><h2>Music, radio, artists, rights and opportunities.</h2></div><Link to="/artists">Explore artists →</Link></div>
      <div className="region-grid showcase-region-grid">{regions.map(([name,flag,cities])=><article key={name}><div className="region-glow"/><div className="showcase-region-flag">{flag}</div><strong>{name}</strong><p>{cities}</p><span>EXPLORE ↗</span></article>)}</div>
    </section>

    <section className="future-section showcase-system">
      <div className="future-section-head"><div><span>THE ALLEGRO SYSTEM</span><h2>Designed around the complete music journey.</h2></div></div>
      <div className="future-pillars showcase-pillars">{pillars.map(([n,t,d])=><article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="future-section showcase-signal">
      <div className="future-section-head"><div><span>CREATOR DISCOVERY</span><h2>Artist spaces are built for discovery.</h2></div><Link to="/join-artists">Get your space →</Link></div>
      {artists.length?
        <div className="signal-grid">{artists.map((a,i)=><Link className="signal-card" key={a.id} to={'/artist/'+a.id}><div className="signal-number">{String(i+1).padStart(2,'0')}</div><div><small>{a.country||'GLOBAL'} · {(a.primary_genres||[]).slice(0,2).join(' / ')||'CREATOR'}</small><h3>{a.stage_name||a.display_name||'ALLEGRO Artist'}</h3><span>{a.available_for_international_bookings?'GLOBAL BOOKINGS OPEN':'ARTIST SPACE'}</span></div></Link>)}</div>
        :<div className="showcase-empty-signal">
          <div><small>CREATOR ONBOARDING</small><h3>Build a public artist space.</h3><p>Create an artist profile, organise your catalogue and connect music information to the wider platform.</p></div>
          <div className="showcase-empty-actions"><Link className="showcase-primary" to="/join-artists">Claim Artist Space</Link><Link className="showcase-secondary" to="/career">Explore Career Tools</Link></div>
        </div>}
    </section>

    <section className="showcase-final">
      <div><span>MUSIC · RADIO · ARTISTS · CREATOR TOOLS</span><h2>Everything starts with the music.</h2><p>Listen, discover, create, organise and grow — with tools designed for the modern music journey.</p></div>
      <div className="showcase-final-actions"><Link className="showcase-primary" to="/stream">Open ALLEGRO Stream</Link><Link className="showcase-secondary" to="/join-artists">Claim Artist Space</Link></div>
    </section>
  </main>
}
