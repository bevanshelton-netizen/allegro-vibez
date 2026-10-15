import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { ArtistBookingRequest } from './pages/ArtistBooking.jsx'
import BookingContractShield from './pages/BookingContractShield.jsx'
import SheltonProtocol from './pages/SheltonProtocol.jsx'
import MusicAcademy from './pages/MusicAcademy.jsx'
import MusicAcademyLearner from './pages/MusicAcademyLearner.jsx'

const artists = [
  { id: 'a1', name: 'Nia Mokoena', genre: 'Afro-Soul', country: 'South Africa', color: 'coral', bio: 'Warm vocals, African rhythms and modern soul.' },
  { id: 'a2', name: 'Thembi Nova', genre: 'Amapiano', country: 'South Africa', color: 'violet', bio: 'Electronic grooves with a Johannesburg pulse.' },
  { id: 'a3', name: 'Kofi Meridian', genre: 'Afrobeat', country: 'Ghana', color: 'cyan', bio: 'West African rhythm meets global pop craft.' },
  { id: 'a4', name: 'Lebo Skye', genre: 'Hip-Hop', country: 'South Africa', color: 'gold', bio: 'Sharp storytelling from the streets to the world.' },
  { id: 'a5', name: 'Ama Kora', genre: 'Gospel', country: 'Nigeria', color: 'green', bio: 'Contemporary worship with a continental sound.' },
  { id: 'a6', name: 'Siyabonga R', genre: 'House', country: 'South Africa', color: 'blue', bio: 'Deep, soulful club music built for movement.' },
]

const tracks = [
  { id: 't1', title: 'Golden Hour', artist: 'Nia Mokoena', genre: 'Afro-Soul', duration: '3:42', tag: 'FEATURED' },
  { id: 't2', title: 'Midnight Johannesburg', artist: 'Thembi Nova', genre: 'Amapiano', duration: '4:08', tag: 'HOT' },
  { id: 't3', title: 'Accra Sunrise', artist: 'Kofi Meridian', genre: 'Afrobeat', duration: '3:26', tag: 'NEW' },
  { id: 't4', title: 'No Apologies', artist: 'Lebo Skye', genre: 'Hip-Hop', duration: '2:58', tag: 'TRENDING' },
  { id: 't5', title: 'Grace Carries Me', artist: 'Ama Kora', genre: 'Gospel', duration: '4:21', tag: 'NEW' },
  { id: 't6', title: 'Soweto Nights', artist: 'Siyabonga R', genre: 'House', duration: '5:12', tag: 'RADIO' },
]

const plans = [
  { name: 'Listener', price: 'FREE', features: ['Discover music', 'Artist profiles', 'ALLEGRO Radio', 'Save favourites'] },
  { name: 'Creator', price: 'R99', suffix: '/month', featured: true, features: ['Creator profile', 'Release workspace', 'Rights & contributor records', 'Prosperity dashboard'] },
  { name: 'Pro Artist', price: 'R299', suffix: '/month', features: ['Everything in Creator', 'Advanced catalogue tools', 'Booking enquiries', 'Priority support'] },
]

const nav = [
  ['/', 'Home'], ['/discover', 'Discover'], ['/radio', 'Radio'], ['/artists', 'Artists'], ['/creator', 'Creator Studio'], ['/rights', 'Rights'], ['/bookings', 'Bookings'],
]

function initials(name) {
  return name.split(' ').map(word => word[0]).slice(0, 2).join('')
}

function Logo() {
  return <Link className="brand" to="/" aria-label="ALLEGRO VIBEZ home"><span className="brand-mark">A</span><span>ALLEGRO <b>VIBEZ</b></span></Link>
}

function ArtistTile({ artist, onOpen }) {
  return <button className="artist-tile" onClick={() => onOpen(artist)}>
    <div className={`portrait ${artist.color}`}><span>{initials(artist.name)}</span><i /></div>
    <div className="artist-meta"><strong>{artist.name}</strong><span>{artist.genre} · {artist.country}</span></div>
  </button>
}

function TrackRow({ track, active, onPlay }) {
  return <div className={`track-row ${active ? 'active' : ''}`}>
    <button className="play-mini" onClick={() => onPlay(track)} aria-label={`Play ${track.title}`}>{active ? 'Ⅱ' : '▶'}</button>
    <div className="track-art"><span>{track.title.slice(0, 1)}</span></div>
    <div className="track-copy"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div>
    <span className="track-tag">{track.tag}</span><span className="track-time">{track.duration}</span>
  </div>
}

