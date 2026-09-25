import { Link } from 'react-router-dom'
import '../styles/merch.css'

const categories=[
  ['Oversized T-Shirts','Relaxed silhouettes with bold ALLEGRO-VIBEZ graphics.'],
  ['Golf Shirts','Clean premium polos with music-culture detailing.'],
  ['Hoodies','Heavyweight streetwear built around the ALLEGRO signal.'],
  ['Jackets','Statement outerwear with gold, neon and waveform finishes.'],
  ['Bucket Hats & Caps','Easy headwear for stage, street and everyday wear.'],
]

export default function Merch(){
  return <main className="merch-page">
    <section className="merch-hero">
      <div className="merch-copy">
        <div className="merch-kicker"><span/> ALLEGRO-VIBEZ · MUSIC · PEOPLE · CULTURE</div>
        <h1>Wear the <em>movement.</em></h1>
        <p className="merch-lead">A modern ALLEGRO-VIBEZ apparel collection blending music, street culture and premium everyday style.</p>
        <div className="merch-tags">
          <span>BLACK + GOLD</span><span>NEON SIGNAL</span><span>UNISEX ENERGY</span><span>GLOBAL CULTURE</span>
        </div>
        <div className="merch-actions">
          <a className="merch-primary" href="#collection">Explore the collection</a>
          <Link className="merch-secondary" to="/join-artists">Join ALLEGRO-VIBEZ</Link>
        </div>
        <p className="merch-status">Collection preview · product ordering and approved pricing will be connected separately.</p>
      </div>
      <figure className="merch-lookbook">
        <img src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ merchandise lookbook showing oversized T-shirts, golf shirts, hoodies, jackets, bucket hats and caps"/>
        <figcaption>MORE THAN MUSIC · A MOVEMENT</figcaption>
      </figure>
    </section>

    <section className="merch-strip" aria-label="ALLEGRO-VIBEZ merchandise categories">
      <span>OVERSIZED TEES</span><b>✦</b><span>GOLF SHIRTS</span><b>✦</b><span>HOODIES</span><b>✦</b><span>JACKETS</span><b>✦</b><span>BUCKET HATS</span><b>✦</b><span>CAPS</span>
    </section>

    <section className="merch-collection" id="collection">
      <div className="merch-section-head">
        <div><span>THE FIRST DROP</span><h2>Streetwear rhythm.<br/><em>ALLEGRO identity.</em></h2></div>
        <p>The collection carries the ALLEGRO-VIBEZ visual language across wardrobe essentials without turning the platform into a generic clothing label.</p>
      </div>
      <div className="merch-grid">
        {categories.map(([title,copy],index)=><article key={title}>
          <small>{String(index+1).padStart(2,'0')}</small>
          <h3>{title}</h3>
          <p>{copy}</p>
          <span>ALLEGRO-VIBEZ EDITION</span>
        </article>)}
      </div>
    </section>

    <section className="merch-final">
      <div><span>ALLEGRO-VIBEZ</span><h2>Music you can hear.<br/>Culture you can wear.</h2></div>
      <Link to="/stream">Open ALLEGRO Stream →</Link>
    </section>
  </main>
}
