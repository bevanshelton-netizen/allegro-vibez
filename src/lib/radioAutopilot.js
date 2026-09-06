const DAY_NAMES=['sun','mon','tue','wed','thu','fri','sat']

export function minutesOfDay(value){
  const [h,m]=String(value||'').split(':').map(Number)
  if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)throw new Error('invalid_time')
  return h*60+m
}

export function programForNow(programs,now=new Date()){
  const day=DAY_NAMES[now.getDay()]
  const minute=now.getHours()*60+now.getMinutes()
  const active=(programs||[]).filter(p=>p.active!==false&&(p.day===day||p.day==='daily'))
  const matches=active.filter(p=>{
    const start=minutesOfDay(p.start)
    const end=minutesOfDay(p.end)
    return end>start ? minute>=start&&minute<end : minute>=start||minute<end
  })
  matches.sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0)))
  return matches[0]||null
}

export function eligibleTracks(tracks,{genre=null,territory='ZA',explicitAllowed=true}={}){
  return (tracks||[]).filter(t=>{
    if(t.radio_clearance!=='cleared')return false
    if(t.rights_status!=='verified')return false
    if(t.active===false)return false
    if(!explicitAllowed&&t.explicit)return false
    if(genre&&Array.isArray(t.genres)&&!t.genres.map(x=>String(x).toLowerCase()).includes(String(genre).toLowerCase()))return false
    if(Array.isArray(t.territories)&&t.territories.length&&!t.territories.includes('*')&&!t.territories.includes(territory))return false
    return true
  })
}

export function selectTrack(tracks,{recentTrackIds=[],recentArtistIds=[],seed=0}={}){
  const recentTracks=new Set(recentTrackIds)
  const recentArtists=new Set(recentArtistIds)
  let pool=tracks.filter(t=>!recentTracks.has(t.id)&&!recentArtists.has(t.artist_id))
  if(!pool.length)pool=tracks.filter(t=>!recentTracks.has(t.id))
  if(!pool.length)pool=[...tracks]
  if(!pool.length)return null
  const index=Math.abs(Number(seed||0))%pool.length
  return pool[index]
}

export function dueAd(campaigns,{now=new Date(),playsToday={}}={}){
  const ts=now.getTime()
  const eligible=(campaigns||[]).filter(c=>{
    if(c.status!=='active'||c.approved!==true)return false
    const start=c.starts_at?new Date(c.starts_at).getTime():-Infinity
    const end=c.ends_at?new Date(c.ends_at).getTime():Infinity
    if(ts<start||ts>end)return false
    const used=Number(playsToday[c.id]||0)
    return used<Number(c.max_daily_plays||999999)
  })
  eligible.sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0)))
  return eligible[0]||null
}

export function buildHourClock({program,tracks,campaigns=[],hourStart=new Date(),musicMinutes=50,adBreaks=[15,45],seed=0}){
  if(!program)throw new Error('program_required')
  const allowed=eligibleTracks(tracks,{genre:program.genre||null,explicitAllowed:program.explicit_allowed!==false})
  const items=[]
  let cursor=new Date(hourStart)
  cursor.setMinutes(0,0,0)
  let recentTrackIds=[],recentArtistIds=[],musicSeconds=0,trackSeed=seed
  const adMinutes=new Set(adBreaks.map(Number))
  for(let minute=0;minute<60;){
    if(adMinutes.has(minute)){
      const ad=dueAd(campaigns,{now:new Date(cursor.getTime()+minute*60000),playsToday:{}})
      if(ad){
        items.push({type:'ad',id:ad.id,title:ad.name||'Advert',duration_seconds:Number(ad.duration_seconds||30),scheduled_minute:minute})
        minute+=Math.max(1,Math.ceil(Number(ad.duration_seconds||30)/60))
        continue
      }
    }
    const track=selectTrack(allowed,{recentTrackIds,recentArtistIds,seed:trackSeed++})
    if(!track)break
    const duration=Math.max(30,Number(track.duration_seconds||180))
    items.push({type:'track',id:track.id,artist_id:track.artist_id,title:track.title,duration_seconds:duration,scheduled_minute:minute})
    recentTrackIds=[track.id,...recentTrackIds].slice(0,8)
    recentArtistIds=[track.artist_id,...recentArtistIds].slice(0,4)
    musicSeconds+=duration
    minute+=Math.max(1,Math.ceil(duration/60))
    if(musicSeconds>=musicMinutes*60&&minute>=55)break
  }
  return {program_id:program.id,program_name:program.name,hour_start:hourStart.toISOString(),items}
}
