import { useMemo,useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'

const types=[
  ['music_video','Music video'],
  ['live_session','Live session'],
  ['concert_film','Concert film'],
  ['artist_documentary','Artist documentary'],
  ['revival_documentary','Revival / comeback documentary'],
  ['tour_diary','Tour diary'],
  ['behind_the_scenes','Behind the scenes'],
  ['music_biopic','Music biopic'],
  ['music_movie','Music movie'],
  ['launch_film','Launch film'],
  ['interview_special','Interview special'],
]

export default function ScreenStudio({session}){
  const[title,setTitle]=useState('')
  const[synopsis,setSynopsis]=useState('')
  const[type,setType]=useState('music_video')
  const[language,setLanguage]=useState('English')
  const[rights,setRights]=useState({
    identity_and_authority_confirmed:false,
    music_rights_cleared:false,
    master_rights_cleared:false,
    performer_consents_complete:false,
    visual_material_rights_cleared:false,
    interview_releases_complete:false,
    archive_footage_cleared:false,
    stills_and_photography_cleared:false,
    script_rights_cleared:false,
    cast_releases_complete:false,
    location_rights_complete:false,
    active_dispute:false,
  })
  const[saving,setSaving]=useState(false)
  const[result,setResult]=useState(null)
  const[message,setMessage]=useState('')
  const koraUrl=import.meta.env.VITE_KORA_URL||''
  const creatorCode=session?.user?.id||''
  const documentary=useMemo(()=>['artist_documentary','revival_documentary','tour_diary','behind_the_scenes','music_biopic','interview_special'].includes(type),[type])
  const scripted=useMemo(()=>['music_movie','music_biopic'].includes(type),[type])
  function setRight(k,v){setRights(x=>({...x,[k]:v}))}

  async function submit(e){
    e.preventDefault();setSaving(true);setMessage('');setResult(null)
    if(!supabase){setSaving(false);setMessage('ALLEGRO backend is not configured.');return}
    const{data,error}=await supabase.functions.invoke('kora-video-handoff',{body:{
      title:title.trim(),synopsis:synopsis.trim(),content_type:type,primary_language:language.trim(),rights
    }})
    setSaving(false)
    if(error){setMessage(error.message||'KORA handoff failed.');return}
    setResult(data);setMessage('KORA draft created. Upload and publication remain subject to KORA rights review and moderation.')
  }

  if(!session)return <main className="page"><div className="eyebrow">ALLEGRO × KORA</div><h2>Screen Studio</h2><p>Log in to connect your creator identity and send screen content to KORA.</p></main>

  return <main className="future-home">
    <section className="future-section">
      <div className="future-section-head"><div><span>ALLEGRO × KORA</span><h2>Turn the music career into screen.</h2><p>Music videos, documentaries, movies, concert films and tour stories move to KORA through a rights-gated handoff.</p></div></div>
      <div className="artist-public-grid">
        <article><div className="eyebrow">STEP 1 · LINK ONCE</div><h2>Your ALLEGRO Creator Code</h2><code style={{wordBreak:'break-all'}}>{creatorCode}</code><p>Paste this code into your KORA creator connection page. The code identifies this ALLEGRO creator account; it is not a password.</p>{koraUrl?<a className="primary inline" href={koraUrl.replace(/\/$/,'')+'/integrations/allegro'} target="_blank" rel="noreferrer">Open KORA connection</a>:<div className="notice">KORA public connection URL will appear here when the production endpoint is activated.</div>}</article>
        <article><div className="eyebrow">STEP 2 · SEND SCREEN PROJECT</div><h2>Rights first. Then upload.</h2><p>KORA creates every handoff as a draft. Nothing is automatically public or monetised.</p></article>
      </div>
    </section>

    <section className="artist-reserve">
      <div><div className="eyebrow">SCREEN PROJECT</div><h2>Create the KORA draft.</h2><p>Complete only declarations you can genuinely support with contracts, releases or source evidence.</p></div>
      <form className="panel" onSubmit={submit}>
        <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength="180"/></label>
        <label>Content type<select value={type} onChange={e=>setType(e.target.value)}>{types.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
        <label>Primary language<input value={language} onChange={e=>setLanguage(e.target.value)} maxLength="80"/></label>
        <label>Synopsis<textarea rows="5" value={synopsis} onChange={e=>setSynopsis(e.target.value)} maxLength="3000"/></label>

        <div className="eyebrow">CORE RIGHTS</div>
        {[
          ['identity_and_authority_confirmed','I am authorised to submit this project.'],
          ['music_rights_cleared','Music/composition rights are cleared for the intended use.'],
          ['master_rights_cleared','Sound-recording/master rights are cleared.'],
          ['performer_consents_complete','Required performer/contributor consents are complete.'],
          ['visual_material_rights_cleared','Footage, artwork and other visual material are cleared.'],
        ].map(([k,l])=><label className="consent" key={k}><input type="checkbox" checked={rights[k]} onChange={e=>setRight(k,e.target.checked)}/><span>{l}</span></label>)}

        {documentary&&<><div className="eyebrow">DOCUMENTARY / ARCHIVE RIGHTS</div>{[
          ['interview_releases_complete','Interview releases are complete.'],
          ['archive_footage_cleared','Archive/third-party footage is cleared.'],
          ['stills_and_photography_cleared','Still images and photography are cleared.'],
        ].map(([k,l])=><label className="consent" key={k}><input type="checkbox" checked={rights[k]} onChange={e=>setRight(k,e.target.checked)}/><span>{l}</span></label>)}</>}

        {scripted&&<><div className="eyebrow">SCRIPTED / BIOPIC RIGHTS</div>{[
          ['script_rights_cleared','Script/story rights are cleared.'],
          ['cast_releases_complete','Cast releases are complete.'],
          ['location_rights_complete','Required location permissions are complete.'],
        ].map(([k,l])=><label className="consent" key={k}><input type="checkbox" checked={rights[k]} onChange={e=>setRight(k,e.target.checked)}/><span>{l}</span></label>)}</>}

        <label className="consent"><input type="checkbox" checked={rights.active_dispute} onChange={e=>setRight('active_dispute',e.target.checked)}/><span>There is an active rights dispute affecting this project.</span></label>
        {message&&<div className="notice">{message}</div>}
        {result?.upload?.uploadUrl&&<a className="primary inline" href={result.upload.uploadUrl} target="_blank" rel="noreferrer">Continue to secure KORA video upload</a>}
        <button className="primary" disabled={saving}>{saving?'Creating KORA draft…':'Create rights-gated KORA draft'}</button>
      </form>
    </section>
  </main>
}
