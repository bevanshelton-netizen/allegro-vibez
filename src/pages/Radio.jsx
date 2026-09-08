import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { programForNow } from '../lib/radioAutopilot'
import '../styles/radio.css'

const fallbackPrograms=[
  {id:'sunrise-africa',name:'Sunrise Africa',day:'daily',start:'05:00',end:'09:00',genre:'afropop',description:'Energy, headlines, inspiration, culture and uplifting African music.',priority:10},
  {id:'vibez-all-day',name:'Vibez All Day',day:'daily',start:'09:00',end:'15:00',genre:'afropop',description:'Music-first daytime radio, creator stories, workday energy and discovery.',priority:10},
  {id:'africa-drive',name:'Africa Drive',day:'daily',start:'15:00',end:'19:00',genre:'amapiano',description:'High-energy drive-time music, culture, entertainment and audience interaction.',priority:20},
  {id:'night-pulse',name:'Night Pulse',day:'daily',start:'19:00',end:'23:00',genre:'rnb',description:'R&B, soul, hip-hop, conversation and guest sessions.',priority:10},
  {id:'after-dark',name:'After Dark',day:'daily',start:'23:00',end:'05:00',genre:'mixed',description:'Late-night discovery, chilled classics, neo-soul, jazz and emerging talent.',priority:5},
  {id:'friday-fire',name:'Friday Fire',day:'fri',start:'19:00',end:'23:00',genre:'amapiano',description:'Weekend launch: amapiano, gqom, afrobeats, DJs and party culture.',priority:50},
  {id:'allegro-hitlist',name:'The ALLEGRO Hitlist',day:'sat',start:'10:00',end:'13:00',genre:'mixed',description:'Rights-cleared listener favourites, new releases and emerging-artist countdown.',priority:50},
  {id:'sports-culture',name:'Sports & Culture Live',day:'sat',start:'13:00',end:'16:00',genre:'mixed',description:'Sport, street culture, entertainment and music around the weekend action.',priority:50},
  {id:'sunday-spirit',name:'Sunday Spirit',day:'sun',start:'05:00',end:'10:00',genre:'gospel',description:'Gospel, inspiration, testimony, family and community voices.',priority:60},
  {id:'roots-legends',name:'Roots & Legends',day:'sun',start:'10:00',end:'13:00',genre:'mixed',description:'African classics, heritage, jazz, folk and stories behind timeless music.',priority:60},
  {id:'new-music-lab',name:'New Music Lab',day:'sun',start:'13:00',end:'16:00',genre:'mixed',description:'Emerging creators, first listens, interviews and rights-cleared independent releases.',priority:60},
  {id:'love-lounge',name:'The Love Lounge',day:'sun',start:'19:00',end:'23:00',genre:'rnb',description:'Soul, R&B, love songs, dedications and intimate conversations.',priority:60},
]

export default function Radio(){
  const[programs,setPrograms]=useState(fallbackPrograms)
  const[nowPlaying,setNowPlaying]=useState(null)
  const[loading,setLoading]=useState(true)
  const streamUrl=import.meta.env.VITE_ALLEGRO_RADIO_STREAM_URL||''
  useEffect(()=>{let active=true;(async()=>{
    if(!supabase){setLoading(false);return}
    const[{data:showData},{data:playData}]=await Promise.all([
      supabase.from('radio_programs').select('id,name,day,start_time,end_time,genre,description,priority,active').eq('active',true).order('start_time'),
      supabase.from('radio_now_playing').select('*').maybeSingle()
    ])
    if(!active)return
    if(showData?.length)setPrograms(showData.map(p=>({...p,start:String(p.start_time).slice(0,5),end:String(p.end_time).slice(0,5)})))
    if(playData)setNowPlaying(playData)
    setLoading(false)
  })();return()=>{active=false}},[])
  const live=useMemo(()=>programForNow(programs,new Date()),[programs])
  const nowText=nowPlaying?.track_title?((nowPlaying.artist_name||'Artist')+' — '+nowPlaying.track_title):'24/7 programming engine ready'
  return <main className="radio-page">
    <section className="radio-hero">
      <div className="radio-kicker">ALLEGRO RADIO • LIVE ONLINE • AFRICA TO THE WORLD</div>
      <h1>Music never sleeps.<br/><em>Neither does ALLEGRO.</em></h1>
      <p>A 24/7 online radio network built for artists, culture, advertisers and audiences—live when presenters are on air and fully automated when they are not.</p>
      <div className="radio-player">
        <div><span className="live-dot"/> <b>{live?.name||'ALLEGRO Radio'}</b><small>{nowText}</small></div>
        {streamUrl?<audio controls preload="none" src={streamUrl}/>:<div className="stream-gate">STREAM ENDPOINT PENDING OWNER-NODE ACTIVATION</div>}
      </div>
    </section>
    <section className="radio-section"><div className="radio-heading"><span>PROGRAMMING</span><h2>Different shows. One nonstop station.</h2></div>
      <div className="radio-grid">{programs.map(p=><article key={p.id} className={live?.id===p.id?'on-air':''}><div className="radio-time">{p.start}–{p.end}</div><h3>{p.name}</h3><p>{p.description||'Curated music and culture.'}</p><span>{p.genre||'mixed'}</span></article>)}</div>
    </section>
    <section className="radio-legal"><strong>Founding advertisers:</strong> reserve launch inventory now with proof-of-play and make-good protection. Radio airtime is invoiced only after the first verified airdate. <Link to="/revenue">See founding deals →</Link></section>
    <section className="radio-business">
      <article><span>01</span><h3>Artist engine</h3><p>Priority discovery for rights-cleared ALLEGRO artists, plus licensed catalogue from partner labels and independent creators.</p></article>
      <article><span>02</span><h3>Advertising engine</h3><p>Scheduled audio spots, sponsored shows, branded segments, host reads and campaign proof-of-play reporting.</p></article>
      <article><span>03</span><h3>Autopilot engine</h3><p>Clock-based programming, track separation, ad breaks, compliance logging and automatic fallback when no presenter is live.</p></article>
      <article><span>04</span><h3>Live takeover</h3><p>Approved presenters and DJs can take the live input; when the session ends, autopilot resumes automatically.</p></article>
    </section>
    <section className="radio-legal"><strong>Rights first.</strong> The playout engine is designed to schedule only tracks marked rights-verified and radio-cleared. Commercial music outside our directly cleared catalogue must be licensed before broadcast.</section>
    {loading&&<div className="radio-loading">Loading station data…</div>}
  </main>
}
