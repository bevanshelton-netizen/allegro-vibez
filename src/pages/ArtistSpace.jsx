import { useEffect,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/artist-launch.css'

export default function ArtistSpace(){
  const{artistId}=useParams();const[profile,setProfile]=useState(null);const[releases,setReleases]=useState([]);const[loading,setLoading]=useState(true)
  useEffect(()=>{let active=true;(async()=>{if(!supabase){setLoading(false);return}
    const[{data:p},{data:r}]=await Promise.all([
      supabase.from('profiles').select('id,display_name,stage_name,account_type,country,city,bio,press_headline,booking_email,booking_phone,website_url,instagram_url,tiktok_url,youtube_url,marketing_message').eq('id',artistId).maybeSingle(),
      supabase.from('releases').select('id,title,release_type,created_at').eq('owner_id',artistId).eq('status','published').order('created_at',{ascending:false}).limit(24)
    ])
    if(active){setProfile(p||null);setReleases(r||[]);setLoading(false)}
  })();return()=>{active=false}},[artistId])
  if(loading)return <main className="page"><div className="empty">Loading artist space…</div></main>
  if(!profile)return <main className="page"><div className="eyebrow">ALLEGRO ARTIST SPACE</div><h2>Artist space coming online</h2><p>This creator has not published a public ALLEGRO profile yet.</p><Link to="/join-artists">Join ALLEGRO</Link></main>
  const name=profile.stage_name||profile.display_name||'ALLEGRO Creator'
  return <main className="artist-public-space">
    <section className="artist-public-hero"><div className="eyebrow">{profile.account_type||'CREATOR'} · {profile.city||profile.country||'AFRICA'}</div><h1>{name}</h1><p>{profile.press_headline||profile.bio||'Independent creator on ALLEGRO.'}</p></section>
    <section className="artist-public-grid">
      <article><div className="eyebrow">MUSIC</div><h2>Released on ALLEGRO</h2>{releases.length?<div className="release-list">{releases.map(r=><div key={r.id}><strong>{r.title}</strong><span>{r.release_type}</span></div>)}</div>:<p>Public releases will appear here once approved and published.</p>}</article>
      <article><div className="eyebrow">MARKETING</div><h2>Artist story</h2><p>{profile.marketing_message||profile.bio||'Marketing profile being prepared.'}</p><div className="artist-links">{profile.website_url&&<a href={profile.website_url} target="_blank" rel="noreferrer">Website</a>}{profile.instagram_url&&<a href={profile.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}{profile.tiktok_url&&<a href={profile.tiktok_url} target="_blank" rel="noreferrer">TikTok</a>}{profile.youtube_url&&<a href={profile.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}</div></article>
      <article><div className="eyebrow">BOOKINGS</div><h2>Work with {name}</h2>{profile.booking_email?<a className="primary inline" href={'mailto:'+profile.booking_email}>Booking enquiry</a>:<p>Booking contact will appear here when the creator publishes it.</p>}</article>
      <article><div className="eyebrow">PROTECTION</div><h2>Rights first</h2><p>ALLEGRO uses release review, ownership/contributor records and radio-clearance gates before monetised platform use.</p></article>
    </section>
  </main>
}
