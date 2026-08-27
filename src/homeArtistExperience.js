const ARTIST_HOME_ATTR = 'avArtistHome'

function enhanceArtistHome() {
  if (window.location.pathname !== '/') return

  const hero = document.querySelector('.hero')
  if (!hero) return

  const home = hero.closest('main')
  if (!home || home.dataset[ARTIST_HOME_ATTR] === 'true') return
  home.dataset[ARTIST_HOME_ATTR] = 'true'

  const eyebrow = hero.querySelector('.eyebrow')
  const title = hero.querySelector('h1')
  const copy = hero.querySelector('p')
  const actions = hero.querySelector('.actions')
  const actionLinks = actions ? actions.querySelectorAll('a') : []

  if (eyebrow) eyebrow.textContent = 'ARTISTS · BUILD IT · PROTECT IT · GET PAID'
  if (title) title.innerHTML = 'Your music is a business.<br><em>Build it like one.</em>'
  if (copy) copy.textContent = 'ALLEGRO-VIBEZ is your artist headquarters: create your profile, upload music, protect ownership, manage rights, track royalties, build a wallet and get discovered — all from one home.'
  if (actionLinks[0]) actionLinks[0].textContent = 'Claim Your Artist Profile'
  if (actionLinks[1]) actionLinks[1].textContent = 'See How It Works'

  if (actions && !hero.querySelector('.av-hero-proof')) {
    actions.insertAdjacentHTML('afterend', `
      <div class="av-hero-proof" aria-label="Artist platform capabilities">
        <span>Own your catalogue</span><i></i><span>Protect your rights</span><i></i><span>See your money</span><i></i><span>Grow your audience</span>
      </div>
      <div class="av-hero-promise">
        <strong>ONE ARTIST HOME.</strong>
        <span>Profile · Music · Rights · Royalties · Wallet · Discovery</span>
      </div>
    `)
  }

  if (!hero.querySelector('.av-hero-visuals')) {
    hero.insertAdjacentHTML('beforeend', `
      <div class="av-hero-visuals" aria-hidden="true">
        <figure class="av-visual av-visual-main"><img src="/av-hero.webp" alt="" /></figure>
        <figure class="av-visual av-visual-artists"><img src="/av-artists.webp" alt="" /></figure>
        <figure class="av-visual av-visual-discover"><img src="/av-discover.webp" alt="" /></figure>
        <div class="av-now-playing"><span class="av-wave"><i></i><i></i><i></i><i></i><i></i></span><b>YOUR CAREER. IN MOTION.</b></div>
      </div>
    `)
  }

  const cards = home.querySelector('.cards')
  if (!cards) return

  cards.insertAdjacentHTML('beforebegin', `
    <section class="av-impact-band">
      <div><strong>UPLOAD</strong><span>Build a professional release catalogue</span></div>
      <div><strong>PROTECT</strong><span>Keep rights and contributors connected</span></div>
      <div><strong>EARN</strong><span>Track royalties, fees and wallet activity</span></div>
      <div><strong>GROW</strong><span>Give fans and industry a place to find you</span></div>
    </section>
    <section class="av-artist-strip" aria-label="Who Allegro Vibez is for">
      <span>ARTISTS</span><span>DJs</span><span>PRODUCERS</span><span>SONGWRITERS</span><span>BANDS</span><span>CHOIRS</span><span>LABELS</span>
    </section>
    <section class="av-pillar-intro av-section-heading">
      <div class="av-kicker">THIS IS WHAT THE PAGE IS ABOUT</div>
      <h2>Turn your talent into a <em>real artist business.</em></h2>
      <p>Stop scattering your career across apps, messages, spreadsheets and social feeds. ALLEGRO-VIBEZ brings the essential building blocks of your music career into one creator-first ecosystem.</p>
    </section>
  `)

  cards.insertAdjacentHTML('afterend', `
    <section class="av-visual-story av-section">
      <div class="av-story-copy">
        <div class="av-kicker">FROM SOUND TO ASSET</div>
        <h2>Music moves fast.<br><em>Your career needs structure.</em></h2>
        <p>Every song should strengthen your identity, catalogue, ownership record and earning potential. ALLEGRO-VIBEZ is built to help you keep those pieces connected.</p>
        <a class="av-button av-button-primary" href="/register">Start building now</a>
      </div>
      <div class="av-story-mosaic" aria-label="Artist journey imagery">
        <figure class="av-story-a"><img src="/av-artists.webp" alt="Artists building their careers" /></figure>
        <figure class="av-story-b"><img src="/av-discover.webp" alt="Music discovery" /></figure>
        <figure class="av-story-c"><img src="/allegro-vibez-music-evolution.jpg" alt="The evolution of music and artist opportunity" /></figure>
      </div>
    </section>

    <section class="av-artist-experience av-section">
      <div class="av-section-heading av-centered">
        <div class="av-kicker">WHY ARTISTS JOIN</div>
        <h2>Build more than a following.<br><em>Build an asset.</em></h2>
        <p>Your catalogue, identity, rights records and earnings should strengthen your career every time you release music.</p>
      </div>
      <div class="av-feature-grid">
        <article class="av-feature-card"><strong>01</strong><h3>Be discoverable</h3><p>Create a public artist identity that gives listeners and industry a clear place to find you.</p></article>
        <article class="av-feature-card"><strong>02</strong><h3>Release with structure</h3><p>Keep your audio, artwork, metadata and release pipeline organised around your catalogue.</p></article>
        <article class="av-feature-card"><strong>03</strong><h3>Protect the work</h3><p>Attach ownership, contributors and rights records to releases instead of leaving them scattered.</p></article>
        <article class="av-feature-card"><strong>04</strong><h3>See the money</h3><p>Follow royalty records, platform fees, wallet balances and payout activity with greater transparency.</p></article>
        <article class="av-feature-card"><strong>05</strong><h3>Build your legacy</h3><p>Treat every release as part of a growing body of work that can outlive a trend or social feed.</p></article>
        <article class="av-feature-card"><strong>06</strong><h3>Grow from one home</h3><p>Move between your profile, music, rights and prosperity tools without rebuilding your career in disconnected places.</p></article>
      </div>
    </section>

    <section class="av-career-home av-section">
      <div class="av-career-copy">
        <div class="av-kicker">YOUR MUSIC CAREER · ONE HOME</div>
        <h2>From first upload to <em>long-term ownership.</em></h2>
        <p>The platform is designed to help creators turn talent into a structured, visible and increasingly valuable career.</p>
        <div class="av-career-list">
          <span>CREATE <small>Profile · releases · catalogue</small></span>
          <span>PROTECT <small>Rights · credits · contributor records</small></span>
          <span>PROSPER <small>Royalties · wallet · payout visibility</small></span>
        </div>
        <a class="av-button av-button-primary" href="/register">Claim your artist profile</a>
      </div>
      <div class="av-career-stage" aria-label="ALLEGRO VIBEZ creator ecosystem">
        <div class="av-stage-ring"></div>
        <div class="av-stage-core"><b>AV</b><span>YOUR CAREER<br>OPERATING SYSTEM</span></div>
        <div class="av-orbit av-o1">PROFILE</div>
        <div class="av-orbit av-o2">MUSIC</div>
        <div class="av-orbit av-o3">RIGHTS</div>
        <div class="av-orbit av-o4">ROYALTIES</div>
        <div class="av-orbit av-o5">WALLET</div>
        <div class="av-orbit av-o6">DISCOVERY</div>
      </div>
    </section>

    <section class="av-journey av-section">
      <div class="av-section-heading av-centered">
        <div class="av-kicker">START IN THREE MOVES</div>
        <h2>Your next chapter can start <em>today.</em></h2>
      </div>
      <div class="av-journey-grid">
        <article><span>1</span><div><h3>Create your profile</h3><p>Tell the world who you are and what kind of creator you are becoming.</p></div></article>
        <article><span>2</span><div><h3>Build your catalogue</h3><p>Upload releases, artwork and the information that gives your music structure.</p></div></article>
        <article><span>3</span><div><h3>Protect and prosper</h3><p>Keep rights records connected to the work and follow the financial journey of your catalogue.</p></div></article>
      </div>
    </section>

    <section class="av-movement" aria-label="More Than Music. A Movement.">
      <div class="av-movement-copy">
        <div class="av-kicker">AFRICAN-BORN · GLOBAL BY DESIGN</div>
        <h2>More Than Music.<br><em>A Movement.</em></h2>
        <p>From rhythm and heritage to studios, streaming and the global digital stage — ALLEGRO-VIBEZ is built for creators who want their talent to become ownership, opportunity and legacy.</p>
        <div class="av-movement-actions"><a class="av-button av-button-primary" href="/register">Join the Movement</a><a class="av-button av-button-ghost" href="/discover">Discover Music</a></div>
      </div>
    </section>

    <section class="av-final-cta av-section">
      <div>
        <div class="av-kicker">YOUR SOUND · YOUR RIGHTS · YOUR FUTURE</div>
        <h2>Don't let your next release disappear into a feed.</h2>
        <p>Give it a home. Give your career structure. Build the legacy behind the music.</p>
      </div>
      <a class="av-button av-button-primary av-button-large" href="/register">Claim Your Artist Profile</a>
    </section>
  `)
}

const root = document.getElementById('root')
if (root) {
  const observer = new MutationObserver(() => requestAnimationFrame(enhanceArtistHome))
  observer.observe(root, { childList: true, subtree: true })
}

window.addEventListener('popstate', () => requestAnimationFrame(enhanceArtistHome))
requestAnimationFrame(enhanceArtistHome)