function Shell({ children, onSearch }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [query, setQuery] = useState('')
  const active = path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  function submitSearch(event) {
    event.preventDefault()
    navigate(`/discover${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    onSearch?.(query)
    setMenu(false)
  }

  return <>
    <header className="topbar">
      <Logo />
      <nav className="desktop-nav">{nav.map(([path, label]) => <Link key={path} className={active(path) ? 'active' : ''} to={path}>{label}</Link>)}</nav>
      <form className="search" onSubmit={submitSearch}><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search artists, music, genres..." aria-label="Search" /></form>
      <button className="mobile-menu" onClick={() => setMenu(v => !v)} aria-label="Open navigation">☰</button>
      <Link className="creator-cta" to="/creator">Join as Artist</Link>
    </header>
    {menu && <div className="mobile-nav">{nav.map(([path, label]) => <Link key={path} to={path} onClick={() => setMenu(false)}>{label}</Link>)}</div>}
    <main>{children}</main>
    <footer className="footer"><div><Logo /><p>More than music. A movement.<br />African-born. Global by design.</p></div><div><strong>Explore</strong><Link to="/discover">Discover</Link><Link to="/radio">ALLEGRO Radio</Link><Link to="/artists">Artists</Link></div><div><strong>Creators</strong><Link to="/creator">Creator Studio</Link><Link to="/rights">Rights</Link><Link to="/bookings">Bookings</Link></div><div><strong>Platform</strong><span>Privacy</span><span>Terms</span><span>Support</span></div><small>© {new Date().getFullYear()} ALLEGRO VIBEZ · An IZAKHONO-owned platform</small></footer>
  </>
}

function Home({ onPlay, onArtist }) {
  return <div className="page">
    <section className="hero">
      <div className="hero-grid" />
      <div className="hero-copy"><span className="eyebrow">AFRICAN-BORN · GLOBAL ARTIST PROSPERITY</span><h1>YOUR SOUND.<br /><em>YOUR STAGE.</em><br />YOUR FUTURE.</h1><p>ALLEGRO VIBEZ is a creator-first music ecosystem for discovery, radio, artist identity, releases, rights, bookings and prosperity.</p><div className="hero-actions"><Link className="btn primary" to="/discover">Explore Music <span>→</span></Link><Link className="btn ghost" to="/creator">Build Your Artist Profile</Link></div><div className="hero-stats"><span><b>24/7</b> RADIO</span><span><b>GLOBAL</b> DISCOVERY</span><span><b>CREATOR</b> FIRST</span></div></div>
      <div className="hero-art allegro-workspace" aria-label="ALLEGRO artist workspace showing music releases, rights, bookings and audience growth">
        <div className="workspace-top"><span className="workspace-live"><i /> ARTIST WORKSPACE</span><span className="workspace-window">ALLEGRO CREATOR OS</span></div>
        <div className="workspace-profile"><div className="profile-avatar">AM</div><div><span className="workspace-label">ARTIST PROFILE</span><b>Build your artist identity</b><small>Bio · Releases · Press kit · Links</small></div><span className="workspace-check">✓</span></div>
        <div className="workspace-grid">
          <div className="workspace-module module-release"><span className="module-icon">♫</span><small>MUSIC RELEASES</small><b>Catalogue</b><span className="module-bars"><i/><i/><i/><i/><i/><i/><i/><i/></span><em>Organise your work</em></div>
          <div className="workspace-module module-rights"><span className="module-icon">◇</span><small>RIGHTS & IP</small><b>Ownership records</b><div className="rights-line"><i/> Contributors <b>+</b></div><div className="rights-line"><i/> Song credits <b>+</b></div></div>
          <div className="workspace-module module-bookings"><span className="module-icon">↗</span><small>LIVE OPPORTUNITIES</small><b>Artist bookings</b><em>Events · Enquiries · Partners</em></div>
          <div className="workspace-module module-growth"><span className="module-icon">◎</span><small>AUDIENCE GROWTH</small><b>Creator tools</b><em>Campaigns · Promotion</em></div>
        </div>
        <div className="workspace-footer"><span>LISTENERS</span><span>ARTISTS</span><span>INDUSTRY PARTNERS</span><b>CONNECTED</b></div>
      </div>
    </section>

    <section className="section" aria-labelledby="what-allegro-does">
      <div className="section-head"><div><span className="eyebrow">WHAT IS ALLEGRO VIBEZ?</span><h2 id="what-allegro-does">One platform. The whole music journey.</h2></div></div>
      <p className="section-intro">ALLEGRO VIBEZ connects listeners, artists and music businesses in one place — from discovering new sounds to building an artist career, protecting music rights and finding performance opportunities.</p>
      <div className="artist-grid">
        <article className="feature-card"><span className="eyebrow">01 · FOR LISTENERS</span><h3>Discover and listen</h3><p>Explore music, find new artists and tune into ALLEGRO Radio for sounds and stories from Africa and around the world.</p><Link to="/discover">Explore music →</Link></article>
        <article className="feature-card"><span className="eyebrow">02 · FOR ARTISTS</span><h3>Build your music career</h3><p>Create your artist presence, showcase releases, organise your catalogue and give fans and industry partners a clear place to find you.</p><Link to="/creator">Enter Creator Studio →</Link></article>
        <article className="feature-card"><span className="eyebrow">03 · RIGHTS & CONTROL</span><h3>Keep track of your work</h3><p>Organise music ownership information, contributors and rights records so important details are easier to manage and review.</p><Link to="/rights">Explore rights tools →</Link></article>
        <article className="feature-card"><span className="eyebrow">04 · OPPORTUNITIES</span><h3>Turn visibility into opportunity</h3><p>Make it easier for event organisers and partners to discover artists and submit booking requests through the platform.</p><Link to="/bookings">Explore bookings →</Link></article>
      </div>
      <div className="join-strip"><div><span className="eyebrow">MADE FOR THE MUSIC COMMUNITY</span><h2>Listen. Create. Protect. Connect.</h2><p>Whether you love music, make it or work in the industry, start with the part that matters to you.</p></div><Link className="btn primary" to="/artists">Meet the artists →</Link></div>
    </section>

    <section className="section"><div className="section-head"><div><span className="eyebrow">LISTEN NOW</span><h2>Music with a point of view.</h2></div><Link to="/discover">View all →</Link></div><div className="track-list">{tracks.slice(0, 4).map(t => <TrackRow key={t.id} track={t} onPlay={onPlay} />)}</div></section>

    <section className="feature-band"><div><span className="eyebrow">ALLEGRO RADIO</span><h2>Turn the volume up.<br /><em>Africa is broadcasting.</em></h2><p>Curated music, artist stories, culture and programmes — with a path for live presenter takeovers and creator-led shows.</p><Link className="btn primary" to="/radio">Listen Live →</Link></div><div className="radio-visual"><div className="live-dot" />LIVE<span>88</span><small>ALLEGRO</small></div></section>

    <section className="section"><div className="section-head"><div><span className="eyebrow">ARTIST DISCOVERY</span><h2>Meet the movement.</h2></div><Link to="/artists">All artists →</Link></div><div className="artist-grid">{artists.slice(0, 4).map(a => <ArtistTile key={a.id} artist={a} onOpen={onArtist} />)}</div></section>

    <section className="creator-banner"><div className="creator-number">01</div><div><span className="eyebrow">FOR ARTISTS</span><h2>Don't just upload music.<br /><em>Build an asset.</em></h2><p>Your artist identity, catalogue, rights, contributors, bookings and creator prosperity — designed to live in one ecosystem.</p><Link className="btn light" to="/creator">Enter Creator Studio →</Link></div><div className="creator-pillars"><span>IDENTITY</span><span>CATALOGUE</span><span>RIGHTS</span><span>BOOKINGS</span><span>PROSPERITY</span></div></section>
  </div>
}

function Discover({ onPlay, onArtist }) {
  const params = new URLSearchParams(useLocation().search)
  const [genre, setGenre] = useState('All')
  const [query, setQuery] = useState(params.get('q') || '')
  const genres = ['All', ...new Set(tracks.map(t => t.genre))]
  const filtered = useMemo(() => tracks.filter(t => (genre === 'All' || t.genre === genre) && `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase())), [genre, query])
  return <div className="page"><section className="page-hero"><span className="eyebrow">DISCOVER</span><h1>Find your next <em>favourite.</em></h1><p>Explore music and artists from Africa and beyond.</p><div className="big-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the ALLEGRO catalogue..." /></div></section><section className="section compact"><div className="chips">{genres.map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(g)}>{g}</button>)}</div><div className="track-list">{filtered.map(t => <TrackRow key={t.id} track={t} onPlay={onPlay} />)}{filtered.length === 0 && <div className="empty">No releases match that search yet.</div>}</div><div className="section-head artists-head"><div><span className="eyebrow">ARTISTS</span><h2>Creator identities</h2></div></div><div className="artist-grid">{artists.map(a => <ArtistTile key={a.id} artist={a} onOpen={onArtist} />)}</div></section></div>
}

