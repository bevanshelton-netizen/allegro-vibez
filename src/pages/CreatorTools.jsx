import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getRoyaltyLedger, getRoyaltySummary, reviewRelease, submitRelease, updateCreatorProfile } from '../lib/creatorWorkflow'

const accountTypes = ['artist','dj','producer','songwriter','band','choir','label']

function PageFrame({ eyebrow='ALLEGRO-VIBEZ', title, children }) {
  return <main className="page"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{children}</main>
}

export function SubmitReleaseButton({ release, onSubmitted }) {
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  if (!['draft','rejected'].includes(release.status)) return null
  async function submit(){setSaving(true);setMessage('');try{await submitRelease(release.id);setMessage('Submitted for review.');onSubmitted?.()}catch(error){setMessage(error.message||'Could not submit release.')}finally{setSaving(false)}}
  return <div className="inline-action"><button className="small-primary" type="button" onClick={submit} disabled={saving}>{saving?'Submitting…':'Submit for review'}</button>{message&&<small>{message}</small>}</div>
}

export function ProfilePage({ session }) {
  const [form,setForm]=useState({displayName:'',stageName:'',accountType:'artist',country:'',city:'',bio:'',pressHeadline:'',marketingMessage:'',bookingEmail:'',bookingPhone:'',websiteUrl:'',instagramUrl:'',tiktokUrl:'',youtubeUrl:''})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  useEffect(()=>{let active=true;(async()=>{if(!supabase||!session){setLoading(false);return}const {data,error}=await supabase.from('profiles').select('display_name,stage_name,account_type,country,city,bio,press_headline,marketing_message,booking_email,booking_phone,website_url,instagram_url,tiktok_url,youtube_url').eq('id',session.user.id).single();if(active){if(data)setForm({displayName:data.display_name||'',stageName:data.stage_name||'',accountType:data.account_type||'artist',country:data.country||'',city:data.city||'',bio:data.bio||'',pressHeadline:data.press_headline||'',marketingMessage:data.marketing_message||'',bookingEmail:data.booking_email||'',bookingPhone:data.booking_phone||'',websiteUrl:data.website_url||'',instagramUrl:data.instagram_url||'',tiktokUrl:data.tiktok_url||'',youtubeUrl:data.youtube_url||''});if(error)setMessage(error.message);setLoading(false)}})();return()=>{active=false}},[session])
  if(!session)return <PageFrame title="Creator Profile"><p>Please log in to manage your creator profile.</p><Link className="primary inline" to="/login">Log in</Link></PageFrame>
  function set(key,value){setForm(current=>({...current,[key]:value}))}
  async function save(e){e.preventDefault();setSaving(true);setMessage('');try{await updateCreatorProfile(session.user.id,form);setMessage('Profile saved.')}catch(error){setMessage(error.message||'Could not save profile.')}finally{setSaving(false)}}
  return <PageFrame eyebrow="CREATOR IDENTITY" title="Your Profile"><p>This information powers your ALLEGRO-VIBEZ creator identity and public artist listing.</p>{loading?<div className="empty">Loading profile…</div>:<form className="panel" onSubmit={save}><label>Your name<input value={form.displayName} onChange={e=>set('displayName',e.target.value)} required/></label><label>Stage / creator name<input value={form.stageName} onChange={e=>set('stageName',e.target.value)}/></label><label>Account type<select value={form.accountType} onChange={e=>set('accountType',e.target.value)}>{accountTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label><div className="form-grid"><label>Country<input value={form.country} onChange={e=>set('country',e.target.value)}/></label><label>City<input value={form.city} onChange={e=>set('city',e.target.value)}/></label></div><label>Bio<textarea rows="5" value={form.bio} onChange={e=>set('bio',e.target.value)} maxLength="1200" placeholder="Tell listeners, collaborators and industry partners about your work."/></label><label>Press headline<input value={form.pressHeadline} onChange={e=>set('pressHeadline',e.target.value)} maxLength="180" placeholder="One strong line that positions you"/></label><label>Marketing message<textarea rows="4" value={form.marketingMessage} onChange={e=>set('marketingMessage',e.target.value)} maxLength="1200" placeholder="What should fans, promoters and brands know right now?"/></label><div className="form-grid"><label>Booking email<input type="email" value={form.bookingEmail} onChange={e=>set('bookingEmail',e.target.value)}/></label><label>Booking phone<input value={form.bookingPhone} onChange={e=>set('bookingPhone',e.target.value)} maxLength="40"/></label></div><label>Website<input type="url" value={form.websiteUrl} onChange={e=>set('websiteUrl',e.target.value)} placeholder="https://"/></label><div className="form-grid"><label>Instagram<input type="url" value={form.instagramUrl} onChange={e=>set('instagramUrl',e.target.value)} placeholder="https://"/></label><label>TikTok<input type="url" value={form.tiktokUrl} onChange={e=>set('tiktokUrl',e.target.value)} placeholder="https://"/></label></div><label>YouTube<input type="url" value={form.youtubeUrl} onChange={e=>set('youtubeUrl',e.target.value)} placeholder="https://"/></label><div className="notice">These fields power your public ALLEGRO marketing and booking space. Publish only contact details you want the public to see.</div>{message&&<div className="notice">{message}</div>}<button className="primary" disabled={saving}>{saving?'Saving…':'Save profile'}</button></form>}</PageFrame>
}

export function ProsperityPage({ session }) {
  const [summary,setSummary]=useState([])
  const [ledger,setLedger]=useState([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  useEffect(()=>{let active=true;(async()=>{if(!session){setLoading(false);return}try{const [totals,rows]=await Promise.all([getRoyaltySummary(session.user.id),getRoyaltyLedger(session.user.id)]);if(active){setSummary(totals);setLedger(rows)}}catch(error){if(active)setMessage(error.message||'Royalty data is not available yet.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[session])
  if(!session)return <PageFrame title="Prosperity"><p>Please log in to view your royalty ledger.</p><Link className="primary inline" to="/login">Log in</Link></PageFrame>
  return <PageFrame eyebrow="CREATOR PROSPERITY" title="Royalty Dashboard"><p>A transparent view of gross earnings, platform fees and net creator income recorded in your ledger.</p>{message&&<div className="notice">{message}</div>}{loading?<div className="empty">Loading prosperity data…</div>:<><div className="money-grid">{summary.length?summary.map(row=><article key={row.currency}><div className="eyebrow">{row.currency}</div><strong>{Number(row.net_amount||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><span>Net creator earnings</span><small>Gross {Number(row.gross_amount||0).toFixed(2)} · Fees {Number(row.platform_fee||0).toFixed(2)}</small></article>):<article><div className="eyebrow">LEDGER READY</div><strong>0.00</strong><span>No royalty statements recorded yet.</span></article>}</div><div className="section-heading"><h3>Statements</h3><span>{ledger.length} entries</span></div>{ledger.length?<div className="ledger-list">{ledger.map(row=><article key={row.id}><div><strong>{row.source}</strong><small>{row.territory||'Global'} · {row.statement_period||'Unspecified period'}</small></div><div className="money"><strong>{row.currency} {Number(row.net_amount||0).toFixed(2)}</strong><small>Gross {Number(row.gross_amount||0).toFixed(2)}</small></div></article>)}</div>:<div className="empty">Your first verified royalty statement will appear here.</div>}</>}</PageFrame>
}

export function AdminReviewPage({ session }) {
  const [profile,setProfile]=useState(null)
  const [releases,setReleases]=useState([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{if(!supabase||!session){setLoading(false);return}setLoading(true);const {data:me}=await supabase.from('profiles').select('role').eq('id',session.user.id).single();setProfile(me||null);if(me?.role==='admin'){const {data,error}=await supabase.from('releases').select('id,title,release_type,status,owner_id,submitted_at,review_note').in('status',['submitted','approved']).order('submitted_at',{ascending:true});if(error)setMessage(error.message);setReleases(data||[])}setLoading(false)},[session])
  useEffect(()=>{load()},[load])
  async function decide(id,decision){const note=decision==='rejected'?window.prompt('Reason for rejection / changes required:','')||'':window.prompt('Optional review note:','')||'';setMessage('');try{await reviewRelease(id,decision,note);setMessage(`Release ${decision}.`);await load()}catch(error){setMessage(error.message||'Review action failed.')}}
  if(!session)return <PageFrame title="Moderation"><p>Please log in.</p></PageFrame>
  if(loading)return <PageFrame title="Moderation"><div className="empty">Checking moderation access…</div></PageFrame>
  if(profile?.role!=='admin')return <PageFrame eyebrow="ACCESS CONTROL" title="Moderation"><div className="notice">This area is restricted to ALLEGRO-VIBEZ administrators.</div></PageFrame>
  return <PageFrame eyebrow="ADMIN REVIEW" title="Release Moderation"><p>Review creator submissions, approve compliant releases, reject incomplete submissions, and publish approved releases.</p>{message&&<div className="notice">{message}</div>}{releases.length?<div className="moderation-list">{releases.map(release=><article key={release.id}><div><div className="eyebrow">{release.release_type}</div><h3>{release.title}</h3><small>Creator {release.owner_id}</small>{release.review_note&&<p>{release.review_note}</p>}</div><div className="moderation-actions"><span className={`status status-${release.status}`}>{release.status}</span>{release.status==='submitted'&&<><button type="button" onClick={()=>decide(release.id,'approved')}>Approve</button><button type="button" className="danger-button" onClick={()=>decide(release.id,'rejected')}>Reject</button></>}{release.status==='approved'&&<button type="button" className="small-primary" onClick={()=>decide(release.id,'published')}>Publish</button>}</div></article>)}</div>:<div className="empty">No releases are waiting for moderation.</div>}</PageFrame>
}
