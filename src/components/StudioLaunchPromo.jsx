import '../styles/studio-launch-promo.css'

const base='https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/allegro-studio-go'

export default function StudioLaunchPromo({source='allegro',compact=false}){
  const href=base+'?src='+encodeURIComponent(source)+'&content='+(compact?'compact':'hero')
  return <aside className={compact?'studio-launch-promo compact':'studio-launch-promo'} aria-label="ALLEGRO STUDIOS launch">
    <div className="studio-launch-copy">
      <span>NOW OPEN · ALLEGRO STUDIOS</span>
      <strong>Record. Mix. Master. Podcast. Film.</strong>
      <p>Professional studio sessions with a built-in Studio Tutor, client project portal and secure booking workflow.</p>
    </div>
    <div className="studio-launch-actions">
      <a href={href} target="_blank" rel="noreferrer">BOOK / EXPLORE STUDIO →</a>
      <small>Johannesburg · session requests confirmed before payment</small>
    </div>
  </aside>
}