function Radio() {
  const schedule = [['06:00', 'Sunrise Africa', 'Morning music & stories'], ['09:00', 'ALLEGRO Select', 'Curated global sounds'], ['12:00', 'The Culture Hour', 'Artists, culture & conversations'], ['15:00', 'Vibe Check', 'New releases & discoveries'], ['18:00', 'Africa After Dark', 'Prime-time music'], ['22:00', 'Night Frequency', 'Deep sounds until sunrise']]
  return <div className="page"><section className="radio-hero"><div><span className="eyebrow">ALLEGRO RADIO · LIVE</span><h1>24/7.<br /><em>Music without borders.</em></h1><p>A continuous audio home for discovery, culture, presenters and artists.</p><button className="btn primary" onClick={() => document.querySelector('#radio-player')?.scrollIntoView({ behavior: 'smooth' })}>Open Radio Player →</button></div><div className="big-disc"><span>ALLEGRO</span><b>RADIO</b><i /></div></section><section className="section" id="radio-player"><div className="live-player"><div className="live-eq"><i/><i/><i/><i/><i/></div><div><span>NOW PLAYING</span><h2>ALLEGRO Radio</h2><p>Curated music stream · Presenter takeover ready</p></div><button className="circle-play">▶</button></div><div className="section-head"><div><span className="eyebrow">PROGRAMME CLOCK</span><h2>What's on</h2></div></div><div className="schedule">{schedule.map(([time, name, desc]) => <div className="schedule-row" key={time}><b>{time}</b><strong>{name}</strong><span>{desc}</span><i>›</i></div>)}</div></section></div>
}

