import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import Rights from './pages/Rights.jsx'
import { AdminReviewPage, ProfilePage, ProsperityPage, SubmitReleaseButton } from './pages/CreatorTools.jsx'

const nav = [['Home','/'],['Discover','/discover'],['Artists','/artists'],['Creator Hub','/creator-hub']]
const releaseTypes = ['Single', 'EP', 'Album', 'DJ Mix']

function Shell({ session, children }) {
  async function signOut() { if (supabase) await supabase.auth.signOut() }
  return <>
    <header className="site-header">
      <Link className="brand" to="/"><span>ALLEGRO</span><b>VIBEZ</b></Link>
      <nav>{nav.map(([label,to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      <div className="account-links">{session ? <><Link to="/dashboard">Dashboard</Link><Link to="/profile">Profile</Link><button className="text-button" type="button" onClick={signOut}>Log out</button></> : <><Link to="/login">Log in</Link><Link className="pill" to="/register">Join</Link></>}</div>
    </header>
    {children}
    <footer>ALLEGRO-VIBEZ · More Than Music. A Movement.</footer>
  </>
}

function Home() {
  return <main><section className="hero"><div className="eyebrow">AFRICAN-BORN · GLOBAL BY DESIGN</div><h1>Own your sound.<br/><em>Build your legacy.</em></h1><p>One trusted creator ecosystem to upload, protect, discover, distribute and monetise music.</p><div className="actions"><Link className="primary" to="/register">Start your journey</Link><Link className="secondary" to="/discover">Discover music</Link></div></section><section className="cards"><article><span>01</span><h3>Create</h3><p>Build your artist identity, catalogue and release pipeline.</p></article><article><span>02</span><h3>Protect</h3><p>Rights declarations, controlled media and auditable workflows.</p></article><article><span>03</span><h3>Prosper</h3><p>Royalty visibility, distribution readiness and creator growth.</p></article></section></main>
}

function Discover() {
  const [releases,setReleases]=useState([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{let active=true;(async()=>{if(!supabase){setLoading(false);return}const {data}=await supabase.from('releases').select('id,title,release_type,created_at').eq('status','published').order('created_at',{ascending:false}).limit(24);if(active){setReleases(data||[]);setLoading(false)}})();return()=>{active=false}},[])
  return <Page title="Discover"><p>Approved releases from the ALLEGRO-VIBEZ catalogue.</p>{loading?<div className="empty">Loading catalogue…</div>:releases.length?<div className="release-grid">{releases.map(r=><article key={r.id}><div className="eyebrow">{r.release_type}</div><h3>{r.title}</h3><small>{new Date(r.created_at).toLocaleDateString()}</small></article>)}</div>:<div className="empty">The global discovery engine is ready for the first published release.</div>}</Page>
}

function Artists() {
  const [profiles,setProfiles]=useState([])
  useEffect(()=>{let active=true;(async()=>{if(!supabase)return;const {data}=await supabase.from('profiles').select('id,display_name,stage_name,account_type,country').order('created_at',{ascending:false}).limit(24);if(active)setProfiles(data||[])})();return()=>{active=false}},[])
  return <Page title="Artists"><p>Meet the creators shaping the next generation of music.</p>{profiles.length?<div className="release-grid">{profiles.map(p=><article key={p.id}><div className="eyebrow">{p.account_type}</div><h3>{p.stage_name||p.display_name||'ALLEGRO-VIBEZ Creator'}</h3><small>{p.country||'Global creator'}</small></article>)}</div>:<div className="empty">Verified artist profiles will appear here.</div>}</Page>
}

function CreatorHub({ session }) {
  return session ? <Page title="Creator Hub"><div className="cards hub-cards"><article><h3>Upload music</h3><p>Create Singles, EPs, Albums and DJ Mixes.</p><Link to="/upload">Open upload</Link></article><article><h3>My Music</h3><p>Manage your private and published catalogue.</p><Link to="/my-music">View catalogue</Link></article><article><h3>Rights</h3><p>Ownership and contributor records remain attached to every release.</p><Link to="/my-music">Choose a release</Link></article><article><h3>Profile</h3><p>Manage your public creator identity, location and biography.</p><Link to="/profile">Edit profile</Link></article><article><h3>Prosperity</h3><p>Track gross royalties, platform fees and your net creator earnings.</p><Link to="/prosperity">Open royalty dashboard</Link></article><article><h3>Moderation</h3><p>Admin-only release review and publishing controls.</p><Link to="/admin/review">Open moderation</Link></article></div></Page> : <RequireLogin/>
}

function Dashboard({ session }) {
  const [count,setCount]=useState(null)
  useEffect(()=>{let active=true;(async()=>{if(!supabase||!session)return;const {count:total}=await supabase.from('releases').select('*',{count:'exact',head:true}).eq('owner_id',session.user.id);if(active)setCount(total||0)})();return()=>{active=false}},[session])
  return session ? <Page title="Dashboard"><p>Welcome back, {session.user.email}.</p><div className="cards"><article><h3>Release pipeline</h3><strong>{count===null?'—':count}</strong><p>Total releases in your catalogue.</p><Link to="/my-music">Manage releases</Link></article><article><h3>Creator identity</h3><strong>Profile</strong><p>Keep your artist identity and public details current.</p><Link to="/profile">Edit profile</Link></article><article><h3>Prosperity</h3><strong>Royalty ledger</strong><p>See transparent gross, fees and net creator earnings.</p><Link to="/prosperity">View earnings</Link></article></div></Page> : <RequireLogin/>
}

function Upload({ session }) {
  const nav=useNavigate();const [title,setTitle]=useState('');const [releaseType,setReleaseType]=useState('Single');const [audio,setAudio]=useState(null);const [artwork,setArtwork]=useState(null);const [message,setMessage]=useState('');const [saving,setSaving]=useState(false)
  async function uploadAsset(file,folder){if(!file)return null;const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${session.user.id}/${folder}/${crypto.randomUUID()}-${safe}`;const {error}=await supabase.storage.from('release-assets').upload(path,file,{upsert:false});if(error)throw error;return path}
  async function submit(e){e.preventDefault();if(!supabase){setMessage('Supabase is not configured.');return}setSaving(true);setMessage('');try{const audioPath=await uploadAsset(audio,'audio');const artworkPath=await uploadAsset(artwork,'artwork');const {error}=await supabase.from('releases').insert({owner_id:session.user.id,title:title.trim(),release_type:releaseType,status:'draft',audio_path:audioPath,artwork_path:artworkPath});if(error)throw error;setMessage('Draft saved successfully.');setTimeout(()=>nav('/my-music'),450)}catch(error){setMessage(error.message||'Could not save this release.')}finally{setSaving(false)}}
  return session ? <Page title="Upload"><p>Create a secure draft release. Audio and artwork are stored privately under your account.</p><form className="panel" onSubmit={submit}><label>Release title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength="180" placeholder="Enter release title" required/></label><label>Release type<select value={releaseType} onChange={e=>setReleaseType(e.target.value)}>{releaseTypes.map(type=><option key={type}>{type}</option>)}</select></label><label>Audio master<input type="file" accept="audio/*" onChange={e=>setAudio(e.target.files?.[0]||null)}/></label><label>Artwork<input type="file" accept="image/*" onChange={e=>setArtwork(e.target.files?.[0]||null)}/></label>{message&&<div className="notice">{message}</div>}<button className="primary" disabled={saving}>{saving?'Saving…':'Save draft release'}</button><small>Your draft remains private until it is submitted and approved.</small></form></Page> : <RequireLogin/>
}

function MyMusic({ session }) {
  const [releases,setReleases]=useState([]);const [loading,setLoading]=useState(true)
  async function load(){if(!supabase||!session){setLoading(false);return}setLoading(true);const {data}=await supabase.from('releases').select('id,title,release_type,status,created_at,review_note').eq('owner_id',session.user.id).order('created_at',{ascending:false});setReleases(data||[]);setLoading(false)}
  useEffect(()=>{load()},[session])
  return session ? <Page title="My Music"><p>Your private release catalogue, submission status and rights records.</p>{loading?<div className="empty">Loading your catalogue…</div>:releases.length?<div className="release-list">{releases.map(r=><article key={r.id}><div><div className="eyebrow">{r.release_type}</div><h3>{r.title}</h3><small>{new Date(r.created_at).toLocaleString()}</small>{r.review_note&&<p className="review-note">Review note: {r.review_note}</p>}<div className="release-links"><Link to={`/rights/${r.id}`}>Rights & contributors</Link></div><SubmitReleaseButton release={r} onSubmitted={load}/></div><span className={`status status-${r.status}`}>{r.status}</span></article>)}</div>:<div className="empty">No releases yet. <Link to="/upload">Create your first release.</Link></div>}</Page> : <RequireLogin/>
}

function RequireLogin(){return <Page title="Creator access"><p>Please log in to continue.</p><Link className="primary inline" to="/login">Log in</Link></Page>}
function Page({title,children}){return <main className="page"><div className="eyebrow">ALLEGRO-VIBEZ</div><h2>{title}</h2>{children}</main>}

function Login({ onSession }) {
  const nav=useNavigate();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false)
  async function submit(e){e.preventDefault();if(!supabase){setMessage('Production authentication is not configured yet.');return}setSaving(true);const {data,error}=await supabase.auth.signInWithPassword({email,password});setSaving(false);if(error){setMessage(error.message);return}onSession(data.session);nav('/dashboard')}
  return <Auth title="Log in" message={message}><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary" disabled={saving}>{saving?'Logging in…':'Log in'}</button></form><p>New here? <Link to="/register">Create account</Link></p></Auth>
}

function Register() {
  const [displayName,setDisplayName]=useState('');const [stageName,setStageName]=useState('');const [accountType,setAccountType]=useState('artist');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false)
  async function submit(e){e.preventDefault();if(!supabase){setMessage('Production authentication is not configured yet.');return}setSaving(true);const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName.trim(),stage_name:stageName.trim(),account_type:accountType}}});setSaving(false);setMessage(error?error.message:'Account created. Check your email to verify your address.')}
  return <Auth title="Join ALLEGRO-VIBEZ" message={message}><form onSubmit={submit}><label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} required/></label><label>Stage / creator name<input value={stageName} onChange={e=>setStageName(e.target.value)} placeholder="Optional"/></label><label>Account type<select value={accountType} onChange={e=>setAccountType(e.target.value)}><option value="artist">Artist</option><option value="dj">DJ</option><option value="producer">Producer</option><option value="songwriter">Songwriter</option><option value="band">Band</option><option value="choir">Choir</option><option value="label">Record Label</option></select></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" minLength="8" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary" disabled={saving}>{saving?'Creating account…':'Create account'}</button></form><p>Already registered? <Link to="/login">Log in</Link></p></Auth>
}

function Auth({title,message,children}){return <main className="auth"><section><div className="eyebrow">SECURE CREATOR ACCESS</div><h2>{title}</h2>{!isSupabaseConfigured&&<div className="notice">Supabase environment variables are required for live authentication.</div>}{message&&<div className="notice">{message}</div>}{children}</section></main>}

export default function App(){
  const [session,setSession]=useState(null)
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe()},[])
  return <Shell session={session}><Routes><Route path="/" element={<Home/>}/><Route path="/discover" element={<Discover/>}/><Route path="/artists" element={<Artists/>}/><Route path="/login" element={<Login onSession={setSession}/>}/><Route path="/register" element={<Register/>}/><Route path="/dashboard" element={<Dashboard session={session}/>}/><Route path="/creator-hub" element={<CreatorHub session={session}/>}/><Route path="/upload" element={<Upload session={session}/>}/><Route path="/my-music" element={<MyMusic session={session}/>}/><Route path="/rights/:releaseId" element={<Rights session={session}/>}/><Route path="/profile" element={<ProfilePage session={session}/>}/><Route path="/prosperity" element={<ProsperityPage session={session}/>}/><Route path="/admin/review" element={<AdminReviewPage session={session}/>}/><Route path="*" element={<Page title="Page not found"><Link to="/">Return home</Link></Page>}/></Routes></Shell>
}
