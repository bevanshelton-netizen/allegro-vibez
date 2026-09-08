import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'

const paths=[
  {code:'launch',title:'LAUNCH',tag:'START STRONG',copy:'Build the first professional chapter: identity, debut release, protected rights, radio introduction, first visual and first booking story.',kora:'Music video · launch film · origin documentary'},
  {code:'grow',title:'GROW',tag:'BUILD MOMENTUM',copy:'Turn releases, radio, touring, content and bookings into repeatable audience and revenue growth.',kora:'Live sessions · tour diary · concert film'},
  {code:'revive',title:'REVIVE',tag:'BRING THE LEGACY BACK',copy:'Reintroduce catalogue, story and fan history without pretending the past never happened.',kora:'Legacy documentary · archive story · reunion concert'},
  {code:'relaunch',title:'RELAUNCH',tag:'RETURN WITH PURPOSE',copy:'Create a new era around a comeback, new music, new positioning and a deliberate return to audience attention.',kora:'Comeback documentary · new-era visuals · relaunch concert'}
]

export default function CareerEngine({session}){
  const[path,setPath]=useState('grow')
  const[goal,setGoal]=useState('')
  const[story,setStory]=useState('')
  const[hasVideo,setHasVideo]=useState(false)
  const[touring,setTouring]=useState(false)
  const[message,setMessage]=useState('')
  const[saving,setSaving]=useState(false)

  useEffect(()=>{let active=true;(async()=>{if(!supabase||!session)return
    const{data}=await supabase.from('profiles').select('career_path,career_goal,career_story,has_video_catalogue,touring_artist').eq('id',session.user.id).maybeSingle()
    if(active&&data){setPath(data.career_path||'grow');setGoal(data.career_goal||'');setStory(data.career_story||'');setHasVideo(Boolean(data.has_video_catalogue));setTouring(Boolean(data.touring_artist))}
  })();return()=>{active=false}},[session])

  async function save(){
    if(!supabase||!session)return
    setSaving(true);setMessage('')
    const{error}=await supabase.from('profiles').update({
      career_path:path,career_goal:goal.trim()||null,career_story:story.trim()||null,
      has_video_catalogue:hasVideo,touring_artist:touring,updated_at:new Date().toISOString()
    }).eq('id',session.user.id)
    setSaving(false);setMessage(error?error.message:'Career pathway saved. ALLEGRO can now shape your growth journey around it.')
  }

  if(!session)return <main className="page"><div className="eyebrow">CAREER ENGINE</div><h2>Choose your next chapter.</h2><p>Log in to build your Launch, Grow, Revive or Relaunch pathway.</p><Link className="primary inline" to="/login">Log in</Link></main>

  const selected=paths.find(x=>x.code===path)||paths[1]
  return <main className="future-home">
    <section className="future-section">
      <div className="future-section-head"><div><span>ALLEGRO CAREER ENGINE</span><h2>Your career is not one straight line.</h2><p>Start. Grow. Come back. Reinvent. The platform should move with you.</p></div></div>
      <div className="future-pillars">{paths.map(p=><article key={p.code} onClick={()=>setPath(p.code)} style={{cursor:'pointer',outline:path===p.code?'1px solid #64def1':'none'}}><b>{p.tag}</b><h3>{p.title}</h3><p>{p.copy}</p><small>{p.kora}</small></article>)}</div>
    </section>

    <section className="artist-reserve">
      <div><div className="eyebrow">{selected.title} PATH</div><h2>Build the next chapter.</h2><p>{selected.copy}</p>
        <div className="notice"><strong>KORA SCREEN:</strong> {selected.kora}. Video publishing remains subject to creator-account linking, rights review and KORA moderation.</div>
      </div>
      <div className="panel">
        <label>Main career goal<textarea rows="3" value={goal} onChange={e=>setGoal(e.target.value)} maxLength="800" placeholder="What must the next 12 months achieve?"/></label>
        <label>Your story / context<textarea rows="5" value={story} onChange={e=>setStory(e.target.value)} maxLength="1800" placeholder="Where are you coming from and what should audiences understand about this chapter?"/></label>
        <label className="consent"><input type="checkbox" checked={hasVideo} onChange={e=>setHasVideo(e.target.checked)}/><span>I have music videos, live footage, documentaries or other screen content.</span></label>
        <label className="consent"><input type="checkbox" checked={touring} onChange={e=>setTouring(e.target.checked)}/><span>I tour or plan to tour and want Tour2Screen support.</span></label>
        {message&&<div className="notice">{message}</div>}
        <button className="primary" type="button" onClick={save} disabled={saving}>{saving?'Saving…':'Lock my career pathway'}</button>
      </div>
    </section>
  </main>
}
