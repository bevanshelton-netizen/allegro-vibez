const TARGETS = new Set(['/discover','/artists','/creator-hub','/dashboard','/upload','/my-music','/profile','/prosperity','/wallet','/billing'])

function currentRoute(){
  return window.location.pathname.replace(/\/$/,'') || '/'
}

function slug(path){return path === '/' ? 'home' : path.slice(1).replace(/\//g,'-')}

function decorateReleaseCards(page){
  page.querySelectorAll('.release-grid article').forEach((card,index)=>{
    if(card.dataset.avDecorated==='true')return
    card.dataset.avDecorated='true'
    card.classList.add('av-release-card')
    const title=card.querySelector('h3')?.textContent?.trim()||'New Release'
    card.insertAdjacentHTML('afterbegin',`<div class="av-release-art" aria-hidden="true"><span>${String(index+1).padStart(2,'0')}</span><b>${title.slice(0,1).toUpperCase()}</b><i>▶</i></div>`)
  })
}

function decorateArtistCards(page){
  page.querySelectorAll('.release-grid article').forEach(card=>{
    if(card.dataset.avArtistCard==='true')return
    card.dataset.avArtistCard='true'
    card.classList.add('av-artist-card')
    const name=card.querySelector('h3')?.textContent?.trim()||'AV'
    const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()
    card.insertAdjacentHTML('afterbegin',`<div class="av-artist-avatar" aria-hidden="true"><span>${initials||'AV'}</span><i></i></div>`)
  })
}

function ensureDiscover(page){
  document.body.dataset.avRoute='discover'
  const eyebrow=page.querySelector(':scope > .eyebrow')
  const h2=page.querySelector(':scope > h2')
  const intro=page.querySelector(':scope > p')
  if(eyebrow)eyebrow.textContent='DISCOVER THE MOVEMENT'
  if(h2)h2.innerHTML='Find the sound.<br><em>Meet the next wave.</em>'
  if(intro)intro.textContent='Explore published music from creators building careers on ALLEGRO VIBEZ — from African roots to global sound.'

  if(!page.querySelector('.av-discovery-rail')){
    intro?.insertAdjacentHTML('afterend',`<div class="av-discovery-rail" aria-label="Music styles"><span>AMAPIANO</span><span>AFROBEATS</span><span>GOSPEL</span><span>HIP-HOP</span><span>JAZZ</span><span>R&B</span><span>HOUSE</span><span>SOUL</span><span>GLOBAL</span></div>`)
  }

  decorateReleaseCards(page)
  const empty=page.querySelector('.empty')
  if(empty && !empty.dataset.avEmpty){
    empty.dataset.avEmpty='true'
    if(!/Loading/i.test(empty.textContent||'')) empty.innerHTML='The first published releases are being prepared for discovery. <a href="/register">Artists can claim a profile and start building their catalogue now.</a>'
  }

  if(!page.querySelector('.av-discover-future')){
    page.insertAdjacentHTML('beforeend',`
      <section class="av-discover-future">
        <div class="av-future-copy"><div class="av-kicker">NEXT ON THE ROADMAP</div><h3>Live music should feel <em>alive.</em></h3><p>ALLEGRO VIBEZ is being built toward live artist experiences, concert discovery and richer fan connection — while the launch platform stays focused on secure creator foundations.</p></div>
        <div class="av-live-panel" aria-hidden="true"><span>LIVE</span><b>ON STAGE</b><i></i><i></i><i></i><i></i><i></i></div>
      </section>
      <section class="av-founding-callout"><div><div class="av-kicker">FOUNDING CREATORS</div><h3>Be part of the first wave.</h3><p>Build your artist home early and help shape the culture of the platform.</p></div><a class="av-button av-button-primary" href="/register">Join as an Artist</a></section>
    `)
  }
}

function ensureArtists(page){
  document.body.dataset.avRoute='artists'
  const eyebrow=page.querySelector(':scope > .eyebrow')
  const h2=page.querySelector(':scope > h2')
  const intro=page.querySelector(':scope > p')
  if(eyebrow)eyebrow.textContent='THE PEOPLE BEHIND THE SOUND'
  if(h2)h2.innerHTML='Meet the creators.<br><em>Remember the names.</em>'
  if(intro)intro.textContent='Artists, DJs, producers, songwriters, bands, choirs and labels building their public identity on ALLEGRO VIBEZ.'
  if(!page.querySelector('.av-artist-role-rail')){
    intro?.insertAdjacentHTML('afterend',`<div class="av-artist-role-rail"><span>ARTISTS</span><span>DJs</span><span>PRODUCERS</span><span>SONGWRITERS</span><span>BANDS</span><span>CHOIRS</span><span>LABELS</span></div>`)
  }
  decorateArtistCards(page)
  const empty=page.querySelector('.empty')
  if(empty && !empty.dataset.avArtistEmpty){
    empty.dataset.avArtistEmpty='true'
    empty.innerHTML='The artist wall is waiting for its first public profiles. <a href="/register">Claim your creator identity.</a>'
  }
  if(!page.querySelector('.av-artist-value')){
    page.insertAdjacentHTML('beforeend',`
      <section class="av-artist-value">
        <article><span>01</span><h3>Be seen properly</h3><p>Your artist identity deserves more than a social bio and a disappearing post.</p></article>
        <article><span>02</span><h3>Build a catalogue</h3><p>Give every release a place inside a growing body of work.</p></article>
        <article><span>03</span><h3>Turn attention into legacy</h3><p>Connect discovery to ownership, rights and long-term creator prosperity.</p></article>
      </section>
      <section class="av-founding-callout"><div><div class="av-kicker">YOUR NAME BELONGS HERE</div><h3>Build your artist home.</h3><p>Join the creator ecosystem and start shaping your public presence.</p></div><a class="av-button av-button-primary" href="/register">Create Artist Profile</a></section>
    `)
  }
}

const hubIcons={
  'Upload music':'♫','My Music':'◉','Rights':'◇','Profile':'AV','Prosperity':'↗','Wallet':'R','Plans':'★','Moderation':'✓','Commercial Ops':'▦'
}

function ensureHub(page){
  const title=page.querySelector(':scope > h2')
  if(!title || !/Creator Hub/i.test(title.textContent||''))return
  document.body.dataset.avRoute='creator-hub'
  const eyebrow=page.querySelector(':scope > .eyebrow')
  if(eyebrow)eyebrow.textContent='YOUR CAREER COMMAND CENTRE'
  title.innerHTML='Build. Protect.<br><em>Prosper.</em>'
  if(!page.querySelector('.av-hub-intro')){
    title.insertAdjacentHTML('afterend',`<div class="av-hub-intro"><p>Everything in your creator business should connect — identity, releases, rights, earnings and payouts.</p><div class="av-hub-path"><span>PROFILE</span><i>→</i><span>UPLOAD</span><i>→</i><span>RIGHTS</span><i>→</i><span>SUBMIT</span><i>→</i><span>PROSPERITY</span></div></div>`)
  }
  page.querySelectorAll('.hub-cards article').forEach(card=>{
    if(card.dataset.avHub==='true')return
    card.dataset.avHub='true'
    card.classList.add('av-hub-card')
    const label=card.querySelector('h3')?.textContent?.trim()||''
    card.insertAdjacentHTML('afterbegin',`<div class="av-hub-icon" aria-hidden="true">${hubIcons[label]||'•'}</div>`)
  })
  if(!page.querySelector('.av-hub-bottom')){
    page.insertAdjacentHTML('beforeend',`<section class="av-hub-bottom"><div><div class="av-kicker">THE GOAL</div><h3>Turn releases into a career asset.</h3><p>Use the hub to keep the work organised, the ownership recorded and the money journey visible.</p></div><a class="av-button av-button-ghost" href="/upload">Start a Release</a></section>`)
  }
}

function ensureWorkspace(page,path){
  if(!TARGETS.has(path) || ['/discover','/artists','/creator-hub'].includes(path))return
  document.body.dataset.avRoute=slug(path)
  page.classList.add('av-workspace-page')
  const title=page.querySelector(':scope > h2')
  if(!title)return
  if(!page.querySelector('.av-workspace-accent')) title.insertAdjacentHTML('beforebegin','<div class="av-workspace-accent" aria-hidden="true"><span></span><span></span><span></span></div>')
}

function enhance(){
  const path=currentRoute()
  if(path==='/'){
    document.body.dataset.avRoute='home'
    return
  }
  const page=document.querySelector('main.page')
  if(!page)return
  if(path==='/discover')ensureDiscover(page)
  else if(path==='/artists')ensureArtists(page)
  else if(path==='/creator-hub')ensureHub(page)
  else ensureWorkspace(page,path)
}

const root=document.getElementById('root')
if(root){
  const observer=new MutationObserver(()=>requestAnimationFrame(enhance))
  observer.observe(root,{childList:true,subtree:true})
}
window.addEventListener('popstate',()=>requestAnimationFrame(enhance))
requestAnimationFrame(enhance)
