import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const instrumentGroups = [
  { icon:'♬', title:'Keys', accent:'Piano · Keyboard · Organ', instruments:['Piano','Keyboard','Organ','Accordion'], focus:['Posture & fingering','Scales & chords','Sight reading','Repertoire'] },
  { icon:'🎸', title:'Guitars', accent:'Acoustic · Electric · Bass', instruments:['Acoustic Guitar','Electric Guitar','Classical Guitar','Bass Guitar','Ukulele','Banjo','Mandolin'], focus:['Fretboard map','Chords & rhythm','Lead technique','Reading & tabs'] },
  { icon:'🥁', title:'Drums & Percussion', accent:'Kit · African · Orchestral', instruments:['Drum Kit','African Drums','Djembe','Cajón','Marimba','Xylophone','Timpani','Percussion'], focus:['Pulse & subdivision','Grooves','Coordination','Ensemble playing'] },
  { icon:'🎻', title:'Strings', accent:'Violin · Viola · Cello', instruments:['Violin','Viola','Cello','Double Bass','Harp'], focus:['Bow control','Intonation','Position work','Orchestral reading'] },
  { icon:'🎷', title:'Woodwind', accent:'Sax · Clarinet · Flute', instruments:['Saxophone','Clarinet','Flute','Oboe','Bassoon','Recorder'], focus:['Breath support','Embouchure','Scales','Band reading'] },
  { icon:'🎺', title:'Brass', accent:'Trumpet · Trombone · Tuba', instruments:['Trumpet','Trombone','French Horn','Tuba','Euphonium','Cornet'], focus:['Air & tone','Lip flexibility','Range','Ensemble reading'] },
  { icon:'🎤', title:'Voice', accent:'Solo · Choir · Harmony', instruments:['Singing','Choir','Vocal Technique','Harmony'], focus:['Breathing','Pitch & tone','Harmony','Performance'] },
  { icon:'🌍', title:'African Instruments', accent:'Mbira · Kora · Uhadi', instruments:['Mbira','Uhadi','Marimba','Kora','Kalimba','African Percussion'], focus:['Traditional technique','Rhythm language','Ensemble skills','Contemporary fusion'] },
]

const trebleNotes = [
  {name:'C', octave:4, step:0,midi:60},{name:'D',octave:4,step:1,midi:62},{name:'E',octave:4,step:2,midi:64},{name:'F',octave:4,step:3,midi:65},
  {name:'G',octave:4,step:4,midi:67},{name:'A',octave:4,step:5,midi:69},{name:'B',octave:4,step:6,midi:71},{name:'C',octave:5,step:7,midi:72},
  {name:'D',octave:5,step:8,midi:74},{name:'E',octave:5,step:9,midi:76},{name:'F',octave:5,step:10,midi:77},{name:'G',octave:5,step:11,midi:79},
]
const bassNotes = [
  {name:'E',octave:2,step:0,midi:40},{name:'F',octave:2,step:1,midi:41},{name:'G',octave:2,step:2,midi:43},{name:'A',octave:2,step:3,midi:45},
  {name:'B',octave:2,step:4,midi:47},{name:'C',octave:3,step:5,midi:48},{name:'D',octave:3,step:6,midi:50},{name:'E',octave:3,step:7,midi:52},
  {name:'F',octave:3,step:8,midi:53},{name:'G',octave:3,step:9,midi:55},{name:'A',octave:3,step:10,midi:57},{name:'B',octave:3,step:11,midi:59},
]

const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
function midiLabel(midi){return `${noteNames[midi%12]}${Math.floor(midi/12)-1}`}
function frequencyToMidi(freq){return Math.round(69+12*Math.log2(freq/440))}
function autoCorrelate(buffer,sampleRate){
  let rms=0
  for(let i=0;i<buffer.length;i++)rms+=buffer[i]*buffer[i]
  rms=Math.sqrt(rms/buffer.length)
  if(rms<0.015)return -1
  let bestOffset=-1,bestCorrelation=0
  const max=Math.floor(buffer.length/2)
  for(let offset=24;offset<max;offset++){
    let corr=0
    for(let i=0;i<max;i++)corr+=Math.abs(buffer[i]-buffer[i+offset])
    corr=1-corr/max
    if(corr>bestCorrelation){bestCorrelation=corr;bestOffset=offset}
  }
  return bestCorrelation>.82?sampleRate/bestOffset:-1
}

