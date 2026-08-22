function enhanceAuth(){
  const path=window.location.pathname.replace(/\/$/,'')||'/'
  if(!['/register','/login','/reset-password','/update-password'].includes(path))return
  const main=document.querySelector('main.auth')
  if(!main)return
  document.body.dataset.avRoute=path.slice(1)||'auth'
  main.classList.add('av-auth-enhanced')
  const section=main.querySelector(':scope > section')
  if(!section)return
  const eyebrow=section.querySelector('.eyebrow')
  const title=section.querySelector('h2')

  if(path==='/register'){
    if(eyebrow)eyebrow.textContent='JOIN THE ARTIST MOVEMENT'
    if(title)title.innerHTML='Build your artist home.<br><em>Start here.</em>'
    if(!main.querySelector('.av-auth-side')) section.insertAdjacentHTML('beforebegin',`
      <aside class="av-auth-side">
        <div class="av-kicker">MORE THAN AN ACCOUNT</div>
        <h1>Your music career deserves <em>infrastructure.</em></h1>
        <p>Create one identity that connects your catalogue, rights records, prosperity tools and creator journey.</p>
        <div class="av-auth-benefits"><span><b>01</b> Public creator identity</span><span><b>02</b> Secure release catalogue</span><span><b>03</b> Rights & contributor records</span><span><b>04</b> Royalty visibility</span><span><b>05</b> Wallet & payout workflow</span></div>
        <div class="av-auth-roles">ARTISTS · DJs · PRODUCERS · SONGWRITERS · BANDS · CHOIRS · LABELS</div>
      </aside>`)
  }else if(path==='/login'){
    if(eyebrow)eyebrow.textContent='CREATOR ACCESS'
    if(title)title.innerHTML='Welcome back.<br><em>Keep building.</em>'
    if(!main.querySelector('.av-auth-side')) section.insertAdjacentHTML('beforebegin',`
      <aside class="av-auth-side av-auth-returning">
        <div class="av-kicker">YOUR CAREER COMMAND CENTRE</div>
        <h1>One login.<br><em>Your whole creator journey.</em></h1>
        <p>Return to your profile, releases, rights, earnings and wallet from one connected platform.</p>
        <div class="av-auth-benefits"><span>PROFILE</span><span>MUSIC</span><span>RIGHTS</span><span>PROSPERITY</span><span>WALLET</span></div>
      </aside>`)
  }else{
    if(title)title.style.maxWidth='620px'
  }
}

const root=document.getElementById('root')
if(root){const observer=new MutationObserver(()=>requestAnimationFrame(enhanceAuth));observer.observe(root,{childList:true,subtree:true})}
window.addEventListener('popstate',()=>requestAnimationFrame(enhanceAuth))
requestAnimationFrame(enhanceAuth)
