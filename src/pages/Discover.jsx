import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublishedReleases } from '../services/catalogueService'

export default function Discover() {
  const [releases,setReleases]=useState([]); const [query,setQuery]=useState(''); const [error,setError]=useState(''); const navigate=useNavigate()
  useEffect(()=>{ getPublishedReleases().then(setReleases).catch(e=>setError(e.message)) },[])
  const filtered=useMemo(()=>releases.filter(r=>`${r.title} ${r.genre} ${r.creator_name}`.toLowerCase().includes(query.toLowerCase())),[releases,query])
  return <main className="container page-pad"><p className="eyebrow">DISCOVERY</p><div className="page-heading"><div><h1>Find your next sound.</h1><p>Published music only. Search creators, releases and genres.</p></div><form onSubmit={e=>{e.preventDefault();navigate(`/search?q=${encodeURIComponent(query)}`)}}><input className="search-box" placeholder="Search music" value={query} onChange={e=>setQuery(e.target.value)}/></form></div>{error&&<div className="notice error">{error}</div>}<section className="release-grid">{filtered.map(r=><article className="release-tile" key={r.id}>{r.artworkUrl?<img src={r.artworkUrl} alt=""/>:<div className="art-placeholder">♪</div>}<div><span className="eyebrow">{r.genre||'Music'}</span><h3>{r.title}</h3><p>{r.creator_name}</p><div className="tile-links"><Link to={`/release/${r.slug || r.id}`}>Open release</Link>{r.artist?.slug&&<Link to={`/artist/${r.artist.slug}`}>View artist</Link>}</div></div></article>)}{!filtered.length&&!error&&<div className="empty-state">No published releases match this search yet.</div>}</section></main>
}
