import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArtists } from '../services/artistService'
export default function Artists(){const[artists,setArtists]=useState([]);const[error,setError]=useState('');useEffect(()=>{listArtists().then(setArtists).catch(e=>setError(e.message))},[]);return <main className="container page-pad"><p className="eyebrow">CREATOR DIRECTORY</p><h1>Artists building the movement.</h1>{error&&<div className="notice error">{error}</div>}<section className="artist-grid">{artists.map(a=><Link className="artist-card" to={`/artist/${a.slug}`} key={a.id}><div className="avatar">{a.stage_name?.slice(0,1)}</div><h3>{a.stage_name}</h3><p>{a.location||'Global'}</p><span>{(a.genres||[]).join(' · ')}</span></Link>)}</section></main>}