function PracticeListening({targetMidi,onCorrect}){
  const [micState,setMicState]=useState('idle')
  const [midiState,setMidiState]=useState('idle')
  const [heard,setHeard]=useState('—')
  const cleanupRef=useRef(()=>{})
  const targetRef=useRef(targetMidi)
  const lastHitRef=useRef(0)
  useEffect(()=>{targetRef.current=targetMidi},[targetMidi])
  useEffect(()=>()=>cleanupRef.current(),[])

  function acceptMidi(midi){
    setHeard(midiLabel(midi))
    if(midi===targetRef.current&&Date.now()-lastHitRef.current>700){lastHitRef.current=Date.now();onCorrect('Played correctly')}
  }

  async function connectMidi(){
    if(!navigator.requestMIDIAccess){setMidiState('unsupported');return}
    try{
      const access=await navigator.requestMIDIAccess()
      const handler=e=>{const [status,note,velocity]=e.data||[];if((status&0xf0)===0x90&&velocity>0)acceptMidi(note)}
      access.inputs.forEach(input=>{input.onmidimessage=handler})
      access.onstatechange=()=>access.inputs.forEach(input=>{input.onmidimessage=handler})
      setMidiState(access.inputs.size?'connected':'waiting')
    }catch{setMidiState('blocked')}
  }

  async function startMic(){
    cleanupRef.current()
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const context=new AudioContext()
      const analyser=context.createAnalyser()
      analyser.fftSize=2048
      context.createMediaStreamSource(stream).connect(analyser)
      const buffer=new Float32Array(analyser.fftSize)
      let raf=0
      const tick=()=>{
        analyser.getFloatTimeDomainData(buffer)
        const frequency=autoCorrelate(buffer,context.sampleRate)
        if(frequency>0){
          const midi=frequencyToMidi(frequency)
          setHeard(midiLabel(midi))
          if(midi===targetRef.current&&Date.now()-lastHitRef.current>900){lastHitRef.current=Date.now();onCorrect('Microphone heard the correct pitch')}
        }
        raf=requestAnimationFrame(tick)
      }
      tick()
      cleanupRef.current=()=>{cancelAnimationFrame(raf);stream.getTracks().forEach(track=>track.stop());context.close().catch(()=>{})}
      setMicState('listening')
    }catch{setMicState('blocked')}
  }

  return <div className="ma-live-input">
    <div><span>Play it instead</span><strong>Target {midiLabel(targetMidi)}</strong></div>
    <div className="ma-live-actions">
      <button type="button" onClick={connectMidi}>🎹 {midiState==='connected'?'MIDI connected':midiState==='unsupported'?'MIDI unavailable':'Connect MIDI'}</button>
      <button type="button" onClick={startMic}>🎙 {micState==='listening'?'Listening…':micState==='blocked'?'Mic blocked':'Use microphone'}</button>
    </div>
    <small>Heard: <b>{heard}</b> · MIDI is most accurate. Microphone pitch detection works best with one sustained note at a time.</small>
  </div>
}

function SightReadingGym(){
  const [clef,setClef]=useState('treble')
  const [difficulty,setDifficulty]=useState('Foundation')
  const [index,setIndex]=useState(4)
  const [score,setScore]=useState(0)
  const [attempts,setAttempts]=useState(0)
  const [streak,setStreak]=useState(0)
  const [feedback,setFeedback]=useState('Name the note on the staff — or play it.')
  const notes=clef==='treble'?trebleNotes:bassNotes
  const note=notes[index % notes.length]
  const answerChoices=useMemo(()=>['C','D','E','F','G','A','B'],[])

  function next(){
    const jump=difficulty==='Foundation'?1:difficulty==='Intermediate'?3:5
    setIndex(v=>(v+jump+Math.floor(Math.random()*4))%notes.length)
  }
  function mark(ok,label){
    setAttempts(v=>v+1)
    if(ok){
      setScore(v=>v+1);setStreak(v=>v+1);setFeedback(`${label||'Correct'} — next note!`)
      window.setTimeout(next,320)
    }else{
      setStreak(0);setFeedback(`That one is ${note.name}${note.octave}. Keep reading forward.`)
      window.setTimeout(next,700)
    }
  }
  const accuracy=attempts?Math.round((score/attempts)*100):0
  const noteBottom=22+note.step*6.1

  return <section className="ma-gym" id="sight-reading">
    <div className="ma-section-heading">
      <div><span className="ma-kicker">FREE FLAGSHIP TRAINER</span><h2>Sight Reading Gym</h2></div>
      <p>Read, answer or play the note. Build recognition first, then connect a MIDI keyboard or use your microphone for live pitch practice.</p>
    </div>
    <div className="ma-gym-grid">
      <div className="ma-trainer">
        <div className="ma-controls">
          <label>Clef<select value={clef} onChange={e=>{setClef(e.target.value);setIndex(4);setStreak(0)}}><option value="treble">Treble</option><option value="bass">Bass</option></select></label>
          <label>Level<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
        </div>
        <div className="ma-staff" aria-label={`${clef} clef sight-reading note`}>
          <div className="ma-clef">{clef==='treble'?'𝄞':'𝄢'}</div>
          {[0,1,2,3,4].map(line=><span key={line} className="ma-staff-line" style={{bottom:`${31+line*12.2}px`}} />)}
          <span className="ma-note" style={{bottom:`${noteBottom}px`}}>●<i /></span>
        </div>
        <div className="ma-answer-row">{answerChoices.map(choice=><button key={choice} type="button" onClick={()=>mark(choice===note.name)}>{choice}</button>)}</div>
        <p className="ma-feedback">{feedback}</p>
        <PracticeListening targetMidi={note.midi} onCorrect={label=>mark(true,label)}/>
      </div>
      <aside className="ma-scorecard">
        <span className="ma-kicker">LIVE PRACTICE</span>
        <strong>{accuracy}%</strong><small>accuracy</small>
        <div><b>{score}</b><span>correct</span></div>
        <div><b>{attempts}</b><span>attempts</span></div>
        <div><b>{streak}</b><span>streak</span></div>
        <p>Free practice stays open. Paid learners unlock complete instrument curricula, guided exercises, progress tracking and advanced coaching.</p>
      </aside>
    </div>
  </section>
}

