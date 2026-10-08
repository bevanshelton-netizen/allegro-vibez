import '../styles/opportunity-ad.css'

export default function OpportunityAdvert(){
  return <section className="opportunity-ad-wrap" aria-label="ALLEGRO opportunity spotlight">
    <div className="opportunity-ad">
      <div className="opportunity-ad-image" aria-hidden="true"><img src="/av-artists.webp" alt=""/></div>
      <div className="opportunity-ad-overlay" aria-hidden="true"/>
      <div className="opportunity-ad-content">
        <div className="opportunity-ad-kicker">ALLEGRO OPPORTUNITY SPOTLIGHT</div>
        <h2>WANT TO PLAY<br/><span>SUMMERFEST 2027?</span></h2>
        <div className="opportunity-ad-apply">APPLY TO PLAY</div>
        <div className="opportunity-ad-deadline"><small>APPLICATION DEADLINE</small><strong>DECEMBER 2, 2026</strong></div>
        <a className="opportunity-ad-button" href="https://www.summerfest.com/want-to-perform-at-summerfest/" target="_blank" rel="noreferrer">VIEW OPPORTUNITY <span aria-hidden="true">↗</span></a>
        <div className="opportunity-ad-footer">ALLEGRO · ARTIST OPPORTUNITIES · GLOBAL STAGE</div>
      </div>
    </div>
  </section>
}
