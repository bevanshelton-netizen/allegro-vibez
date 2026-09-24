import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import {
  getModerationQueue,
  getReleaseReviewDetail,
  moderateRelease,
} from '../services/adminService'

const REVIEW_DECISIONS = {
  approved: {
    label: 'Approve release',
    help: 'Marks the release approved and ready for the controlled publishing step.',
    className: 'pill-button',
  },
  changes_requested: {
    label: 'Request changes',
    help: 'Returns the release to the artist with a clear correction reason.',
    className: 'ghost-button',
  },
  rejected: {
    label: 'Reject release',
    help: 'Closes this moderation attempt. A reason is mandatory and remains auditable.',
    className: 'danger-button',
  },
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AdminReview() {
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('submitted')
  const [search, setSearch] = useState('')
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadQueue(preferredId = null) {
    setLoading(true)
    setError('')
    try {
      const rows = await getModerationQueue()
      setQueue(rows)
      const nextId = preferredId && rows.some((row) => row.id === preferredId)
        ? preferredId
        : rows[0]?.id || null
      setSelectedId(nextId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, [])

  useEffect(() => {
    setDecision('')
    setReason('')
    if (!selectedId) {
      setDetail(null)
      return
    }
    let active = true
    setDetailLoading(true)
    setError('')
    getReleaseReviewDetail(selectedId)
      .then((result) => { if (active) setDetail(result) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [selectedId])

  const decisionOptions = detail?.status === 'approved' ? {
    published: {
      label: 'Publish approved release',
      help: 'Makes this approved release publicly discoverable. Use only after final operational checks.',
      className: 'pill-button',
    },
  } : REVIEW_DECISIONS

  const visibleQueue = useMemo(() => queue.filter((release) => {
    const matchesStatus = filter === 'all' || release.status === filter
    const haystack = `${release.title || ''} ${release.creator_name || ''} ${release.genre || ''}`.toLowerCase()
    return matchesStatus && haystack.includes(search.trim().toLowerCase())
  }), [queue, filter, search])

  async function applyDecision() {
    if (!detail || !decision) return
    if (reason.trim().length < 8) {
      setError('Please provide a clear moderation reason of at least 8 characters.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await moderateRelease({ releaseId: detail.id, status: decision, reason: reason.trim() })
      setSuccess(`${detail.title} was marked ${decision.replace('_', ' ')}.`)
      setDecision('')
      setReason('')
      await loadQueue()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container page-pad">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMIN · RELEASE REVIEW</p>
          <h1>Moderation queue</h1>
          <p className="lede">Inspect the release, playable master, artwork, rights declaration and audit context before making a reasoned decision.</p>
        </div>
        <Link className="ghost-button" to="/admin">Admin home</Link>
      </div>

      <section className="metric-grid">
        <article className="metric-card"><span>Submitted</span><strong>{queue.filter((r) => r.status === 'submitted').length}</strong><small>Awaiting first review</small></article>
        <article className="metric-card"><span>Changes requested</span><strong>{queue.filter((r) => r.status === 'changes_requested').length}</strong><small>Returned to creator</small></article>
        <article className="metric-card"><span>Approved</span><strong>{queue.filter((r) => r.status === 'approved').length}</strong><small>Awaiting publication</small></article>
        <article className="metric-card"><span>Queue total</span><strong>{queue.length}</strong><small>Review + publish work</small></article>
      </section>

      <section className="filter-bar admin-review-filter">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, creator or genre" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="submitted">Submitted</option>
          <option value="changes_requested">Changes requested</option>
          <option value="ready">Ready</option>
          <option value="approved">Approved / publish</option>
          <option value="all">All queue states</option>
        </select>
      </section>

      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      {loading ? <div className="screen-state">Loading moderation queue…</div> : (
        <div className="admin-review-layout">
          <aside className="review-queue panel" aria-label="Moderation queue">
            <h2>Releases</h2>
            <div className="review-queue-list">
              {visibleQueue.map((release) => (
                <button type="button" key={release.id} className={`review-queue-item ${selectedId === release.id ? 'active' : ''}`} onClick={() => setSelectedId(release.id)}>
                  <span><strong>{release.title}</strong><small>{release.creator_name} · {release.release_type}</small></span>
                  <StatusBadge status={release.status} />
                </button>
              ))}
              {!visibleQueue.length && <div className="empty-state">No releases match this view.</div>}
            </div>
          </aside>

          <section className="review-workspace">
            {!selectedId ? <div className="empty-state">Choose a release to review.</div> : detailLoading ? <div className="screen-state">Opening release evidence…</div> : detail && (
              <>
                <article className="panel review-summary">
                  <div className="release-header"><div><p className="eyebrow">RELEASE EVIDENCE</p><h2>{detail.title}</h2><p>{detail.creator_name} · {detail.release_type} · {detail.genre || 'Uncategorised'}</p></div><StatusBadge status={detail.status} /></div>
                  <div className="review-media-grid"><div className="review-artwork">{detail.artworkUrl ? <img src={detail.artworkUrl} alt={`${detail.title} artwork`} /> : <span>♪</span>}</div><div>
                    <dl className="review-facts"><div><dt>Submitted</dt><dd>{formatDate(detail.case?.created_at || detail.updated_at)}</dd></div><div><dt>Release date</dt><dd>{detail.release_date || 'Not set'}</dd></div><div><dt>Language</dt><dd>{detail.language || 'Not set'}</dd></div><div><dt>Explicit</dt><dd>{detail.explicit_content ? 'Yes' : 'No'}</dd></div><div><dt>Rights declaration</dt><dd>{detail.rights_confirmed ? 'Confirmed' : 'Missing'}</dd></div><div><dt>Owner account</dt><dd>{detail.owner?.display_name || detail.owner?.full_name || detail.user_id}</dd></div></dl>
                    {detail.audioUrl ? <audio controls preload="metadata" src={detail.audioUrl} /> : <div className="notice error">No playable audio master is attached.</div>}
                  </div></div>
                </article>
                <article className="panel"><h3>Track & rights evidence</h3><div className="table-wrap"><table><thead><tr><th>Track</th><th>Primary artist</th><th>Audio file</th><th>ISRC</th></tr></thead><tbody>{detail.tracks.map((track) => <tr key={track.id}><td>{track.title}</td><td>{track.primary_artist}</td><td>{track.audio_file_name || '—'}</td><td>{track.isrc || '—'}</td></tr>)}</tbody></table></div><div className="review-declaration"><strong>Rights declaration</strong><p>{detail.rightsDeclaration?.declaration_text || 'No declaration record found.'}</p><small>Accepted: {formatDate(detail.rightsDeclaration?.created_at)}</small></div></article>
                <article className="panel"><h3>Moderation decision</h3><p className="muted-copy">Every decision requires a reason and is recorded in the audit trail. Approval does not automatically publish the release.</p><div className="decision-grid">{Object.entries(decisionOptions).map(([value, meta]) => <button type="button" key={value} className={`decision-card ${decision === value ? 'selected' : ''}`} onClick={() => setDecision(value)}><strong>{meta.label}</strong><span>{meta.help}</span></button>)}</div><label>Reason for decision<textarea rows="4" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State what was checked and why this decision is appropriate." /></label><div className="card-actions"><button type="button" className={decision ? decisionOptions[decision]?.className || 'pill-button' : 'pill-button'} disabled={!decision || busy} onClick={applyDecision}>{busy ? 'Recording decision…' : decision ? decisionOptions[decision]?.label || 'Record decision' : 'Choose a decision'}</button></div></article>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