function Artists({ onArtist }) {
  return <div className="page"><section className="page-hero"><span className="eyebrow">ARTISTS</span><h1>Creators are the <em>centre.</em></h1><p>Discover the people shaping the sound of a continent — and the world.</p></section><section className="section compact"><div className="artist-grid large">{artists.map(a => <ArtistTile key={a.id} artist={a} onOpen={onArtist} />)}</div><div className="join-strip"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Own your identity. Grow your audience.</h2></div><Link className="btn primary" to="/creator">Join ALLEGRO →</Link></div></section></div>
}

function Creator() {
  const [form, setForm] = useState({ name: '', email: '', country: '', genre: '' })
  const [status, setStatus] = useState('')
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => {}) }, [])
  async function submit(e) {
    e.preventDefault(); setBusy(true); setStatus('')
    try {
      if (form.email) {
        const { error } = await supabase.auth.signUp({ email: form.email, password: `${crypto.randomUUID()}A!9`, options: { data: { artist_name: form.name, country: form.country, genre: form.genre } } })
        if (error && !/already registered/i.test(error.message)) throw error
      }
      localStorage.setItem('allegro_creator_interest', JSON.stringify({ ...form, submitted_at: new Date().toISOString() }))
      setStatus('Your creator profile request is captured. Check your email if account confirmation is required.')
    } catch (error) { setStatus(error.message || 'We could not complete that request yet. Please try again.') } finally { setBusy(false) }
  }
  return <div className="page"><section className="creator-hero"><div><span className="eyebrow">CREATOR STUDIO</span><h1>Your music.<br /><em>Your business.</em></h1><p>ALLEGRO gives independent artists a professional home for identity, releases, rights, bookings and prosperity.</p><div className="creator-metrics"><span><b>01</b> Artist identity</span><span><b>02</b> Catalogue</span><span><b>03</b> Rights</span><span><b>04</b> Prosperity</span></div></div><div className="creator-console"><div className="console-top"><span>CREATOR OS</span><b>{session ? 'CONNECTED' : 'READY'}</b></div><div className="console-stat"><strong>R 0.00</strong><span>Creator balance</span></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/></div><div className="console-links"><span>Releases</span><span>Rights</span><span>Bookings</span><span>Analytics</span></div></div></section><section className="section creator-layout"><div><span className="eyebrow">START HERE</span><h2>Build your creator identity.</h2><p className="lead">Join the platform now. Payment and payout features are activated only when the required production provider configuration and verification are present.</p><div className="feature-list"><div><b>01</b><span><strong>Artist profile</strong><small>Your public identity, bio, genres and links.</small></span></div><div><b>02</b><span><strong>Release workspace</strong><small>Prepare music and artwork for review.</small></span></div><div><b>03</b><span><strong>Rights records</strong><small>Keep contributors and ownership evidence organised.</small></span></div><div><b>04</b><span><strong>Prosperity</strong><small>Track revenue, royalties and payout requests.</small></span></div></div></div><form className="creator-form" onSubmit={submit}><h3>Creator application</h3><label>Artist / stage name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><div className="two"><label>Country<input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></label><label>Primary genre<input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} /></label></div><button className="btn primary full" disabled={busy}>{busy ? 'Creating...' : 'Create Creator Profile →'}</button>{status && <p className="form-status">{status}</p>}<small>By continuing you agree to ALLEGRO's platform terms and privacy policy.</small></form></section><section className="section"><div className="section-head"><div><span className="eyebrow">CREATOR PLANS</span><h2>Start lean. Grow with us.</h2></div></div><div className="plan-grid">{plans.map(plan => <div className={`plan ${plan.featured ? 'featured' : ''}`} key={plan.name}>{plan.featured && <span className="plan-badge">INTRODUCTION</span>}<h3>{plan.name}</h3><div className="price">{plan.price}<small>{plan.suffix}</small></div>{plan.features.map(f => <span key={f}>✓ {f}</span>)}<button className="btn ghost full">Choose {plan.name}</button></div>)}</div></section></div>
}

