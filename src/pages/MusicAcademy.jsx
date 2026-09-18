import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const instrumentGroups = [
  { icon:'♬', title:'Keys', instruments:['Piano','Keyboard','Organ','Accordion'] },
  { icon:'🎸', title:'Guitars', instruments:['Acoustic Guitar','Electric Guitar','Classical Guitar','Bass Guitar','Ukulele','Banjo','Mandolin'] },
  { icon:'🥁', title:'Drums & Percussion', instruments:['Drum Kit','African Drums','Djembe','Cajón','Marimba','Xylophone','Timpani','Percussion'] },
  { icon:'🎻', title:'Strings', instruments:['Violin','Viola','Cello','Double Bass','Harp'] },
  { icon:'🎷', title:'Woodwind', instruments:['Saxophone','Clarinet','Flute','Oboe','Bassoon','Recorder'] },
  { icon:'🎺', title:'Brass', instruments:['Trumpet','Trombone','French Horn','Tuba','Euphonium','Cornet'] },
  { icon:'🎤', title:'Voice', instruments:['Singing','Choir','Vocal Technique','Harmony'] },
  { icon:'🌍', title:'African Instruments', instruments:['Mbira','Uhadi','Marimba','Kora','Kalimba','African Percussion'] },
]

const trebleNotes = [
  {name:'C', octave:4, step:0},{name:'D',octave:4,step:1},{name:'E',octave:4,step:2},{name:'F',octave:4,step:3},
  {name:'G',octave:4,step:4},{name:'A',octave:4,step:5},{name:'B',octave:4,step:6},{name:'C',octave:5,step:7},
  {name:'D',octave:5,step:8},{name:'E',octave:5,step:9},{name:'F',octave:5,step:10},{name:'G',octave:5,step:11},
]
const bassNotes = [
  {name:'E',octave:2,step:0},{name:'F',octave:2,step:1},{name:'G',octave:2,step:2},{name:'A',octave:2,step:3},
  {name:'B',octave:2,step:4},{name:'C',octave:3,step:5},{name:'D',octave:3,step:6},{name:'E',octave:3,step:7},
  {name:'F',octave:3,step:8},{name:'G',octave:3,step:9},{name:'A',octave:3,step:10},{name:'B',octave:3,step:11},
]

function SightReadingGym(){
  const [clef,setClef]=useState('treble')
  const [difficulty,setDifficulty]=useState('Foundation')
  const [index,setIndex]=useState(4)
  const [score,setScore]=useState(0)
  const [attempts,setAttempts]=useState(0)
  const [feedback,setFeedback]=useState('Name the note on the staff.')
  const notes=clef==='treble'?trebleNotes:bassNotes
  const note=notes[index % notes.length]
  const answerChoices=useMemo(()=>['C','D','E','F','G','A','B'],[])

  function next(){
    const jump=difficulty==='Foundation'?1:difficulty==='Intermediate'?3:5
    setIndex(v=>(v+jump+Math.floor(Math.random()*3))%notes.length)
  }
  function answer(value){
    const ok=value===note.name
    setAttempts(v=>v+1)
    if(ok){
      setScore(v=>v+1)
      setFeedback('Correct — great reading. Next note!')
      window.setTimeout(next,300)
    }else{
      setFeedback(`Not quite. That note is ${note.name}${note.octave}. Try the next one.`)
      window.setTimeout(next,650)
    }
  }
  const accuracy=attempts?Math.round((score/attempts)*100):0
  const noteBottom=22 + note.step*6.1

  return <section className="ma-gym" id="sight-reading">
    <div className="ma-section-heading">
      <div><span className="ma-kicker">FLAGSHIP TRAINER</span><h2>Sight Reading Gym</h2></div>
      <p>Read a fresh note, answer instantly and build speed. No instrument is required to start.</p>
    </div>
    <div className="ma-gym-grid">
      <div className="ma-trainer">
        <div className="ma-controls">
          <label>Clef<select value={clef} onChange={e=>{setClef(e.target.value);setIndex(4)}}><option value="treble">Treble</option><option value="bass">Bass</option></select></label>
          <label>Level<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
        </div>
        <div className="ma-staff" aria-label={`${clef} clef sight-reading note`}>
          <div className="ma-clef">{clef==='treble'?'𝄞':'𝄢'}</div>
          {[0,1,2,3,4].map(line=><span key={line} className="ma-staff-line" style={{bottom:`${31+line*12.2}px`}} />)}
          <span className="ma-note" style={{bottom:`${noteBottom}px`}}>●<i /></span>
        </div>
        <div className="ma-answer-row">{answerChoices.map(choice=><button key={choice} onClick={()=>answer(choice)}>{choice}</button>)}</div>
        <p className="ma-feedback">{feedback}</p>
      </div>
      <aside className="ma-scorecard">
        <span className="ma-kicker">TODAY'S PRACTICE</span>
        <strong>{accuracy}%</strong><small>accuracy</small>
        <div><b>{score}</b><span>correct</span></div>
        <div><b>{attempts}</b><span>attempts</span></div>
        <p>Next upgrades: rhythm reading, time signatures, key signatures, rests, dynamics, chord reading and microphone/MIDI assessment.</p>
      </aside>
    </div>
  </section>
}

