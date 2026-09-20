import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const defaultPlan=[
  {id:'pulse',title:'Steady Pulse',area:'Rhythm',minutes:5},
  {id:'reading',title:'Sight Reading',area:'Reading',minutes:10},
  {id:'technique',title:'Instrument Technique',area:'Practical',minutes:10},
  {id:'ear',title:'Ear Training',area:'Listening',minutes:5},
]

export default function MusicAcademyLearner(){
  const [instrument,setInstrument]=useState(()=>localStorage.getItem('allegro-academy-instrument')||'Piano')
  const [done,setDone]=useState(()=>{try{return JSON.parse(localStorage.getItem('allegro-academy-done')||'[]')}catch{return[]}})
  const [streak,setStreak]=useState(()=>Number(localStorage.getItem('allegro-academy-streak')||0))
  const [access,setAccess]=useState({loading:true,active:false,gatewayConfigured:true,expiresAt:null})
  const completed=done.length
  const progress=Math.round((completed/defaultPlan.length)*100)
  useEffect(()=>localStorage.setItem('allegro-academy-instrument',instrument),[instrument])
  useEffect(()=>localStorage.setItem('allegro-academy-done',JSON.stringify(done)),[done])
  useEffect(()=>{
    let active=true
    fetch('/api/academy/access',{credentials:'same-origin'})
      .then(async response=>({ok:response.ok,data:await response.json()}))
      .then(({ok,data})=>{if(active)setAccess({loading:false,active:Boolean(ok&&data.active),gatewayConfigured:data.gatewayConfigured!==false,expiresAt:data.expiresAt||null})})
      .catch(()=>{if(active)setAccess({loading:false,active:false,gatewayConfigured:false,expiresAt:null})})
    return()=>{active=false}
  },[])
  const totalMinutes=useMemo(()=>defaultPlan.reduce((sum,item)=>sum+(done.includes(item.id)?item.minutes:0),0),[done])

  function toggle(id){
    setDone(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[...current,id]
      if(next.length===defaultPlan.length&&current.length!==defaultPlan.length){setStreak(v=>{const n=v+1;localStorage.setItem('allegro-academy-streak',String(n));return n})}
      return next
    })
  }

  if(access.loading)return <main className="ma-learner"><section className="ma-learner-hero"><div><span className="ma-kicker">MY LEARNING</span><h1>Checking your Academy pass…</h1><p>Securely confirming access on this device.</p></div><Link className="ma-secondary" to="/music-academy">Back to Academy</Link></section></main>

  if(!access.active)return <main className="ma-learner">
    <section className="ma-learner-hero">
      <div><span className="ma-kicker">ALL ACCESS</span><h1>Unlock My Learning.</h1><p>{access.gatewayConfigured?'The learner dashboard is included in the R99 30-day All Access pass. Your free Sight Reading Gym and Rhythm Lab remain open.':'The paid dashboard is ready, but the secure iKhokha production credentials still need to be activated on this host. Your free Academy tools remain open.'}</p></div>
      <Link className="ma-secondary" to="/music-academy">Back to Academy</Link>
    </section>
    <div className="ma-learning-stage" aria-hidden="true"><span>🎹</span><i>♪</i><span>🎸</span><i>♫</i><span>🎻</span><i>♩</i><span>🥁</span><i>♬</i><span>🎷</span><i>♪</i><span>🎺</span><i>𝄞</i><span>🎙️</span></div>
    <section className="ma-next-lessons">
      <article><span className="ma-kicker">FREE</span><h3>Sight Reading Gym</h3><p>Keep training notes, pitch and MIDI/microphone input without paying.</p><Link to="/music-academy#sight-reading">Practise free →</Link></article>
      <article><span className="ma-kicker">ALL ACCESS</span><h3>R99 / 30 days</h3><p>Unlock structured learning, daily plans, progress tracking and the complete instrument-school journey.</p><Link to="/music-academy#pricing">Get the pass →</Link></article>
      <article><span className="ma-kicker">PAYMENT HELP</span><h3>Already paid?</h3><p>Use the confirmation page from iKhokha or contact us with your transaction reference. Do not send card details.</p><a href="mailto:info@izakhonoafrica.co.za?subject=ALLEGRO%20Music%20Academy%20payment%20query">Get help →</a></article>
    </section>
  </main>

  return <main className="ma-learner">
    <section className="ma-learner-hero">
      <div><span className="ma-kicker">MY LEARNING</span><h1>Practice with purpose.</h1><p>Your All Access dashboard keeps practice progress on this device. Your 30-day pass is active{access.expiresAt?` until ${new Date(access.expiresAt).toLocaleDateString()}.`: '.'}</p></div>
      <Link className="ma-secondary" to="/music-academy">Back to Academy</Link>
    </section>
    <div className="ma-learning-stage" aria-hidden="true"><span>🎹</span><i>♪</i><span>🎸</span><i>♫</i><span>🎻</span><i>♩</i><span>🥁</span><i>♬</i><span>🎷</span><i>♪</i><span>🎺</span><i>𝄞</i><span>🎙️</span></div>
    <section className="ma-dashboard-grid">
      <article className="ma-progress-card"><span>Today’s progress</span><strong>{progress}%</strong><div className="ma-progress-track"><i style={{width:`${progress}%`}}/></div><small>{completed}/{defaultPlan.length} activities · {totalMinutes} minutes</small></article>
      <article><span>Practice streak</span><strong>{streak}</strong><small>completed practice days</small></article>
      <article><span>Current instrument</span><select value={instrument} onChange={e=>setInstrument(e.target.value)}><option>Piano</option><option>Guitar</option><option>Voice</option><option>Drums</option><option>Violin</option><option>Saxophone</option><option>Trumpet</option><option>Marimba</option></select></article>
    </section>
    <section className="ma-today">
      <div className="ma-section-heading"><div><span className="ma-kicker">30-MINUTE CORE ROUTINE</span><h2>Today’s practice</h2></div><p>Short enough to repeat daily; balanced enough to move musicianship forward.</p></div>
      <div className="ma-task-list">{defaultPlan.map(item=><button key={item.id} className={done.includes(item.id)?'done':''} onClick={()=>toggle(item.id)}><span>{done.includes(item.id)?'✓':'○'}</span><div><b>{item.title}</b><small>{item.area} · {item.minutes} min</small></div></button>)}</div>
    </section>
    <section className="ma-next-lessons">
      <article><span className="ma-kicker">READING</span><h3>Daily Sight Reading</h3><p>Train note recognition, then play the note with MIDI or microphone input.</p><Link to="/music-academy#sight-reading">Open trainer →</Link></article>
      <article><span className="ma-kicker">RHYTHM</span><h3>Pulse & Time</h3><p>Use the Rhythm Lab at a comfortable tempo and keep four clean bars in a row.</p><Link to="/music-academy">Open Rhythm Lab →</Link></article>
      <article><span className="ma-kicker">FULL SCHOOL</span><h3>R99 All Access</h3><p>Complete instrument pathways, guided practice and future advanced coaching for 30 days.</p><Link to="/music-academy#pricing">View plan →</Link></article>
    </section>
  </main>
}
