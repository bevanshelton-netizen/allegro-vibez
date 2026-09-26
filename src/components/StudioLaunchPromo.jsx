import '../styles/studio-launch-promo.css'

export default function StudioLaunchPromo({source='allegro',compact=false}){
  const href='/studio/index.html?offer=founding&src='+encodeURIComponent(source)
  return <aside className={compact?'studio-launch-promo compact':'studio-launch-promo'} aria-label="ALLEGRO STUDIOS launch">
    <div className="studio-launch-copy">
      <span>NOW OPEN · ALLEGRO STUDIOS</span>
      <strong>Record. Mix. Master. Podcast. Film.</strong>
      <p>Founding creator offers now open: vocal sessions from R999, podcast launch sessions from R1,650, plus referrals and partner codes.</p>
    </div>
    <div className="studio-launch-actions">
      <a href={href}>VIEW & CLAIM FOUNDING OFFER →</a>
      <small>Johannesburg · session requests confirmed before payment</small>
    </div>
  </aside>
}
