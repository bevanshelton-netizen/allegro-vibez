export default function MovementSizzle({ launchPrice }) {
  const money = value => {
    try { return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(value||0)) }
    catch { return 'R'+Number(value||0).toFixed(0) }
  }

  return <section className="movement-sizzle" aria-label="ALLEGRO-VIBEZ Wear the Movement campaign">
    <div className="movement-sizzle-grid" aria-hidden="true"/>
    <div className="movement-wave" aria-hidden="true">
      {Array.from({length:12}).map((_,i)=><span key={i}/>)}
    </div>
    <div className="movement-sequence" aria-hidden="true">
      <strong className="movement-beat beat-1">THIS IS NOT MERCH.</strong>
      <strong className="movement-beat beat-2">THIS IS IDENTITY.</strong>
      <strong className="movement-beat beat-3">MUSIC. PEOPLE. CULTURE.</strong>
      <strong className="movement-beat beat-4">WEAR THE MOVEMENT.</strong>
      <strong className="movement-beat beat-5">AFRICAN-BORN. GLOBAL ENERGY.</strong>
    </div>
    <div className="movement-lockup">
      <div className="eyebrow">ALLEGRO-VIBEZ 2026 · THE CAMPAIGN</div>
      <h3>WEAR<br/>THE<br/><em>MOVEMENT.</em></h3>
      <p>More Than Music. A Movement.</p>
      <div className="movement-actions">
        <a className="primary" href="#tees">Shop confirmed tees</a>
        <a className="movement-link" href="#lookbook">Enter the lookbook →</a>
      </div>
    </div>
    <div className="movement-facts">
      <span>300GSM</span><span>XS–5XL</span><span>FROM {money(launchPrice)}</span><span>CREATOR CULTURE</span>
    </div>
  </section>
}
