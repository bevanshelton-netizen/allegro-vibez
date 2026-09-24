import { useEffect, useState } from 'react'
import { createCopyrightCase, getMyCopyrightCases } from '../services/copyrightService'
import StatusBadge from '../components/StatusBadge'

export default function CopyrightCentre() {
  const [cases, setCases] = useState([])
  const [claimType, setClaimType] = useState('ownership')
  const [statement, setStatement] = useState('')
  const [releaseId, setReleaseId] = useState('')
  const [trackId, setTrackId] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  async function load() { try { setCases(await getMyCopyrightCases()) } catch (e) { setError(e.message) } }
  useEffect(() => { load() }, [])
  async function submit(e) { e.preventDefault(); setError(''); setSaved(''); try { await createCopyrightCase({ releaseId: releaseId || null, trackId: trackId || null, claimType, statement }); setStatement(''); setReleaseId(''); setTrackId(''); setSaved('Copyright case submitted and audit logged.'); await load() } catch (e) { setError(e.message) } }
  return <main className="container page-pad"><p className="eyebrow">RIGHTS & COPYRIGHT</p><h1>Copyright case centre</h1><p className="lede">Submit a rights concern with a traceable statement. Platform staff review each case through a controlled workflow.</p>{error && <div className="notice error">{error}</div>}{saved && <div className="notice success">{saved}</div>}<form className="panel form-grid" onSubmit={submit}><label>Claim type<select value={claimType} onChange={e=>setClaimType(e.target.value)}><option value="ownership">Ownership</option><option value="licence">Licence</option><option value="plagiarism">Plagiarism</option><option value="unauthorised_use">Unauthorised use</option><option value="takedown">Takedown request</option><option value="other">Other</option></select></label><label>Release ID (optional)<input value={releaseId} onChange={e=>setReleaseId(e.target.value)} placeholder="UUID" /></label><label>Track ID (optional)<input value={trackId} onChange={e=>setTrackId(e.target.value)} placeholder="UUID" /></label><label className="span-2">Detailed statement<textarea rows="7" value={statement} onChange={e=>setStatement(e.target.value)} required minLength="20" /></label><div><button className="pill-button" type="submit">Submit copyright case</button></div></form><section className="catalogue-list"><h2>Your cases</h2>{cases.map(c=><article className="panel" key={c.id}><div className="release-header"><div><h3>{c.claim_type.replaceAll('_',' ')}</h3><p>{new Date(c.created_at).toLocaleString()}</p></div><StatusBadge status={c.status}/></div><p>{c.statement}</p></article>)}{!cases.length&&<div className="empty-state">No copyright cases submitted.</div>}</section></main>
}