function Teacher(){
  const [question,setQuestion]=useState('')
  const [answer,setAnswer]=useState('Ask about notes, rhythm, chords, scales, clefs or practice technique.')
  function ask(){
    const q=question.toLowerCase()
    if(q.includes('bass clef')) setAnswer('Bass clef is used for lower notes. Start by memorising the line notes G–B–D–F–A and space notes A–C–E–G, then practise them in the Sight Reading Gym.')
    else if(q.includes('treble')) setAnswer('Treble clef centres around G above middle C. Learn E–G–B–D–F on the lines and F–A–C–E in the spaces, then read short patterns instead of isolated notes.')
    else if(q.includes('chord')) setAnswer('Build chords by stacking thirds. A major triad uses root, major third and perfect fifth. On piano, try C–E–G; on guitar, learn the matching C major shape.')
    else if(q.includes('rhythm')) setAnswer('Count the pulse out loud first. Clap the rhythm before playing it, keep the beat steady, then add notes only when the rhythm is secure.')
    else setAnswer('Good question. Break it into one small skill, practise slowly, repeat accurately five times, then increase the tempo. The full AI tutor will listen to playing and give note-by-note feedback.')
  }
  return <section className="ma-teacher" id="ai-teacher">
    <div><span className="ma-kicker">YOUR DIGITAL MUSIC COACH</span><h2>Ask the Music Teacher</h2><p>Get immediate explanations while you learn. The first release includes guided theory answers; live listening and MIDI feedback are the next layer.</p></div>
    <div className="ma-teacher-box">
      <label htmlFor="music-question">What do you want to learn?</label>
      <div className="ma-question-row"><input id="music-question" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="e.g. How do I read bass clef?" /><button onClick={ask}>Ask</button></div>
      <p>{answer}</p>
    </div>
  </section>
}

export default function MusicAcademy(){
  const [query,setQuery]=useState('')
  const visible=instrumentGroups.map(group=>({...group,instruments:group.instruments.filter(i=>i.toLowerCase().includes(query.toLowerCase()))})).filter(g=>g.instruments.length)

  return <main className="music-academy">
    <section className="ma-hero">
      <div className="ma-hero-copy">
        <span className="ma-kicker">ALLEGRO MUSIC ACADEMY</span>
        <h1>Learn an instrument.<br/><em>Read music for real.</em></h1>
        <p>A complete digital music school for instruments, voice, theory, ear training and sight reading — from first note to performance.</p>
        <div className="ma-actions"><a className="ma-primary" href="#sight-reading">Start Sight Reading Free</a><a className="ma-secondary" href="#instruments">Choose an Instrument</a></div>
        <div className="ma-trust"><span>✓ Beginner friendly</span><span>✓ Learn on phone</span><span>✓ Practical + theory</span><span>✓ African + global instruments</span></div>
      </div>
      <div className="ma-hero-visual" aria-hidden="true">
        <div className="ma-orbit orbit-one">♩</div><div className="ma-orbit orbit-two">♫</div><div className="ma-orbit orbit-three">♬</div>
        <div className="ma-disc"><span>ALLEGRO</span><b>MUSIC</b><small>ACADEMY</small></div>
      </div>
    </section>

    <section className="ma-promise">
      <article><strong>01</strong><h3>Learn</h3><p>Structured instrument and vocal pathways from foundation to advanced.</p></article>
      <article><strong>02</strong><h3>Read</h3><p>Unlimited sight-reading drills for clefs, rhythm, keys, chords and notation.</p></article>
      <article><strong>03</strong><h3>Play</h3><p>Practice routines, technique, repertoire, ear training and performance skills.</p></article>
      <article><strong>04</strong><h3>Perform</h3><p>Progress toward recording, live performance and creator opportunities across Allegro.</p></article>
    </section>

    <SightReadingGym/>

    <section className="ma-instruments" id="instruments">
      <div className="ma-section-heading">
        <div><span className="ma-kicker">INSTRUMENT SCHOOLS</span><h2>Choose what you want to master</h2></div>
        <div className="ma-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search instruments…" /></div>
      </div>
      <div className="ma-instrument-grid">{visible.map(group=><article key={group.title}><div className="ma-instrument-icon">{group.icon}</div><h3>{group.title}</h3><p>{group.instruments.join(' · ')}</p><button type="button">Explore pathway <span>→</span></button></article>)}</div>
    </section>

    <Teacher/>

    <section className="ma-roadmap">
      <span className="ma-kicker">ONE LEARNING JOURNEY</span><h2>From first note to stage-ready</h2>
      <div className="ma-levels">{['Foundation','Beginner','Intermediate','Advanced','Performance'].map((level,i)=><article key={level}><span>0{i+1}</span><h3>{level}</h3><p>{i===0?'Music basics, pulse, note names and instrument setup.':i===1?'Technique, simple repertoire, reading and ear training.':i===2?'Scales, chords, ensemble skills and fluent reading.':i===3?'Advanced technique, interpretation and improvisation.':'Auditions, recording preparation and live performance.'}</p></article>)}</div>
    </section>

    <section className="ma-final">
      <div><span className="ma-kicker">LEARN → PRACTISE → PERFORM → CREATE</span><h2>Your music journey can start today.</h2><p>Begin with the free Sight Reading Gym, then choose an instrument pathway as the academy expands.</p></div>
      <div className="ma-actions"><a className="ma-primary" href="#sight-reading">Train Now</a><Link className="ma-secondary" to="/creator-hub">Explore Allegro</Link></div>
    </section>
  </main>
}
