import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'

const nav = [['Home','/'],['Discover','/discover'],['Artists','/artists'],['Creator Hub','/creator-hub']]

function Shell({ session, children }) {
  return <>
    <header className="site-header">
      <Link className="brand" to="/"><span>ALLEGRO</span><b>VIBEZ</b></Link>
      <nav>{nav.map(([label,to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      <div className="account-links">{session ? <Link to="/dashboard">Dashboard</Link> : <><Link to="/login">Log in</Link><Link className="pill" to="/register">Join</Link></>}</div>
    </header>
    {children}
    <footer>ALLEGRO-VIBEZ · More Than Music. A Movement.</footer>
  </>
}

function Home() {
  return <main>
    <section className="hero">
      <div className="eyebrow">AFRICAN-BORN · GLOBAL BY DESIGN</div>
      <h1>Own your sound.<br/><em>Build your legacy.</em></h1>
      <p>One trusted creator ecosystem to upload, protect, discover, distribute and monetise music.</p>
      <div className="actions"><Link className="primary" to="/register">Start your journey</Link><Link className="secondary" to="/discover">Discover music</Link></div>
    </section>
    <section className="cards">
      <article><span>01</span><h3>Create</h3><p>Build your artist identity, catalogue and release pipeline.</p></article>
      <article><span>02</span><h3>Protect</h3><p>Rights declarations, controlled media and auditable workflows.</p></article>
      <article><span>03</span><h3>Prosper</h3><p>Royalty visibility, distribution readiness and creator growth.</p></article>
    </section>
  </main>
}

function Discover() { return <Page title="Discover"><p>Approved releases, artists, genres and charts will surface here as the catalogue goes live.</p><div className="empty">The global discovery engine is being prepared for launch.</div></Page> }
function Artists() { return <Page title="Artists"><p>Meet the creators shaping the next generation of music.</p><div className="empty">Verified artist profiles will appear here.</div></Page> }
function CreatorHub({ session }) { return session ? <Page title="Creator Hub"><div className="cards"><article><h3>Upload music</h3><p>Create Singles, EPs, Albums and DJ Mixes.</p><Link to="/upload">Open upload</Link></article><article><h3>My Music</h3><p>Manage your private and published catalogue.</p><Link to="/my-music">View catalogue</Link></article><article><h3>Rights</h3><p>Keep ownership and contributor records attached to every release.</p></article></div></Page> : <RequireLogin/> }
function Dashboard({ session }) { return session ? <Page title="Dashboard"><p>Welcome back, {session.user.email}.</p><div className="cards"><article><h3>Release pipeline</h3><strong>Ready</strong><p>Prepare your next release.</p></article><article><h3>Catalogue</h3><strong>My Music</strong><p>Track release status and metadata.</p></article><article><h3>Prosperity</h3><strong>Coming online</strong><p>Royalty and payout reporting follows the verified ledger.</p></article></div></Page> : <RequireLogin/> }
function Upload({ session }) { return session ? <Page title="Upload"><p>The secure release workflow supports Singles, EPs, Albums and DJ Mixes.</p><div className="panel"><label>Release title<input placeholder="Enter release title"/></label><label>Release type<select><option>Single</option><option>EP</option><option>Album</option><option>DJ Mix</option></select></label><label>Audio master<input type="file" accept="audio/*"/></label><label>Artwork<input type="file" accept="image/*"/></label><button className="primary" type="button">Continue to metadata</button><small>Final storage and submission are enabled after the production Supabase migration is confirmed.</small></div></Page> : <RequireLogin/> }
function MyMusic({ session }) { return session ? <Page title="My Music"><div className="empty">Your release catalogue will appear here after your first saved release.</div></Page> : <RequireLogin/> }
function RequireLogin() { return <Page title="Creator access"><p>Please log in to continue.</p><Link className="primary inline" to="/login">Log in</Link></Page> }
function Page({title,children}) { return <main className="page"><div className="eyebrow">ALLEGRO-VIBEZ</div><h2>{title}</h2>{children}</main> }

function Login({ onSession }) {
  const nav = useNavigate(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState('')
  async function submit(e){e.preventDefault(); if(!supabase){setMessage('Production authentication is not configured yet.');return} const {data,error}=await supabase.auth.signInWithPassword({email,password}); if(error){setMessage(error.message);return} onSession(data.session); nav('/dashboard')}
  return <Auth title="Log in" message={message}><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary">Log in</button></form><p>New here? <Link to="/register">Create account</Link></p></Auth>
}

function Register() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState('')
  async function submit(e){e.preventDefault(); if(!supabase){setMessage('Production authentication is not configured yet.');return} const {error}=await supabase.auth.signUp({email,password}); setMessage(error ? error.message : 'Account created. Check your email to verify your address.')}
  return <Auth title="Join ALLEGRO-VIBEZ" message={message}><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" minLength="8" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary">Create account</button></form><p>Already registered? <Link to="/login">Log in</Link></p></Auth>
}
function Auth({title,message,children}) { return <main className="auth"><section><div className="eyebrow">SECURE CREATOR ACCESS</div><h2>{title}</h2>{!isSupabaseConfigured && <div className="notice">Supabase environment variables are required for live authentication.</div>}{message && <div className="notice">{message}</div>}{children}</section></main> }

export default function App(){
  const [session,setSession]=useState(null)
  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data})=>setSession(data.session)); const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next)); return()=>data.subscription.unsubscribe() },[])
  return <Shell session={session}><Routes>
    <Route path="/" element={<Home/>}/><Route path="/discover" element={<Discover/>}/><Route path="/artists" element={<Artists/>}/><Route path="/login" element={<Login onSession={setSession}/>}/><Route path="/register" element={<Register/>}/><Route path="/dashboard" element={<Dashboard session={session}/>}/><Route path="/creator-hub" element={<CreatorHub session={session}/>}/><Route path="/upload" element={<Upload session={session}/>}/><Route path="/my-music" element={<MyMusic session={session}/>}/><Route path="*" element={<Page title="Page not found"><Link to="/">Return home</Link></Page>}/>
  </Routes></Shell>
}