function RhythmLab(){
  const [bpm,setBpm]=useState(80)
  const [running,setRunning]=useState(false)
  const [beat,setBeat]=useState(0)
  const audioRef=useRef(null)
  useEffect(()=>{
    if(!running)return
    const id=setInterval(()=>{
      setBeat(v=>(v+1)%4)
      try{
        const ctx=audioRef.current||(audioRef.current=new AudioContext())
        const osc=ctx.createOscillator(),gain=ctx.createGain()
        osc.frequency.value=beat===0?880:660;gain.gain.value=.05
        osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.045)
      }catch{audioRef.current=null}
    },60000/bpm)
    return()=>clearInterval(id)
  },[running,bpm,beat])
  return <section className="ma-rhythm">
    <div><span className="ma-kicker">RHYTHM LAB</span><h2>Feel the beat before you fight the notes.</h2><p>Train steady pulse, subdivision and time feel with a simple built-in metronome.</p></div>
    <div className="ma-metronome">
      <div className="ma-beats">{[0,1,2,3].map(i=><span key={i} className={beat===i&&running?'active':''}>{i+1}</span>)}</div>
      <strong>{bpm}<small> BPM</small></strong>
      <input aria-label="Tempo" type="range" min="40" max="200" value={bpm} onChange={e=>setBpm(Number(e.target.value))}/>
      <button type="button" onClick={()=>setRunning(v=>!v)}>{running?'Stop':'Start metronome'}</button>
    </div>
  </section>
}

function Teacher(){
  const [question,setQuestion]=useState('')
  const [answer,setAnswer]=useState('Ask about notes, rhythm, chords, scales, clefs, practice technique or how to start an instrument.')
  function ask(){
    const q=question.trim().toLowerCase()
    if(!q){setAnswer('Type a music question and I will point you in the right direction.');return}
    if(q.includes('bass clef')) setAnswer('Bass clef covers the lower register. Learn line notes G–B–D–F–A and spaces A–C–E–G, then stop naming notes one by one and start recognising intervals and shapes.')
    else if(q.includes('treble')) setAnswer('Treble clef centres around G above middle C. Learn E–G–B–D–F on the lines and F–A–C–E in the spaces, then practise short patterns at a steady pulse.')
    else if(q.includes('chord')) setAnswer('Build basic triads by stacking thirds. A major triad is root + major third + perfect fifth. C major is C–E–G. Learn the sound, the shape and the notation together.')
    else if(q.includes('rhythm')||q.includes('tempo')) setAnswer('Separate rhythm from pitch. Clap or tap the passage first with the metronome, count subdivisions aloud, then add the notes once the pulse is stable.')
    else if(q.includes('scale')) setAnswer('Practise scales slowly with even tone and consistent fingering. Say the scale degrees as you play and connect the scale to its key signature and primary chords.')
    else if(q.includes('start')||q.includes('beginner')) setAnswer('Start with posture/setup, pulse, three to five notes, one simple tune and daily sight-reading. Ten accurate minutes every day beats one long session once a week.')
    else setAnswer('Break the skill into one measurable task, practise slowly enough to stay accurate, repeat it correctly five times, then increase tempo or complexity by one small step.')
  }
  return <section className="ma-teacher" id="ai-teacher">
    <div><span className="ma-kicker">DIGITAL MUSIC COACH</span><h2>Ask the Music Teacher</h2><p>Instant guidance sits beside every learning pathway. This release keeps coaching on-device and predictable; richer conversational tutoring can be connected later without changing the learner flow.</p></div>
    <div className="ma-teacher-box">
      <label htmlFor="music-question">What do you want to learn?</label>
      <div className="ma-question-row"><input id="music-question" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="e.g. How do I read bass clef?" /><button type="button" onClick={ask}>Ask</button></div>
      <p>{answer}</p>
    </div>
  </section>
}

