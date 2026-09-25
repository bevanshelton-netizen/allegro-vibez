import { useEffect,useMemo,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/merch-store.css'

const TEE_SIZES=['XS','S','M','L','XL','2XL','3XL','4XL','5XL']
const officialTees=[
  {id:'movement-black',name:'The Movement Oversized Tee',colour:'Black',price:549,tone:'black',tag:'MORE THAN MUSIC. A MOVEMENT.'},
  {id:'african-born-cream',name:'African-Born Oversized Tee',colour:'Cream',price:599,tone:'cream',tag:'AFRICAN-BORN. GLOBAL SOUND.'},
  {id:'creators-burgundy',name:'Creators. Culture. Sound. Tee',colour:'Burgundy',price:599,tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.'},
  {id:'creator-economy-white',name:'Creator Economy Oversized Tee',colour:'White',price:549,tone:'white',tag:'ARTISTS · RADIO · CULTURE · LIVE'}
]
const dropCategories=[
  {name:'Oversized Tees',anchor:'#tees',note:'Heavyweight 300gsm statement tees.'},
  {name:'Golf Shirts',anchor:'#golf',note:'Premium polos with clean ALLEGRO-VIBEZ detailing.'},
  {name:'Hoodies',anchor:'#outerwear',note:'Heavyweight streetwear layers.'},
  {name:'Jackets',anchor:'#outerwear',note:'Varsity and statement outerwear.'},
  {name:'Bucket Hats & Caps',anchor:'#outerwear',note:'Headwear for stage, street and everyday wear.'}
]
const comingProducts=[
  {id:'movement-hoodie-black',category:'Hoodies',name:'The Movement Hoodie',colour:'Black',tone:'black',tag:'MORE THAN MUSIC. A MOVEMENT.',note:'Official ALLEGRO-VIBEZ statement hoodie.'},
  {id:'african-born-hoodie-cream',category:'Hoodies',name:'African-Born Hoodie',colour:'Cream',tone:'cream',tag:'AFRICAN-BORN. GLOBAL SOUND.',note:'Signature cream creator-culture hoodie.'},
  {id:'creators-hoodie-burgundy',category:'Hoodies',name:'Creators. Culture. Sound. Hoodie',colour:'Burgundy',tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.',note:'Deep burgundy ALLEGRO creator edition.'},
  {id:'varsity-jacket-black',category:'Jackets',name:'ALLEGRO Varsity Jacket',colour:'Black / Cream',tone:'black',tag:'ALLEGRO VIBEZ',note:'Premium varsity direction for artists, crews and events.'},
  {id:'tour-jacket-burgundy',category:'Jackets',name:'Creators Tour Jacket',colour:'Burgundy / Black',tone:'burgundy',tag:'WORLDWIDE FOR CREATORS',note:'Statement outerwear for stage, travel and culture.'},
  {id:'bomber-jacket-black',category:'Jackets',name:'ALLEGRO Creator Bomber',colour:'Black',tone:'black',tag:'ARTISTS · RADIO · CULTURE · LIVE',note:'Clean creator-focused bomber concept.'},
  {id:'classic-cap-black',category:'Caps',name:'ALLEGRO Classic Cap',colour:'Black',tone:'black',tag:'ALLEGRO VIBEZ',note:'Minimal embroidered-logo cap direction.'},
  {id:'signature-cap-cream',category:'Caps',name:'African-Born Signature Cap',colour:'Cream',tone:'cream',tag:'AFRICAN-BORN',note:'Cream statement cap for the signature collection.'},
  {id:'creator-cap-burgundy',category:'Caps',name:'Creator Culture Cap',colour:'Burgundy',tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.',note:'Burgundy creator-edition headwear.'},
  {id:'movement-bucket-black',category:'Bucket Hats',name:'The Movement Bucket Hat',colour:'Black',tone:'black',tag:'MORE THAN MUSIC.',note:'Black ALLEGRO bucket hat for street and festival wear.'},
  {id:'african-born-bucket-cream',category:'Bucket Hats',name:'African-Born Bucket Hat',colour:'Cream',tone:'cream',tag:'GLOBAL SOUND.',note:'Cream bucket-hat direction from the signature drop.'},
  {id:'creator-beanie',category:'Accessories',name:'ALLEGRO Creator Beanie',colour:'Black',tone:'black',tag:'ALLEGRO',note:'Cold-weather creator accessory with restrained branding.'},
  {id:'creator-tote',category:'Accessories',name:'ALLEGRO Creator Tote',colour:'Black / Natural',tone:'cream',tag:'CARRY THE MOVEMENT.',note:'Everyday creator tote for gear, records and essentials.'},
  {id:'studio-duffel',category:'Accessories',name:'ALLEGRO Studio Duffel',colour:'Black',tone:'black',tag:'CREATE. MOVE. REPEAT.',note:'Travel and studio bag concept for the creator ecosystem.'}
]

function money(value,currency='ZAR'){
  try{return new Intl.NumberFormat('en-ZA',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0))}
  catch{return currency+' '+Number(value||0).toFixed(0)}
}

export default function MerchStore({session}){
  const[creatorItems,setCreatorItems]=useState([])
  const[message,setMessage]=useState('')
  const[loading,setLoading]=useState(true)
  const[selected,setSelected]=useState(null)

  useEffect(()=>{(async()=>{
    if(!supabase){setLoading(false);return}
    const{data,error}=await supabase.from('merch_products').select('*').eq('active',true).eq('owner_kind','creator').order('created_at',{ascending:false})
    if(!error)setCreatorItems(data||[])
    setLoading(false)
  })()},[])

  const launchPrice=useMemo(()=>Math.min(...officialTees.map(item=>item.price)),[])

  function orderOfficial(item){
    setSelected(item)
    setMessage('')
    window.setTimeout(()=>document.getElementById('merch-order-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),50)
  }

  async function buyCreator(item){
    if(!session){setMessage('Log in to buy creator merchandise through ALLEGRO.');return}
    const size=item.sizes?.length?window.prompt('Size: '+item.sizes.join(', '),item.sizes[0])||item.sizes[0]:null
    const colour=item.colours?.length?window.prompt('Colour: '+item.colours.join(', '),item.colours[0])||item.colours[0]:null
    const quantity=Number(window.prompt('Quantity','1')||0)
    if(!quantity)return
    const{data,error}=await supabase.rpc('create_merch_order',{p_product_id:item.id,p_quantity:quantity,p_size:size,p_colour:colour})
    setMessage(error?error.message:'Order '+data+' created. Secure payment handoff is the next step; no payment has been taken yet.')
  }

  return <main className="page merch-page">
    <section className="merch-hero">
      <img src="/merch/merch-hero.jpg" alt="ALLEGRO-VIBEZ official 300gsm oversized tee collection"/>
      <div className="merch-hero-copy">
        <div className="eyebrow">OFFICIAL ALLEGRO-VIBEZ MERCH</div>
        <h2>Wear the movement.</h2>
        <p>Premium streetwear for creators, artists, fans and people who live music.</p>
        <div className="merch-specs"><span>300gsm tees</span><span>Oversized fit</span><span>Dropped shoulders</span><span>Official designs</span></div>
        <strong>Launch tees from {money(launchPrice)}</strong>
      </div>
    </section>

    <nav className="merch-categories" aria-label="Merchandise categories">
      <a href="#lookbook">2026 Lookbook</a><a href="#tees">T-Shirts</a><a href="#outerwear">Hoodies</a><a href="#outerwear">Jackets</a><a href="#outerwear">Caps & Hats</a><a href="#creator-merch">Creator Merch</a>
    </nav>

    <section id="lookbook" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">ALLEGRO-VIBEZ 2026 LOOKBOOK</div><h3>Music. People. Culture. On the street.</h3></div><p>Oversized tees · golf shirts · hoodies · jackets · bucket hats · caps</p></div>
      <img className="outerwear-lookbook allegro-lookbook" src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ fashion lookbook with oversized T-shirts, golf shirts, hoodies, jackets, bucket hats and caps"/>
    </section>

    <section className="merch-drop-nav" aria-label="Shop the ALLEGRO-VIBEZ drop">
      {dropCategories.map((item,index)=><a key={item.name} href={item.anchor}>
        <small>{String(index+1).padStart(2,'0')}</small>
        <strong>{item.name}</strong>
        <span>{item.note}</span>
      </a>)}
    </section>

    <section id="golf" className="merch-section merch-golf-preview">
      <div className="merch-heading"><div><div className="eyebrow">PREMIUM GOLF SHIRTS</div><h3>Clean enough for business. Loud enough for ALLEGRO.</h3></div><p>Design preview only · final garment specification and selling price will be published once approved.</p></div>
      <div className="golf-preview-card">
        <img src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ golf shirt concept in the 2026 lookbook"/>
        <div><span>ALLEGRO-VIBEZ 2026</span><h4>Golf Shirt Collection</h4><p>Premium black, cream and statement-accent direction with restrained branding for events, creators and corporate wear.</p><button className="secondary" onClick={()=>setMessage('ALLEGRO-VIBEZ golf shirts are in the 2026 merch range. Final price and garment specification will be published once approved.')}>Register interest</button></div>
      </div>
    </section>

    <section id="tees" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">CONFIRMED 300GSM</div><h3>Oversized Tee Collection</h3></div><p>Heavyweight construction · oversized unisex fit · XS to 5XL</p></div>
      <div className="merch-product-grid">
        {officialTees.map(item=><article className={"official-product tone-"+item.tone} key={item.id}>
          <div className="tee-art"><small>ALLEGRO-VIBEZ</small><strong>{item.tag}</strong><span>300GSM · OVERSIZED</span></div>
          <div className="product-copy"><div><span>{item.colour}</span><h4>{item.name}</h4></div><strong className="merch-price">{money(item.price)}</strong></div>
          <p>Confirmed 300gsm heavyweight tee with premium oversized silhouette and dropped shoulders.</p>
          <div className="size-row">{TEE_SIZES.map(size=><span key={size}>{size}</span>)}</div>
          <button className="primary" onClick={()=>orderOfficial(item)}>Order / Add to bag</button>
        </article>)}
      </div>
    </section>

    <section id="outerwear" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">OFFICIAL RANGE PREVIEW</div><h3>Hoodies, jackets, caps, bucket hats & accessories</h3></div><p>Populated now for discovery and advertising. Price and garment specification will be added only when confirmed.</p></div>
      <img className="outerwear-lookbook" src="/merch/outerwear-hats.jpg" alt="ALLEGRO-VIBEZ hoodie, jacket, caps, bucket hats and accessories"/>
      <div className="coming-merch-grid">
        {comingProducts.map(item=><article className={"coming-product tone-"+item.tone} key={item.id}>
          <div className="coming-product-art">
            <span>{item.category}</span>
            <strong>{item.tag}</strong>
            <small>ALLEGRO-VIBEZ</small>
          </div>
          <div className="product-copy"><div><span>{item.colour}</span><h4>{item.name}</h4></div><strong className="merch-tba">PRICE TBA</strong></div>
          <p>{item.note}</p>
          <div className="merch-preview-labels"><span>Official merch</span><span>Specs TBA</span><span>Price TBA</span></div>
          <button className="secondary" onClick={()=>setMessage(item.name+' is now listed in the ALLEGRO shop. Final price and garment specification will be added once confirmed.')}>Register interest</button>
        </article>)}
      </div>
    </section>

    {selected&&<section id="merch-order-panel" className="panel merch-order-panel">
      <div><div className="eyebrow">YOUR ALLEGRO BAG</div><h3>{selected.name}</h3><p>{selected.colour} · 300gsm · Oversized fit</p><strong className="merch-price">{money(selected.price)}</strong></div>
      <div>
        <label>Size<select defaultValue="L">{TEE_SIZES.map(size=><option key={size}>{size}</option>)}</select></label>
        <label>Quantity<select defaultValue="1"><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
        {!session?<Link className="primary" to="/login">Log in to continue</Link>:<button className="primary" onClick={()=>setMessage('Your ALLEGRO merch selection is saved for checkout. Payment will only be enabled through the verified secure gateway; no money has been taken yet.')}>Continue to secure checkout</button>}
      </div>
    </section>}

    {message&&<div className="notice">{message}</div>}

    <section className="merch-trust">
      <div><strong>Official ALLEGRO-VIBEZ</strong><span>Original platform merchandise</span></div>
      <div><strong>Confirmed 300gsm tees</strong><span>Heavyweight oversized collection</span></div>
      <div><strong>Secure checkout</strong><span>Payment only through a verified gateway</span></div>
      <div><strong>Creator economy</strong><span>Creator merch supports the 10% marketplace model</span></div>
    </section>

    <section id="creator-merch" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">CREATOR MERCH</div><h3>Artist storefronts inside ALLEGRO</h3></div><Link to="/marketplace">Open Musician Marketplace</Link></div>
      <p>Vetted creators can list their own merchandise. Creator sales use the internal marketplace structure so ALLEGRO's platform fee and the creator net are recorded transparently.</p>
      {loading?<div className="empty">Loading creator merchandise…</div>:<div className="merch-product-grid creator-merch-grid">
        {creatorItems.map(item=><article className="official-product" key={item.id}>
          {item.image_url&&<img className="creator-merch-image" src={item.image_url} alt={item.title}/>}
          <div className="product-copy"><div><span>CREATOR MERCH</span><h4>{item.title}</h4></div><strong className="merch-price">{money(item.price,item.currency)}</strong></div>
          <p>{item.description}</p>
          <button className="primary" onClick={()=>buyCreator(item)}>Buy through ALLEGRO</button>
        </article>)}
        {!creatorItems.length&&<div className="empty">The creator merch marketplace is ready for its first vetted artist stores.</div>}
      </div>}
    </section>

    <section className="panel founders-drop"><div><div className="eyebrow">LIMITED LAUNCH</div><h3>ALLEGRO Founders Drop</h3><p>The first official collection establishes the visual language for future artist collaborations, event drops and limited editions.</p></div><a className="primary" href="#tees">Shop the first drop</a></section>
  </main>
}