function Rights() {
  const principles = [['CONTENT', 'Who created or supplied it?'], ['OWNER', 'Who controls the rights?'], ['LICENCE', 'What permission exists?'], ['TERRITORY', 'Where can it be used?'], ['TERM', 'When does permission expire?'], ['EVIDENCE', 'Can the claim be proven?']]
  return <div className="page"><section className="page-hero"><span className="eyebrow">RIGHTS & TRUST</span><h1>Protect the music.<br /><em>Protect the people.</em></h1><p>ALLEGRO is designed around rights-aware publishing instead of treating rights as an afterthought.</p></section><section className="section"><div className="rights-grid">{principles.map(([title, text], i) => <div className="rights-card" key={title}><span>0{i + 1}</span><strong>{title}</strong><p>{text}</p></div>)}</div><div className="rights-rule"><b>NO RIGHTS RECORD</b><span>→</span><strong>NO PUBLICATION</strong><p>Evidence-first workflows reduce accidental misuse and give creators a clearer record of what has been approved.</p></div></section></div>
}

function Bookings() {
  return <div className="page"><section className="page-hero"><span className="eyebrow">ARTIST BOOKINGS</span><h1>Put great artists<br /><em>on great stages.</em></h1><p>Structured booking enquiries for festivals, venues, brands, media and private events.</p></section><section className="section booking-layout"><div className="booking-art"><span>BOOK</span><b>THE<br />VIBE.</b></div><form className="booking-form" onSubmit={e => { e.preventDefault(); setTimeout(() => alert('Booking enquiry captured for follow-up.'), 0) }}><h2>Booking enquiry</h2><div className="two"><label>Contact name<input required /></label><label>Company / organisation<input /></label></div><div className="two"><label>Email<input required type="email" /></label><label>Phone<input /></label></div><label>Artist / genre<input placeholder="Who would you like to book?" /></label><div className="two"><label>Event date<input type="date" /></label><label>Country / city<input /></label></div><label>Tell us about the event<textarea rows="5" placeholder="Venue, audience, performance type, budget range and requirements..." /></label><button className="btn primary full">Send Booking Enquiry →</button><small>Final booking, contracts, fees and rights remain subject to artist/management approval.</small></form></section></div>
}