function Pricing(){
  return <section className="ma-pricing" id="pricing">
    <div className="ma-section-heading">
      <div><span className="ma-kicker">SIMPLE LAUNCH PRICING</span><h2>Start free. Upgrade when you’re ready.</h2></div>
      <p>No paywall on the basics. The R99 launch plan is for learners who want the complete school experience.</p>
    </div>
    <div className="ma-price-grid">
      <article><span className="ma-plan">FREE</span><strong>R0</strong><small>forever</small><ul><li>✓ Sight Reading Gym</li><li>✓ Treble & bass clef drills</li><li>✓ Rhythm Lab</li><li>✓ Instrument previews</li><li>✓ Basic Music Teacher</li></ul><a href="#sight-reading" className="ma-secondary">Start practising</a></article>
      <article className="featured"><span className="ma-badge">LAUNCH PLAN</span><span className="ma-plan">ALL ACCESS</span><strong>R99</strong><small>/ month</small><ul><li>✓ All instrument pathways</li><li>✓ Full sight-reading programme</li><li>✓ Theory + ear training</li><li>✓ Guided practice plans</li><li>✓ Progress & learning dashboard</li><li>✓ Advanced coaching features as released</li></ul><Link to="/register?plan=music-academy-r99" className="ma-primary">Join for R99/month</Link><em>Checkout activation follows Allegro’s production payment-acceptance gate.</em></article>
    </div>
  </section>
}

