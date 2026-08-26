import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const roles = ['Primary Artist','Featured Artist','Songwriter','Composer','Producer','DJ','Vocalist','Instrumentalist','Label','Other']

export default function Rights({ session }) {
  const { releaseId } = useParams()
  const [release,setRelease]=useState(null)
  const [contributors,setContributors]=useState([])
  const [name,setName]=useState('')
  const [role,setRole]=useState('Songwriter')
  const [share,setShare]=useState('0')
  const [memberNumber,setMemberNumber]=useState('')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)

  const totalShare=useMemo(()=>contributors.reduce((sum,item)=>sum+Number(item.share_percent||0),0),[contributors])

  const load=useCallback(async()=>{
    if(!supabase||!session)return
    const [{data:releaseData},{data:contributorData}]=await Promise.all([
      supabase.from('releases').select('id,title,release_type,status').eq('id',releaseId).eq('owner_id',session.user.id).maybeSingle(),
      supabase.from('release_contributors').select('*').eq('release_id',releaseId).eq('owner_id',session.user.id).order('created_at',{ascending:true})
    ])
    setRelease(releaseData||null)
    setContributors(contributorData||[])
  },[releaseId,session])

  useEffect(()=>{load()},[load])

  async function addContributor(e){
    e.preventDefault();if(!supabase||!session)return
    const pct=Number(share)
    if(!name.trim()){setMessage('Enter the contributor name.');return}
    if(Number.isNaN(pct)||pct<0||pct>100){setMessage('Share must be between 0 and 100.');return}
    if(totalShare+pct>100.0001){setMessage(`Total ownership cannot exceed 100%. Current total is ${totalShare.toFixed(2)}%.`);return}
    setSaving(true);setMessage('')
    const {error}=await supabase.from('release_contributors').insert({release_id:releaseId,owner_id:session.user.id,contributor_name:name.trim(),role,share_percent:pct,society_member_number:memberNumber.trim()||null})
    setSaving(false)
    if(error){setMessage(error.message);return}
    setName('');setShare('0');setMemberNumber('');await load()
  }

  async function removeContributor(id){
    if(!supabase)return
    const {error}=await supabase.from('release_contributors').delete().eq('id',id).eq('owner_id',session.user.id)
    if(error){setMessage(error.message);return}
    await load()
  }

  if(!session)return <main className="page"><div className="eyebrow">ALLEGRO-VIBEZ</div><h2>Rights</h2><p>Please log in to manage release rights.</p><Link className="primary inline" to="/login">Log in</Link></main>
  if(!release)return <main className="page"><div className="eyebrow">ALLEGRO-VIBEZ</div><h2>Rights</h2><div className="empty">Release not found or not available to this account.</div></main>

  return <main className="page">
    <div className="eyebrow">PROTECT · RIGHTS LEDGER</div>
    <h2>{release.title}</h2>
    <p>Record contributors and ownership splits before submission. This ledger is private to the release owner.</p>

    <div className="rights-summary">
      <div><span>Total allocated</span><strong>{totalShare.toFixed(2)}%</strong></div>
      <div><span>Unallocated</span><strong>{Math.max(0,100-totalShare).toFixed(2)}%</strong></div>
      <div><span>Release status</span><strong className={`status status-${release.status}`}>{release.status}</strong></div>
    </div>

    <form className="panel" onSubmit={addContributor}>
      <label>Contributor name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Full legal or credited name" required/></label>
      <label>Role<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(item=><option key={item}>{item}</option>)}</select></label>
      <label>Ownership / royalty share %<input type="number" min="0" max="100" step="0.01" value={share} onChange={e=>setShare(e.target.value)} required/></label>
      <label>Society / member number<input value={memberNumber} onChange={e=>setMemberNumber(e.target.value)} placeholder="Optional"/></label>
      {message&&<div className="notice">{message}</div>}
      <button className="primary" disabled={saving}>{saving?'Saving…':'Add contributor'}</button>
    </form>

    <div className="release-list rights-list">
      {contributors.length?contributors.map(item=><article key={item.id}><div><div className="eyebrow">{item.role}</div><h3>{item.contributor_name}</h3><small>{item.society_member_number||'No society/member number recorded'}</small></div><div className="rights-actions"><strong>{Number(item.share_percent).toFixed(2)}%</strong><button className="text-button danger" type="button" onClick={()=>removeContributor(item.id)}>Remove</button></div></article>):<div className="empty">No contributors recorded yet.</div>}
    </div>
  </main>
}
