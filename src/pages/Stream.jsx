import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/stream.css'

const markets=[
  ['AFRICA','Amapiano · Afrobeats · Gospel · Kwaito · Gqom · Jazz'],
  ['INDIA','Bollywood · Punjabi · Tamil · Telugu · Indie · Hip-Hop'],
  ['KOREA','K-Pop · K-R&B · K-Hip-Hop · OST · Indie'],
  ['CHINA','Mandopop · C-Pop · Cantonese · Hip-Hop · Folk'],
  ['GLOBAL','Pop · R&B · Hip-Hop · Dance · Jazz · Alternative']
]

function coverStyle(url,index){
  if(url)return {backgroundImage:`linear-gradient(180deg,rgba(4,5,9,.06),rgba(4,5,9,.72)),url("${url}")`}
  return {backgroundImage:`radial-gradient(circle at ${25+(index%4)*18}% 22%,rgba(0,231,255,.55),transparent 28%),radial-gradient(circle at 76% 74%,rgba(255,45,149,.45),transparent 26%),linear-gradient(135deg,#15152b,#07080d 70%)`}
}

export default function Stream(){
  const[releases,setReleases]=useState([])
  const[loading,setLoading]=useState(true)
  const[activeMarket,setActiveMarket]=useState('GLOBAL')
  const[current,setCurrent]=useState(null)
  const[playing,setPlaying]=useState(false)
  const audioRef=useRef(null)

  useEffect(()=>{let alive=true;(async()=>{
    if(!supabase){setLoading(false);return}
    const{data,error}=await supabase.from('releases')
      .select('id,title,release_type,created_at,audio_path,artwork_path')
      .eq('status','published').order('created_at',{ascending:false}).limit(36)
    if(error){setLoading(false);return}
    const hydrated=await Promise.all((data||[]).map(async(r)=>{
      let audioUrl=null,artworkUrl=null
      if(r.audio_path){
        const{data:signed}=await supabase.storage.from('release-assets').createSignedUrl(r.audio_path,3600)
        audioUrl=signed?.signedUrl||null
      }
      if(r.artwork_path){
        const{data:signed}=await supabase.storage.from('release-assets').createSignedUrl(r.artwork_path,3600)
        artworkUrl=signed?.signedUrl||null
      }
      return {...r,audioUrl,artworkUrl}
    }))
    if(alive){setReleases(hydrated);setLoading(false)}
  })();return()=>{alive=false}},[])

  useEffect(()=>{
    const a=audioRef.current
    if(!a)return
    if(playing&&current?.audioUrl)a.play().catch(()=>setPlaying(false))
    else a.pause()
  },[playing,current])

  const playable=useMemo(()=>releases.filter(r=>r.audioUrl),[releases])
  function choose(track){
    if(!track.audioUrl)return
    if(current?.id===track.id){setPlaying(v=>!v);return}
    setCurrent(track);setPlaying(true)
  }
  function step(delta){
    if(!playable.length)return
    const at=Math.max(0,playable.findIndex(r=>r.id===current?.id))
    const next=playable[(at+delta+playable.length)%playable.length]
    setCurrent(next);setPlaying(true)
  }

  return <main className="stream-page">
    <section className="stream-hero">
      <div>
        <span className="stream-kicker">ALLEGRO STREAM · POWERED BY IZAKHONO</span>
        <h1>One world.<br/><em>Infinite sound.</em></h1>
        <p>Stream rights-cleared music, discover artists across continents and move from listening to supporting the creator—tickets, live shows, bookings and more.</p>
        <div className="stream-actions"><Link className="stream-primary" to="/join-artists">Artists: Upload & Earn</Link><Link className="stream-secondary" to="/radio">Listen Live Radio</Link></div>
      </div>
      <div className="stream-globe" aria-hidden="true"><div className="stream-disc"><b>ALLEGRO</b><span>AFRICA · INDIA · KOREA · CHINA · GLOBAL</span></div><i/><i/><i/></div>
    </section>

    <section className="market-strip">
      {markets.map(([name])=><button key={name} className={activeMarket===name?'active':''} onClick={()=>setActiveMarket(name)}>{name}</button>)}
    </section>

    <section className="stream-section">
      <div className="stream-heading"><div><span>EXPLORE CULTURE</span><h2>{activeMarket==='GLOBAL'?'Music without borders.':`${activeMarket} on ALLEGRO.`}</h2></div><small>Market-led discovery is ready for catalogue growth.</small></div>
      <div className="market-cards">{markets.filter(([n])=>activeMarket==='GLOBAL'||n===activeMarket).map(([name,genres],i)=><article key={name}><div className="market-art" data-market={name}><span>{String(i+1).padStart(2,'0')}</span><b>{name}</b></div><p>{genres}</p></article>)}</div>
    </section>

    <section className="stream-section">
      <div className="stream-heading"><div><span>NOW ON ALLEGRO</span><h2>Published releases.</h2></div><Link to="/artists">Meet the artists →</Link></div>
      {loading?<div className="stream-empty">Loading the catalogue…</div>:releases.length?
        <div className="track-grid">{releases.map((r,i)=><button className="track-card" key={r.id} onClick={()=>choose(r)} disabled={!r.audioUrl}>
          <div className="track-cover" style={coverStyle(r.artworkUrl,i)}><span className="track-play">{r.audioUrl?(current?.id===r.id&&playing?'Ⅱ':'▶'):'COMING'}</span></div>
          <small>{r.release_type||'RELEASE'}</small><strong>{r.title}</strong><em>{r.audioUrl?'PLAY ON ALLEGRO':'AUDIO PENDING'}</em>
        </button>)}</div>:
        <div className="stream-empty"><strong>The streaming engine is live and waiting for its first published catalogue.</strong><span>Only approved releases enter public playback. Artists can upload now and move through the existing rights and moderation workflow.</span><Link to="/join-artists">Become a founding artist →</Link></div>}
    </section>

    <section className="stream-economy">
      <article><span>STREAM</span><b>Listen & discover</b><p>Fans move across Africa, India, Korea, China and global music spaces.</p></article>
      <article><span>CONNECT</span><b>Follow the creator</b><p>Artist identity, bookings, radio and career tools connect around one profile.</p></article>
      <article><span>SUPPORT</span><b>Turn fans into value</b><p>Live, tickets, merchandise, memberships and direct creator commerce are the next commercial layer.</p></article>
      <article><span>EARN</span><b>Creator prosperity</b><p>Rights, royalty visibility, wallet controls and payouts remain attached to the artist journey.</p></article>
    </section>

    <div className="stream-player">
      <audio ref={audioRef} src={current?.audioUrl||''} onEnded={()=>step(1)}/>
      <div className="player-meta"><span className={playing?'player-pulse active':'player-pulse'}/><div><small>{current?'NOW PLAYING':'ALLEGRO PLAYER'}</small><strong>{current?.title||'Choose a published release'}</strong></div></div>
      <div className="player-controls"><button onClick={()=>step(-1)} disabled={!playable.length}>‹</button><button className="player-main" onClick={()=>current&&setPlaying(v=>!v)} disabled={!current}>{playing?'Ⅱ':'▶'}</button><button onClick={()=>step(1)} disabled={!playable.length}>›</button></div>
      <div className="player-brand">ALLEGRO <span>STREAM</span></div>
    </div>
  </main>
}