export default function MusicAcademy(){
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState(null)
  const visible=instrumentGroups.map(group=>({...group,instruments:group.instruments.filter(i=>i.toLowerCase().includes(query.toLowerCase()))})).filter(g=>g.instruments.length)

  return <main className="music-academy">
    <section className="ma-cinematic-hero">
      <div className="ma-stage-haze" aria-hidden="true"/>
      <div className="ma-floating-score" aria-hidden="true">
        <span>♪</span><span>♫</span><span>♩</span><span>♬</span><span>𝄞</span><span>♪</span><span>♫</span>
      </div>
      <div className="ma-title-lockup">
        <span className="ma-kicker">ALLEGRO MUSIC ACADEMY</span>
        <h1><span>ALLEGRO</span><small>MUSIC ACADEMY</small></h1>
        <p className="ma-stage-tagline">Learn <i>•</i> Read <i>•</i> Play <i>•</i> Perform</p>
        <p className="ma-stage-intro">A complete digital music school for instruments, voice, theory, rhythm, ear training and sight reading — from your first note to confident performance.</p>
        <div className="ma-actions"><a className="ma-primary" href="#sight-reading">Start Free</a><a className="ma-secondary" href="#instruments">Choose an Instrument</a><Link className="ma-secondary" to="/music-academy/my-learning">My Learning</Link></div>
        <div className="ma-trust"><span>✓ Free practice tools</span><span>✓ Learn on phone</span><span>✓ MIDI + microphone</span><span>✓ African + global instruments</span></div>
      </div>
      <div className="ma-stage-instruments" aria-hidden="true">
        <div className="ma-stage-piece ma-piano"><span>🎹</span><b>PIANO</b></div>
        <div className="ma-stage-piece ma-guitar"><span>🎸</span><b>GUITAR</b></div>
        <div className="ma-stage-piece ma-drums"><span>🥁</span><b>DRUMS</b></div>
        <div className="ma-stage-piece ma-violin"><span>🎻</span><b>STRINGS</b></div>
        <div className="ma-stage-piece ma-sax"><span>🎷</span><b>SAX</b></div>
        <div className="ma-stage-piece ma-trumpet"><span>🎺</span><b>BRASS</b></div>
        <div className="ma-stage-piece ma-mic"><span>🎙️</span><b>VOICE</b></div>
      </div>
    </section>

    <section className="ma-promise">
      <article><strong>01</strong><h3>Learn</h3><p>Structured instrument and vocal pathways from foundation to advanced.</p></article>
      <article><strong>02</strong><h3>Read</h3><p>Unlimited note reading plus rhythm, keys, chords and notation practice.</p></article>
      <article><strong>03</strong><h3>Play</h3><p>Use screen answers, microphone pitch detection or a MIDI instrument.</p></article>
      <article><strong>04</strong><h3>Perform</h3><p>Build toward repertoire, recording, live performance and the Allegro creator ecosystem.</p></article>
    </section>

    <section className="ma-instrument-showcase" aria-label="Music Academy instruments">
      <div className="ma-showcase-copy"><span className="ma-kicker">A SCHOOL THAT LOOKS LIKE MUSIC</span><h2>Pick up an instrument. Follow the notes. Find your sound.</h2></div>
      <div className="ma-showcase-orchestra" aria-hidden="true">
        <span className="show-piano">🎹</span><span className="show-guitar">🎸</span><span className="show-violin">🎻</span><span className="show-drums">🥁</span><span className="show-sax">🎷</span><span className="show-trumpet">🎺</span><span className="show-mic">🎙️</span>
      </div>
      <div className="ma-note-stream" aria-hidden="true"><span>𝄞</span><i>♩</i><i>♪</i><i>♫</i><i>♬</i><i>♪</i><i>♩</i></div>
    </section>

    <div className="ma-keyboard-divider" aria-hidden="true"><span className=""></span><span className="black"></span><span className=""></span><span className="black"></span><span className=""></span><span className=""></span><span className="black"></span><span className=""></span><span className="black"></span><span className=""></span><span className="black"></span><span className=""></span><span className=""></span><span className="black"></span><span className=""></span><span className="black"></span><span className=""></span><span className=""></span></div>

    <SightReadingGym/>
    <RhythmLab/>

    <section className="ma-instruments" id="instruments">
      <div className="ma-section-heading">
        <div><span className="ma-kicker">INSTRUMENT SCHOOLS</span><h2>Choose what you want to master</h2></div>
        <div className="ma-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search instruments…" /></div>
      </div>
      <div className="ma-instrument-grid">{visible.map(group=><article key={group.title} className={selected===group.title?'selected':''} onClick={()=>setSelected(selected===group.title?null:group.title)}>
        <div className="ma-instrument-icon">{group.icon}</div><span className="ma-mini">{group.accent}</span><h3>{group.title}</h3><p>{group.instruments.join(' · ')}</p>
        {selected===group.title?<div className="ma-focus">{group.focus.map(item=><span key={item}>✓ {item}</span>)}</div>:<button type="button">Explore pathway <span>→</span></button>}
      </article>)}</div>
    </section>

    <section className="ma-score-ribbon" aria-label="Music notation">
      <div className="ma-score-lines" aria-hidden="true"><span/><span/><span/><span/><span/></div>
      <div className="ma-score-notes" aria-hidden="true"><b>𝄞</b><i>♩</i><i>♪</i><i>♫</i><i>♬</i><i>♩</i><i>♪</i></div>
      <div className="ma-score-copy"><span className="ma-kicker">READ THE LANGUAGE OF MUSIC</span><h2>Notes stop looking like symbols. They start sounding like music.</h2><p>Treble clef, bass clef, rhythm, time signatures, key signatures, rests, intervals, chords and eventually complete scores.</p></div>
    </section>

    <Teacher/>

    <section className="ma-roadmap">
      <span className="ma-kicker">ONE LEARNING JOURNEY</span><h2>From first note to stage-ready</h2>
      <div className="ma-levels">{['Foundation','Beginner','Intermediate','Advanced','Performance'].map((level,i)=><article key={level}><span>0{i+1}</span><h3>{level}</h3><p>{i===0?'Music basics, pulse, note names and instrument setup.':i===1?'Technique, simple repertoire, reading and ear training.':i===2?'Scales, chords, ensemble skills and fluent reading.':i===3?'Advanced technique, interpretation and improvisation.':'Auditions, recording preparation and live performance.'}</p></article>)}</div>
    </section>

    <Pricing/>

    <section className="ma-final">
      <div><span className="ma-kicker">LEARN → PRACTISE → PERFORM → CREATE</span><h2>Your music journey starts with one note.</h2><p>Use the free trainers now, then move into the complete R99/month academy when you want the full curriculum and learner dashboard.</p></div>
      <div className="ma-actions"><a className="ma-primary" href="#sight-reading">Train Now</a><a className="ma-secondary" href="#pricing">See Plans</a></div>
    </section>
  </main>
}
