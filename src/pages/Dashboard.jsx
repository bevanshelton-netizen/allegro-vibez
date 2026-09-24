import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import { useAuth } from '../context/AuthContext'
import { getOwnedReleases } from '../services/catalogueService'
import { getArtistProfile, isArtistProfileComplete } from '../services/artistService'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [releases, setReleases] = useState([])
  const [artist, setArtist] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { if (!user) return; Promise.all([getOwnedReleases(user.id), getArtistProfile(user.id)]).then(([releaseRows, artistProfile]) => { setReleases(releaseRows); setArtist(artistProfile) }).catch((err) => setError(err.message)) }, [user])
  const drafts = releases.filter((r) => r.status === 'draft').length
  const pending = releases.filter((r) => ['submitted', 'ready'].includes(r.status)).length
  const published = releases.filter((r) => r.status === 'published').length
  const profileComplete = isArtistProfileComplete(artist)
  return <main className="container page-pad"><p className="eyebrow">ARTIST COMMAND CENTRE</p><h1>Welcome, {artist?.stage_name || profile?.display_name || profile?.full_name || 'Creator'}</h1><p className="lede">Manage your music, releases, profile, audience and earnings from one place.</p>{error && <div className="notice error">{error}</div>}{!profileComplete ? <section className="action-banner"><div><span>COMPLETE YOUR ARTIST IDENTITY</span><h2>Make your profile ready for fans</h2><p>Add a stage name, substantial biography, at least one genre and your location.</p></div><Link className="ghost-button" to="/onboarding">Complete profile</Link></section> : <section className="action-banner completed-banner"><div><span>ARTIST IDENTITY READY</span><h2>{artist.stage_name} is ready for fans</h2><p>Your core public identity is complete. You can update it whenever your career evolves.</p></div><Link className="ghost-button" to="/onboarding">Edit profile</Link></section>}<section className="metric-grid"><MetricCard label="Total releases" value={releases.length} note="Live Supabase catalogue" /><MetricCard label="Saved drafts" value={drafts} note="Private releases" /><MetricCard label="Pending review" value={pending} note="Awaiting moderation" /><MetricCard label="Published" value={published} note="Public catalogue" /></section><section className="quick-grid"><Link to="/upload"><span>UPLOAD</span><h3>Release your next sound</h3></Link><Link to="/my-music"><span>CATALOGUE</span><h3>Manage My Music</h3></Link><Link to="/wallet"><span>WALLET</span><h3>Balances & payouts</h3></Link><Link to="/distribution"><span>DISTRIBUTION</span><h3>Track delivery status</h3></Link><Link to="/royalties"><span>ROYALTIES</span><h3>Review ledger entries</h3></Link><Link to="/ai-studio"><span>AI SUITE</span><h3>Prepare creator assistance</h3></Link><Link to="/fan-connect"><span>FANS</span><h3>Playlists & engagement</h3></Link><Link to="/rights-guide"><span>PROTECT</span><h3>Understand your rights</h3></Link></section></main>
}