function MusicAcademyPaymentResult() {
  const location = useLocation()
  const success = location.pathname === '/music-academy/payment-success'
  const cancelled = location.pathname === '/music-academy/payment-cancelled'
  const title = success ? 'Payment submitted for verification' : cancelled ? 'Checkout cancelled' : 'Payment not completed'
  const message = success
    ? 'Your payment provider has returned you to ALLEGRO. Learner access is only activated after the server verifies the payment.'
    : cancelled
      ? 'No learner access has been granted. You can return to the Music Academy and try again when ready.'
      : 'We could not confirm a completed payment. No learner access has been granted; check the payment provider status before retrying.'
  return <div className="page"><section className="page-hero"><span className="eyebrow">ALLEGRO MUSIC ACADEMY</span><h1>{title}</h1><p>{message}</p><div className="hero-actions"><Link className="btn primary" to="/music-academy/learn">Check learner access</Link><Link className="btn ghost" to="/music-academy">Back to Music Academy</Link></div></section></div>
}

function Account() { return <div className="page"><section className="page-hero"><span className="eyebrow">ACCOUNT</span><h1>Your ALLEGRO<br /><em>workspace.</em></h1><p>Sign-in and account management are powered by the configured authentication service.</p><Link className="btn primary" to="/creator">Go to Creator Studio →</Link></section></div> }

function App() {
  const [activeTrack, setActiveTrack] = useState(null)
  const [artist, setArtist] = useState(null)
  const [session, setSession] = useState(null)
  const location = useLocation()
  const audioRef = useRef(null)
  useEffect(() => {
    if (!supabase) { setSession(null); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session || null) }).catch(() => {})
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession || null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const play = track => { setActiveTrack(active => active?.id === track.id ? null : track); if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 } }
  useEffect(() => { document.title = 'ALLEGRO VIBEZ — Music. Radio. Artists. Rights.'; window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname])
  let content
  if (location.pathname === '/') content = <Home onPlay={play} onArtist={setArtist} />
  else if (location.pathname.startsWith('/discover')) content = <Discover onPlay={play} onArtist={setArtist} />
  else if (location.pathname.startsWith('/radio')) content = <Radio />
  else if (location.pathname.startsWith('/artists')) content = <Artists onArtist={setArtist} />
  else if (location.pathname.startsWith('/creator')) content = <Creator />
  else if (location.pathname.startsWith('/rights')) content = <Rights />
  else if (location.pathname === '/music-academy/payment-success') content = <MusicAcademyPaymentResult />
  else if (location.pathname === '/music-academy/payment-failed') content = <MusicAcademyPaymentResult />
  else if (location.pathname === '/music-academy/payment-cancelled') content = <MusicAcademyPaymentResult />
  else if (location.pathname === '/music-academy/learn') content = <MusicAcademyLearner />
  else if (location.pathname === '/music-academy' || location.pathname.startsWith('/music-academy/')) content = <MusicAcademy />
  else if (location.pathname === '/sa/protocol' || location.pathname.startsWith('/sa/protocol/')) content = <SheltonProtocol session={session} />
  else if (/^\/artist\/[^/]+\/book$/.test(location.pathname)) content = <ArtistBookingRequest /> // /artist/:artistId/book
  else if (/^\/bookings\/[^/]+\/contract$/.test(location.pathname)) content = <BookingContractShield session={session} bookingId={decodeURIComponent(location.pathname.split('/')[2] || '')} />
  else if (location.pathname.startsWith('/bookings')) content = <Bookings />
  else content = <Account />
  return <Shell><>{content}{activeTrack && <div className="player"><button className="player-play" onClick={() => setActiveTrack(null)}>Ⅱ</button><div className="player-art">{activeTrack.title[0]}</div><div><strong>{activeTrack.title}</strong><span>{activeTrack.artist}</span></div><div className="player-progress"><i /></div><span>{activeTrack.duration}</span><button className="player-next">♡</button></div>}{artist && <div className="modal-backdrop" onClick={() => setArtist(null)}><div className="artist-modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setArtist(null)}>×</button><div className={`portrait huge ${artist.color}`}><span>{initials(artist.name)}</span><i /></div><span className="eyebrow">ARTIST</span><h2>{artist.name}</h2><p>{artist.bio}</p><div className="modal-tags"><span>{artist.genre}</span><span>{artist.country}</span></div><Link className="btn primary full" to="/bookings" onClick={() => setArtist(null)}>Enquire for booking →</Link></div></div>}<audio ref={audioRef} /></></Shell>
}

export default App
