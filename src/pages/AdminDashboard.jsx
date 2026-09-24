import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import { getModerationQueue } from '../services/adminService'

export default function AdminDashboard() {
  const [queue, setQueue] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getModerationQueue().then(setQueue).catch((err) => setError(err.message))
  }, [])

  return (
    <main className="container page-pad">
      <p className="eyebrow">ADMIN CONTROL CENTRE</p>
      <h1>Operations overview</h1>
      <p className="lede">Moderation, copyright, risk, support, distribution and audit operations stay separated by role and remain traceable.</p>
      {error && <div className="notice error">{error}</div>}
      <section className="metric-grid">
        <MetricCard label="Moderation queue" value={queue.length} note="Submitted / correction states" />
        <MetricCard label="Submitted" value={queue.filter((r) => r.status === 'submitted').length} note="Awaiting first decision" />
        <MetricCard label="Changes requested" value={queue.filter((r) => r.status === 'changes_requested').length} note="Creator action needed" />
        <MetricCard label="Ready" value={queue.filter((r) => r.status === 'ready').length} note="Legacy workflow state" />
      </section>
      <section className="quick-grid">
        <Link to="/admin/releases"><span>MODERATION</span><h3>Review submitted releases</h3><p>Inspect audio, artwork, rights and metadata before a reasoned decision.</p></Link>
        <Link to="/admin/copyright"><span>COPYRIGHT</span><h3>Copyright cases</h3><p>Review claims, evidence and case outcomes.</p></Link>
        <Link to="/admin/risk"><span>RISK</span><h3>Risk review</h3><p>Investigate fraud and operational safety flags.</p></Link>
        <Link to="/admin/support"><span>SUPPORT</span><h3>Support queue</h3><p>Resolve user issues with case history.</p></Link>
        <Link to="/admin/distribution"><span>DISTRIBUTION</span><h3>Delivery operations</h3><p>Track partner-assisted release delivery.</p></Link>
        <Link to="/admin/audit"><span>AUDIT</span><h3>Audit history</h3><p>Review sensitive actions and their reasons.</p></Link>
        <Link to="/admin/health"><span>HEALTH</span><h3>System health</h3><p>Operational readiness and event visibility.</p></Link>
      </section>
    </main>
  )
}
