import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/future.css'
import '../styles/home-showcase.css'
import '../styles/allegro-dusk.css'
import '../styles/hollywood-landing.css'
import '../styles/allegro-reference.css'

const experiences = [
  ['MUSIC', '♫', 'Stream the latest releases and independent talent.', '/stream'],
  ['RADIO', '▣', 'Live stations. Fresh mixes. 24/7 vibes.', '/radio'],
  ['ARTISTS', '♬', 'Profiles, releases, videos and more.', '/artists'],
  ['RIGHTS & IP', '◆', 'Protect your music. Track your rights.', '/sa/protocol'],
  ['BOOKINGS', '▦', 'Find gigs, events and opportunities.', '/bookings'],
  ['CREATOR TOOLS', '▥', 'Upload, manage, promote and grow.', '/creator-hub'],
]

const navItems = [
  ['Home', '/'], ['Music', '/stream'], ['Radio', '/radio'], ['Artists', '/artists'],
  ['Playlists', '/stream#playlists'], ['Rights', '/sa/protocol'], ['Bookings', '/bookings'],
  ['Creator Tools', '/creator-hub'],
]

export default function HomeGlobal() {
  const [artists, setArtists] = useState([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('id,stage_name,display_name,country,primary_genres,available_for_international_bookings')
        .order('created_at', { ascending: false })
        .limit(8)
      if (active) setArtists(data || [])
    })()
    return () => { active = false }
  }, [])

  function submitSearch(event) {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/stream?q=${encodeURIComponent(query)}` : '/stream')
  }

  return (
    <main className="allegro-reference-landing">
      <section className="allegro-reference-hero">
        <div className="allegro-reference-topnav">
          <Link className="allegro-reference-brand" to="/" aria-label="ALLEGRO VIBEZ home"><span>ALLEGRO</span><b>VIBEZ</b></Link>
          <nav className="allegro-reference-nav" aria-label="Primary navigation">
            {navItems.map(([label, to]) => <Link key={label} className={label === 'Home' ? 'active' : ''} to={to}>{label}</Link>)}
          </nav>
          <form onSubmit={submitSearch} aria-label="Search ALLEGRO">
            <input className="allegro-reference-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search artists, songs, playlists..." aria-label="Search artists, songs, playlists" />
          </form>
          <div className="allegro-reference-account"><Link to="/login">Sign in</Link><Link to="/register">Sign up</Link></div>
        </div>

        <div className="allegro-dusk-backdrop" aria-hidden="true"><img src="/av-hero.webp" alt="" /></div>

        <div className="allegro-reference-copy">
          <div className="kicker">AFRICAN TALENT · GLOBAL STAGE</div>
          <div className="actions">
            <Link className="listen" to="/stream">▶ Start Listening</Link>
            <Link className="artist" to="/join-artists">♬ Join as an Artist</Link>
          </div>
        </div>

        <div className="allegro-reference-cards" aria-label="ALLEGRO VIBEZ platform areas">
          {experiences.map(([title, icon, desc, to]) => (
            <Link key={title} to={to} className="allegro-reference-card">
              <span className="icon">{icon}</span>
              <div><strong>{title}</strong><p>{desc}</p></div>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="allegro-reference-below">
        <div className="showcase-section-head">
          <div><span>AFRICAN TALENT · GLOBAL STAGE</span><h2>Different sounds.<br /><em>One connected music experience.</em></h2></div>
          <p>ALLEGRO VIBEZ brings music, radio, artists, rights, bookings and creator tools together in one global destination.</p>
        </div>
        <div className="showcase-offer-grid">
          {experiences.map(([title, icon, desc, to]) => (
            <Link key={title} to={to} className="showcase-offer">
              <div className="showcase-offer-top"><span className="showcase-offer-icon">{icon}</span></div>
              <div className="showcase-offer-copy"><h3>{title}</h3><p>{desc}</p><span>OPEN {title} →</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="showcase-audience">
        <Link to="/stream" className="showcase-audience-card showcase-listeners"><div className="showcase-audience-label">FOR LISTENERS</div><div><h2>Press play.<br /><em>Discover more.</em></h2><p>Music, releases, discovery and radio in one place.</p><span>START LISTENING →</span></div></Link>
        <Link to="/join-artists" className="showcase-audience-card showcase-creators"><div className="showcase-audience-label">FOR CREATORS</div><div><h2>Upload. Organise.<br /><em>Build. Grow.</em></h2><p>Artist identity, catalogue, rights records, bookings and creator tools connected.</p><span>BUILD YOUR ARTIST SPACE →</span></div></Link>
      </section>

      <section className="showcase-final"><div><span>MUSIC · RADIO · ARTISTS · CREATOR TOOLS</span><h2>Everything starts with the music.</h2><p>Listen, discover, create, organise and grow — with tools designed for the modern music journey.</p></div><div className="showcase-final-actions"><Link className="showcase-primary" to="/stream">Open ALLEGRO Stream</Link><Link className="showcase-secondary" to="/join-artists">Claim Artist Space</Link></div></section>

      {artists.length > 0 && <section className="future-section showcase-signal"><div className="future-section-head"><div><span>CREATOR DISCOVERY</span><h2>Artist spaces are built for discovery.</h2></div><Link to="/join-artists">Get your space →</Link></div><div className="signal-grid">{artists.map((artist, index) => <Link className="signal-card" key={artist.id} to={`/artist/${artist.id}`}><div className="signal-number">{String(index + 1).padStart(2, '0')}</div><div><small>{artist.country || 'GLOBAL'} · {(artist.primary_genres || []).slice(0, 2).join(' / ') || 'CREATOR'}</small><h3>{artist.stage_name || artist.display_name || 'ALLEGRO Artist'}</h3><span>{artist.available_for_international_bookings ? 'GLOBAL BOOKINGS OPEN' : 'ARTIST SPACE'}</span></div></Link>)}</div></section>}
    </main>
  )
}
