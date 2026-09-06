import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/radioAcademy.css'

const fallback=[
  ['radio-presenting','Radio Presenting & On-Air Performance','Voice, links, timing, audience connection, interviews and live-show discipline.','FOUNDATION','24h'],
  ['radio-production','Radio Production & Programming','Show clocks, music scheduling, jingles, editing and autopilot programming.','FOUNDATION','30h'],
  ['radio-technical','Internet Radio Technical Operations','Streaming, live ingest, monitoring, failover, audio levels and owner-node operations.','INTERMEDIATE','30h'],
  ['radio-advertising','Radio Advertising & Sponsorship Sales','Prospecting, packages, rate cards, scripts, sponsorships and proof-of-play.','FOUNDATION','20h'],
  ['radio-rights','Music Rights, Compliance & Logging','Direct rights, metadata, playout evidence, advertising rules and privacy basics.','FOUNDATION','16h'],
  ['radio-news-interviews','Interviewing, Newsroom & Storytelling','Research, verification, interviews, scripting and responsible storytelling.','INTERMEDIATE','24h'],
  ['radio-dj-live','DJ, Live Sessions & Artist Showcases','Live sets, artist sessions, transitions, simulcasts and live takeover.','INTERMEDIATE','24h'],
  ['radio-management','Station Management & Autopilot Operations','Programming, revenue, people, analytics, incidents and 24/7 governance.','ADVANCED','36h']
].map(([slug,title,summary,level,duration])=>({slug,title,summary,level,duration}))

export default function RadioAcademy({session}){
  const[programs,setPrograms]=useState(fallback)
  const[message,setMessage]=useState('')
  const[busy,setBusy]=useState('')
  useEffect(()=>{let active=true;(async()=>{
    if(!supabase)return
    const{data}=await supabase.from('radio_academy_programs').select('id,slug,title,summary,level,duration_hours,price_cents').eq('active',true).order('sort_order')
    if(active&&data?.length)setPrograms(data.map(p=>({...p,level:String(p.level).toUpperCase(),duration:p.duration_hours+'h'})))
  })();return()=>{active=false}},[])

  async function enroll(program){
    if(!session){setMessage('Log in or create an ALLEGRO account to enrol.');return}
    if(!supabase||!program.id){setMessage('Academy enrolment will activate when the training database is deployed.');return}
    setBusy(program.slug);setMessage('')
    const{error}=await supabase.from('radio_academy_enrollments').insert({user_id:session.user.id,program_id:program.id})
    setBusy('')
    if(error){
      if(String(error.code)==='23505')setMessage('You are already enrolled in this programme.')
      else setMessage(error.message||'Could not enrol yet.')
      return
    }
    setMessage('Enrolment recorded. Your learner workspace will be activated in the next Academy release.')
  }

  return <main className="academy-page">
    <section className="academy-hero">
      <div className="academy-kicker">ALLEGRO RADIO ACADEMY • LEARN • PRACTISE • GO LIVE</div>
      <h1>Don’t just listen to radio.<br/><em>Learn to run it.</em></h1>
      <p>Training built inside a real digital station: presenting, production, engineering, advertising, rights, interviewing, DJ performance and station management.</p>
      <div className="academy-actions"><a href="#programmes" className="primary">Explore training</a>{session&&<Link to="/radio-academy/my-learning" className="secondary">My Learning</Link>}<Link to="/radio" className="secondary">Listen to ALLEGRO Radio</Link></div>
    </section>

    <section className="academy-pipeline">
      <article><b>01</b><h3>Learn</h3><p>Short lessons, demonstrations and guided practice.</p></article>
      <article><b>02</b><h3>Practise</h3><p>Studio simulations, sales drills and technical exercises.</p></article>
      <article><b>03</b><h3>Go live</h3><p>Eligible learners progress to supervised ALLEGRO practical shifts.</p></article>
      <article><b>04</b><h3>Build a career</h3><p>Create a portfolio for presenter, producer, sales, technical and management opportunities.</p></article>
    </section>

    <section className="academy-programmes" id="programmes">
      <div className="academy-heading"><span>TRAINING PATHWAYS</span><h2>Build the whole station team.</h2></div>
      {message&&<div className="academy-notice">{message}</div>}
      <div className="academy-grid">{programs.map(p=><article key={p.slug}>
        <div className="academy-meta"><span>{p.level}</span><span>{p.duration}</span></div>
        <h3>{p.title}</h3><p>{p.summary}</p>
        <button onClick={()=>enroll(p)} disabled={busy===p.slug}>{busy===p.slug?'Enrolling…':'Enrol / register interest'}</button>
      </article>)}</div>
    </section>

    <section className="academy-practical"><div><span>REAL-STATION PRACTICALS</span><h2>Training feeds the broadcast.</h2></div><p>Top learners can move into supervised practical shifts, trainee presenter slots, production assistance, ad-sales internships and technical operations. Completion never guarantees employment.</p></section>

    <section className="academy-boundary"><strong>Training status:</strong> ALLEGRO Radio Academy is currently an internal industry-skills programme. Certificates must be described as ALLEGRO certificates of completion/competence, not SAQA/QCTO-accredited qualifications unless formal accreditation is later obtained.</section>
  </main>
}
